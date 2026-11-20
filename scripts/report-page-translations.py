#!/usr/bin/env python3
"""Report page readiness; verify full-page fallback when the site implements it."""
import importlib.util
import json
import os
import sys
import subprocess
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('coverage',ROOT/'scripts/check-translation-coverage.py')
coverage=importlib.util.module_from_spec(spec);spec.loader.exec_module(coverage)
original={name:coverage.load(f'migration/{name}.json') for name in ('published-posts','published-pages','comments','milestones')}
lines=['## Page translation readiness','Counts are conservative dictionary-based estimates, not semantic or human translation review.']
errors=[]
base=os.environ.get('BASE_SHA','')
has_base=bool(base) and subprocess.run(['git','cat-file','-e',f'{base}^{{commit}}'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
for lang in coverage.LANGUAGES:
    mapping=coverage.load(f'translations/{lang}.json')
    data=coverage.load(f'translations/{lang}-content.json')
    base_entries=coverage.load(f'translations/{lang}-content.json',base) if has_base else None
    previously_enforced=bool(base_entries) and any('translationComplete' in entry for kind in ('published-posts','published-pages') for entry in base_entries[kind])
    ready=0;total=0;fallback_implemented=True
    for kind in ('published-posts','published-pages'):
        by_id={p['id']:p for p in data[kind]}
        for source in original[kind]:
            total+=1; entry=by_id.get(source['id'])
            if entry is None:errors.append(f'{lang} {kind} {source["id"]}: missing generated page');continue
            segments=set()
            for field in ('title','excerpt','content'):
                if field in source:coverage.extract(source[field]['rendered'],segments)
            for comment in original['comments']:
                if comment['post']==source['id']:coverage.extract(comment['content']['rendered'],segments)
            if source['id']==213:
                for event in original['milestones']['items']:
                    coverage.extract(event['title'],segments);coverage.extract(event['description'],segments)
                coverage.extract(original['milestones']['remainingHtml'],segments)
            complete=all(coverage.mapped(mapping,text) and not coverage.CJK.search(mapping[text]) for text in segments)
            ready+=complete
            if 'translationComplete' not in entry:
                fallback_implemented=False;continue
            if entry['translationComplete'] != complete:
                errors.append(f'{lang} {kind} {source["id"]}: incorrect completeness status')
            if not complete:
                for field in ('title','excerpt','content'):
                    if field in source and entry[field]['rendered']!=source[field]['rendered']:
                        errors.append(f'{lang} {kind} {source["id"]}: incomplete page does not fully use source text')
            else:
                for field in ('title','excerpt','content'):
                    if field not in entry:continue
                    soup=BeautifulSoup(entry[field]['rendered'],'html.parser')
                    for tag in soup(['script','style','svg','kbd','time']):tag.decompose()
                    if coverage.CJK.search(soup.get_text(' ',strip=True)):
                        errors.append(f'{lang} {kind} {source["id"]}: complete page contains untranslated CJK text');break
    if previously_enforced and not fallback_implemented:errors.append(f'{lang}: page completeness flags were removed')
    status='fallback verified' if fallback_implemented else 'fallback not yet implemented; verify PR #8'
    lines.append(f'- {lang}: {ready}/{total} pages ready; {total-ready} need original-language fallback; {status}.')
if errors:lines+=['','### Errors',*[f'- {e}' for e in errors[:100]]]
report='\n'.join(lines)+'\n';print(report)
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf8') as out:out.write(report)
sys.exit(bool(errors))
