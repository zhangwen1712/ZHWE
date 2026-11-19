#!/usr/bin/env python3
"""Translate public website text in batches using Cloudflare Workers AI via cf CLI."""
import concurrent.futures, json, re, subprocess, threading
from pathlib import Path
from bs4 import BeautifulSoup, Comment

ROOT=Path(__file__).resolve().parent.parent
CF=[str(ROOT/'node_modules/node/bin/node'),str(ROOT/'node_modules/.bin/cf'),'ai','run','@cf/meta/llama-3.3-70b-instruct-fp8-fast']
langs={'fr':'French','es':'Spanish','it':'Italian','de':'German'}
strings=set()
def extract(html):
    soup=BeautifulSoup(html or '', 'html.parser')
    for element in soup.find_all():
        for attr in ('alt','title','aria-label'):
            v=element.get(attr,'')
            if isinstance(v,str) and re.search(r'[\u3400-\u9fff\u3040-\u30ff]',v):strings.add(v.strip())
    for node in soup.find_all(string=True):
        if isinstance(node,Comment) or node.parent.name in ('style','script','svg','kbd','time'):continue
        text=str(node).strip()
        if re.search(r'[\u3400-\u9fff\u3040-\u30ff]',text) or (re.search(r'[A-Za-z]{3,} +[A-Za-z]{3,}',text) and not re.fullmatch(r'https?://\S+',text)):strings.add(text)
for name in ['published-posts','published-pages']:
    for entry in json.loads((ROOT/f'migration/{name}.json').read_text()):
        for field in ['title','excerpt','content']:
            if field in entry:extract(entry[field]['rendered'])
for name in ['categories','tags']:
    for item in json.loads((ROOT/f'migration/{name}.json').read_text()):extract(item['name'])
for item in json.loads((ROOT/'migration/comments.json').read_text()):extract(item['content']['rendered'])
lock=threading.Lock()
def translate(job):
    lang,batch=job
    prompt='Translate each string into '+langs[lang]+'. Return ONLY a JSON array of strings in the same order and same length. Preserve facts, names, URLs, markup-like text, emoji, and intent. Translate all complete sentences; preserve proper names where appropriate. Do not leave full sentences untranslated. Do not add commentary or extra information. Input may include Japanese or Chinese.'
    body=json.dumps({'messages':[{'role':'system','content':prompt},{'role':'user','content':json.dumps(batch,ensure_ascii=False)}],'max_tokens':3000,'temperature':0.1},ensure_ascii=False)
    for attempt in range(3):
        p=subprocess.run(CF+['--body',body],cwd=ROOT,capture_output=True,text=True,timeout=120)
        try:
            obj=json.loads(p.stdout); response=obj.get('response') or obj['choices'][0]['message']['content']; out=response if isinstance(response,list) else json.loads(re.sub(r'^```(?:json)?\s*|\s*```$','',response.strip()))
            if len(out)!=len(batch) or not all(isinstance(x,str) and x.strip() for x in out):raise ValueError('invalid output')
            return lang,list(zip(batch,out)),None
        except Exception as e:
            error=str(e)+': '+p.stderr[:150]
    return lang,[],error

def main():
    print('source strings',len(strings),flush=True)
    data={};jobs=[]
    for lang in langs:
        path=ROOT/f'translations/{lang}.json';data[lang]=json.loads(path.read_text()) if path.exists() else {}
        missing=[s for s in sorted(strings) if s not in data[lang]]
        batch=[];size=0
        for s in missing:
            if batch and (len(batch)>=4 or size+len(s)>1000):jobs.append((lang,batch));batch=[];size=0
            batch.append(s);size+=len(s)
        if batch:jobs.append((lang,batch))
    print('batches',len(jobs),flush=True);failures=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=16) as pool:
        for i,(lang,pairs,error) in enumerate(pool.map(translate,jobs),1):
            if error:failures.append((lang,error))
            else:
                data[lang].update(pairs);(ROOT/f'translations/{lang}.json').write_text(json.dumps(data[lang],ensure_ascii=False,indent=2)+'\n')
            if i%10==0:print(f'{i}/{len(jobs)} batches, {len(failures)} failures',flush=True)
    print('finished failures',len(failures),flush=True)
    if failures: (ROOT/'translations/failures.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2));raise SystemExit(1)
    (ROOT/'translations/failures.json').unlink(missing_ok=True)
if __name__=='__main__':main()
