#!/usr/bin/env python3
"""Generate locale data, publishing a translation only when a page is complete."""
import copy
import json
import re
from pathlib import Path
from bs4 import BeautifulSoup, Comment, NavigableString

root = Path(__file__).resolve().parent.parent
names = ['published-posts', 'published-pages', 'categories', 'tags', 'comments', 'milestones']
cjk = re.compile(r'[\u3400-\u9fff\u3040-\u30ff]')

def translatable(value):
    soup = BeautifulSoup(value or '', 'html.parser')
    segments = set()
    for element in soup.find_all():
        for attr in ('alt', 'title', 'aria-label'):
            text = element.get(attr, '')
            if isinstance(text, str) and cjk.search(text):
                segments.add(text.strip())
    for node in soup.find_all(string=True):
        if isinstance(node, Comment) or node.parent.name in ('style', 'script', 'svg', 'kbd', 'time'):
            continue
        text = str(node).strip()
        if cjk.search(text) or (re.search(r'[A-Za-z]{3,} +[A-Za-z]{3,}', text) and not re.fullmatch(r'https?://\S+', text)):
            segments.add(text)
    return segments

def transform(value, mapping):
    soup = BeautifulSoup(value or '', 'html.parser')
    for element in soup.find_all():
        for attr in ('alt', 'title', 'aria-label'):
            value = element.get(attr, '')
            translated = mapping.get(value.strip()) if isinstance(value, str) else None
            if isinstance(translated, str) and translated.strip():
                element[attr] = value.replace(value.strip(), translated, 1)
    for node in list(soup.find_all(string=True)):
        if isinstance(node, Comment) or node.parent.name in ('style', 'script', 'svg', 'kbd', 'time'):
            continue
        text = str(node)
        translated = mapping.get(text.strip())
        if isinstance(translated, str) and translated.strip():
            node.replace_with(NavigableString(text.replace(text.strip(), translated, 1)))
    return str(soup)

def complete(entry, mapping, comments, timeline):
    segments = set()
    for key in ('title', 'excerpt', 'content'):
        if key in entry:
            segments.update(translatable(entry[key]['rendered']))
    for comment in comments:
        if comment['post'] == entry['id']:
            segments.update(translatable(comment['content']['rendered']))
    if entry['id'] == 213:
        for event in timeline['items']:
            segments.update(translatable(event['title']))
            segments.update(translatable(event['description']))
        segments.update(translatable(timeline['remainingHtml']))
    return all(isinstance(mapping.get(segment), str) and mapping[segment].strip() for segment in segments)

def main():
    original = {name: json.loads((root / f'migration/{name}.json').read_text()) for name in names}
    for lang in ['en', 'fr', 'es', 'it', 'de']:
        path = root / f'translations/{lang}.json'
        mapping = json.loads(path.read_text()) if path.exists() else {}
        out = copy.deepcopy(original)
        for name in ('published-posts', 'published-pages'):
            for entry in out[name]:
                entry['translationComplete'] = complete(entry, mapping, original['comments'], original['milestones'])
                if entry['translationComplete']:
                    for key in ('title', 'excerpt', 'content'):
                        if key in entry:
                            entry[key]['rendered'] = transform(entry[key]['rendered'], mapping)
        for name in ('categories', 'tags'):
            for entry in out[name]:
                entry['name'] = transform(entry['name'], mapping)
        for entry in out['comments']:
            entry['content']['rendered'] = transform(entry['content']['rendered'], mapping)
        for event in out['milestones']['items']:
            event['title'] = transform(event['title'], mapping)
            event['description'] = transform(event['description'], mapping)
        out['milestones']['remainingHtml'] = transform(out['milestones']['remainingHtml'], mapping)
        (root / f'translations/{lang}-content.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')

if __name__ == '__main__':
    main()
