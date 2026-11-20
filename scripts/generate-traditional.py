#!/usr/bin/env python3
"""Generate Traditional Chinese content from published source without changing URLs."""
import json
from pathlib import Path
from bs4 import BeautifulSoup, Comment, NavigableString
from opencc import OpenCC

root = Path(__file__).resolve().parent.parent
converter = OpenCC('s2twp')
names = ['published-posts', 'published-pages', 'categories', 'tags', 'comments', 'milestones']

def convert_html(value):
    soup = BeautifulSoup(value or '', 'html.parser')
    for element in soup.find_all():
        for attr in ('alt', 'title', 'aria-label'):
            value = element.get(attr)
            if isinstance(value, str):
                element[attr] = converter.convert(value)
    for node in list(soup.find_all(string=True)):
        if isinstance(node, Comment) or node.parent.name in ('style', 'script', 'svg', 'kbd', 'time'):
            continue
        node.replace_with(NavigableString(converter.convert(str(node))))
    return str(soup)

out = {}
for name in names:
    data = json.loads((root / 'migration' / f'{name}.json').read_text())
    if name in ('published-posts', 'published-pages'):
        for entry in data:
            for field in ('title', 'excerpt', 'content'):
                if field in entry:
                    entry[field]['rendered'] = convert_html(entry[field]['rendered'])
    elif name in ('categories', 'tags'):
        for entry in data:
            entry['name'] = convert_html(entry['name'])
    elif name == 'comments':
        for entry in data:
            entry['content']['rendered'] = convert_html(entry['content']['rendered'])
    else:
        for entry in data['items']:
            entry['title'] = convert_html(entry['title'])
            entry['description'] = convert_html(entry['description'])
        data['remainingHtml'] = convert_html(data['remainingHtml'])
    out[name] = data
(root / 'translations' / 'zh-Hant-content.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
