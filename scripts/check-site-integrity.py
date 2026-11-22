#!/usr/bin/env python3
"""Audit generated local links and multilingual SEO without requesting external URLs."""
import json
import os
import sys
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
from xml.etree import ElementTree
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parent.parent
DIST=(ROOT/'dist').resolve()
ORIGIN=os.environ.get('SITE_URL','https://zhwe.top').rstrip('/')
LANGUAGES={'en','zh-CN','zh-Hant','fr','es','it','de','x-default'}
known=set(json.loads((ROOT/'ci/known-missing-internal.json').read_text()))
missing={}
errors=[]
files=list(DIST.rglob('*.html'))
if not files:sys.exit('No generated HTML found; build the site first.')
for asset in DIST.rglob('*'):
    if asset.is_file() and asset.stat().st_size>25*1024*1024:
        errors.append(f'{asset.relative_to(DIST)}: file exceeds 25 MiB Pages limit')

def check_path(raw,page):
    if not raw or raw.startswith('//'):return
    parsed=urlsplit(raw)
    if parsed.scheme or parsed.netloc or not parsed.path:return
    path=unquote(urljoin('/'+page.relative_to(DIST).as_posix(),parsed.path))
    if path.startswith('/api/'):return
    target=(DIST/path.lstrip('/')).resolve()
    if not target.is_relative_to(DIST):
        errors.append(f'{page.relative_to(DIST)}: invalid path {path}');return
    if target.is_dir() or (not target.exists() and not target.suffix):target=target/'index.html'
    if not target.exists():missing.setdefault(path,0);missing[path]+=1

for page in files:
    soup=BeautifulSoup(page.read_text(encoding='utf-8'),'html.parser')
    for tag,attr in [('a','href'),('img','src'),('source','src'),('video','src'),('video','poster'),('audio','src'),('script','src'),('link','href')]:
        for node in soup.find_all(tag):check_path(node.get(attr,''),page)
    if page.name!='index.html' or '404' in page.relative_to(DIST).parts:continue
    canonical=soup.find_all('link',rel='canonical')
    relative=page.parent.relative_to(DIST).as_posix()
    page_path='/' if relative=='.' else '/'+relative+'/'
    if not page_path.endswith('/'):page_path+='/'
    if len(canonical)!=1 or unquote(canonical[0].get('href',''))!=ORIGIN+page_path:
        errors.append(f'{page.relative_to(DIST)}: missing or invalid canonical')
    alternates=soup.find_all('link',rel='alternate',hreflang=True)
    langs=[a.get('hreflang') for a in alternates]
    if set(langs)!=LANGUAGES or len(langs)!=len(LANGUAGES):
        errors.append(f'{page.relative_to(DIST)}: incomplete or duplicate hreflang')
    parts=page_path.strip('/').split('/') if page_path!='/' else []
    original='/'+'/'.join(parts[1:])+'/' if parts and parts[0] in ('zh','zh-Hant','fr','es','it','de') else page_path
    if original=='//':original='/'
    lang_prefix={'en':'','zh-CN':'/zh','zh-Hant':'/zh-Hant','fr':'/fr','es':'/es','it':'/it','de':'/de','x-default':''}
    for node in alternates:
        href=node.get('href','')
        expected=ORIGIN+lang_prefix.get(node.get('hreflang'),'')+original
        if unquote(href)!=expected:errors.append(f'{page.relative_to(DIST)}: incorrect hreflang {node.get("hreflang")}')
        if not href.startswith(ORIGIN+'/'):errors.append(f'{page.relative_to(DIST)}: invalid alternate origin')
        else:check_path(urlsplit(href).path,page)
    robots=soup.find('meta',attrs={'name':'robots'})
    if not robots or 'noindex' in robots.get('content','').lower() or 'index' not in robots.get('content','').lower():errors.append(f'{page.relative_to(DIST)}: missing index,follow robots meta')

for path in sorted(missing):
    if path not in known:errors.append(f'new missing local link: {path} ({missing[path]} references)')
for path in sorted(known-set(missing)):
    print(f'Baseline link now fixed: {path}; remove it from ci/known-missing-internal.json')
try:
    sitemap=ElementTree.parse(DIST/'sitemap.xml')
    urls=[n.text for n in sitemap.findall('{*}url/{*}loc')]
    if not urls or len(urls)!=len(set(urls)):errors.append('sitemap is empty or has duplicate URLs')
    for url in urls:
        if not url or not url.startswith(ORIGIN+'/') or '/404/' in url:
            errors.append(f'invalid sitemap URL: {url}');continue
        check_path(urlsplit(url).path,DIST/'index.html')
except (OSError,ElementTree.ParseError) as exc:errors.append(f'sitemap: {exc}')
expected_robots=f'User-agent: *\nAllow: /\nSitemap: {ORIGIN}/sitemap.xml\n'
if (DIST/'robots.txt').read_text()!=expected_robots:errors.append('robots.txt must allow crawlers and point to the sitemap')
for path in sorted(set(missing)-known):
    msg=f'new missing local link: {path} ({missing[path]} references)'
    if msg not in errors:errors.append(msg)
summary=['## Site integrity',f'- Scanned {len(files)} HTML files.',f'- Known missing local paths: {len(set(missing)&known)}; new missing paths: {len(set(missing)-known)}.',*[f'  - `{path}` ({missing[path]} references)' for path in sorted(set(missing)&known)],f'- Errors: {len(errors)}.']
if errors:summary+=['','### Errors',*[f'- {error}' for error in errors[:100]]]
report='\n'.join(summary)+'\n';print(report)
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf8') as out:out.write(report)
sys.exit(bool(errors))
