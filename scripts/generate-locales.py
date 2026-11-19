#!/usr/bin/env python3
import copy,json,re
from pathlib import Path
from bs4 import BeautifulSoup,Comment,NavigableString
root=Path(__file__).resolve().parent.parent
names=['published-posts','published-pages','categories','tags','comments','milestones']
def transform(value,mapping):
    soup=BeautifulSoup(value or '', 'html.parser')
    for element in soup.find_all():
        for attr in ('alt','title','aria-label'):
            v=element.get(attr,'')
            if isinstance(v,str) and v.strip() in mapping:element[attr]=v.replace(v.strip(),mapping[v.strip()],1)
    for n in list(soup.find_all(string=True)):
        if isinstance(n,Comment) or n.parent.name in ('style','script','svg','kbd','time'):continue
        text=str(n); stripped=text.strip()
        if stripped in mapping:n.replace_with(NavigableString(text.replace(stripped,mapping[stripped],1)))
    return str(soup)
for lang in ['fr','es','it','de']:
    path=root/f'translations/{lang}.json'; mapping=json.loads(path.read_text()) if path.exists() else {};out={}
    for name in names:
        data=json.loads((root/f'migration/{name}.json').read_text())
        if name in ['published-posts','published-pages']:
            for e in data:
                for key in ['title','excerpt','content']:
                    if key in e:e[key]['rendered']=transform(e[key]['rendered'],mapping)
        elif name in ['categories','tags']:
            for e in data:e['name']=transform(e['name'],mapping)
        elif name=='comments':
            for e in data:e['content']['rendered']=transform(e['content']['rendered'],mapping)
        else:
            for e in data['items']:
                e['title']=transform(e['title'],mapping);e['description']=transform(e['description'],mapping)
            data['remainingHtml']=transform(data['remainingHtml'],mapping)
        out[name]=data
    (root/f'translations/{lang}-content.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
