#!/usr/bin/env python3
"""Best-effort scheduled report of public external references; never a PR gate."""
import concurrent.futures
import ipaddress
import json
import os
import socket
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin,urlsplit
from urllib.request import HTTPRedirectHandler,Request,build_opener
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parent.parent

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None

def safe(url):
    u=urlsplit(url)
    if u.scheme not in ('http','https') or not u.hostname or u.username or u.password:return False
    try:
        if u.port not in (None,80,443):return False
        addresses=socket.getaddrinfo(u.hostname,u.port or (443 if u.scheme=='https' else 80),type=socket.SOCK_STREAM)
        return bool(addresses) and all(ipaddress.ip_address(a[4][0]).is_global for a in addresses)
    except (ValueError,OSError):return False

def check(url):
    current=url;opener=build_opener(NoRedirect())
    for _ in range(5):
        if not safe(current):return ('skipped','non-public or unresolvable destination')
        request=Request(current,method='HEAD',headers={'User-Agent':'ZHWE-Link-Check/1.0'})
        try:
            with opener.open(request,timeout=8) as response:return ('ok',str(response.status))
        except HTTPError as e:
            if e.code in (301,302,303,307,308) and e.headers.get('Location'):
                current=urljoin(current,e.headers['Location']);continue
            return ('review',f'HTTP {e.code}')
        except (URLError,TimeoutError,OSError,ValueError) as e:return ('review',type(e).__name__)
    return ('review','too many redirects')

references=set()
for name in ('published-posts','published-pages'):
    for entry in json.loads((ROOT/'migration'/f'{name}.json').read_text()):
        soup=BeautifulSoup(entry['content']['rendered'],'html.parser')
        for node in soup.find_all(['a','img','video','audio','source']):
            value=node.get('href') if node.name=='a' else node.get('src')
            parsed=urlsplit(value or '')
            if parsed.scheme in ('http','https') and parsed.hostname and parsed.hostname not in ('zhwe.top','www.zhwe.top'):
                references.add(value)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(check,sorted(references)))
review=[(u,status,detail) for u,(status,detail) in zip(sorted(references),results) if status!='ok']
lines=['## External links and media',f'- Checked {len(references)} unique references; {len(review)} need review or were skipped.','- This is advisory: rate limiting, bot protection and temporary outages can produce false positives.']
for url,status,detail in review:
    # Do not put query strings or fragments in an Action summary.
    u=urlsplit(url);lines.append(f'- `{u.scheme}://{u.netloc}{u.path}` — {status}: {detail}')
report='\n'.join(lines)+'\n';print(report)
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf8') as out:out.write(report)
Path('reports').mkdir(exist_ok=True);Path('reports/external-links.md').write_text(report,encoding='utf8')
