#!/usr/bin/env python3
"""Compare published source records against a Git base without reading drafts."""
import json
import os
import subprocess
import sys
from pathlib import Path
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parent.parent
FILES=('published-posts','published-pages','comments','media')
base=os.environ.get('BASE_SHA','')

def read(name,ref=None):
    path=f'migration/{name}.json'
    if ref:
        text=subprocess.run(['git','show',f'{ref}:{path}'],cwd=ROOT,text=True,capture_output=True,check=True).stdout
    else:text=(ROOT/path).read_text(encoding='utf8')
    data=json.loads(text)
    if not isinstance(data,list):raise ValueError(f'{path} is not a list')
    return data

def media_refs(entry):
    soup=BeautifulSoup(entry.get('content',{}).get('rendered',''),'html.parser')
    result=set()
    for node in soup.find_all(['img','video','audio','source']):
        for attr in ('src','poster'):
            if node.get(attr):result.add(node[attr])
    if entry.get('image'):result.add(entry['image'])
    return result

def valid_ref(ref):
    return bool(ref) and subprocess.run(['git','cat-file','-e',f'{ref}^{{commit}}'],cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0

current={name:read(name) for name in FILES}
errors=[]; lines=['## Published content integrity']
for name,records in current.items():
    ids=[x.get('id') for x in records]
    if any(i is None for i in ids) or len(set(ids))!=len(ids):errors.append(f'{name}: missing or duplicate IDs')
    lines.append(f'- {name}: {len(records)} records')
if valid_ref(base):
    for name in FILES:
        old={x['id']:x for x in read(name,base)};new={x['id']:x for x in current[name]}
        removed=old.keys()-new.keys()
        if removed:errors.append(f'{name}: {len(removed)} published records removed: {sorted(removed)}')
        for id in old.keys() & new.keys():
            if name in ('published-posts','published-pages'):
                if old[id].get('link')!=new[id].get('link'):errors.append(f'{name} {id}: original URL changed')
                removed_media=media_refs(old[id])-media_refs(new[id])
                if removed_media:errors.append(f'{name} {id}: {len(removed_media)} media references removed')
            if name=='media' and old[id].get('source_url')!=new[id].get('source_url'):
                errors.append(f'media {id}: original source URL changed')
else:lines.append('- No comparable base commit; only current data structure was checked.')
if errors:lines+=['','### Errors',*[f'- {x}' for x in errors[:100]]]
elif valid_ref(base):lines.append('- No published records, original URLs or media references were removed.')
report='\n'.join(lines)+'\n';print(report)
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf8') as out:out.write(report)
sys.exit(bool(errors))
