#!/usr/bin/env python3
"""Check exact translation-map coverage without claiming linguistic quality."""
import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from bs4 import BeautifulSoup, Comment

ROOT = Path(__file__).resolve().parent.parent
LANGUAGES = ('en', 'fr', 'es', 'it', 'de')
SOURCE_FILES = ('published-posts', 'published-pages', 'categories', 'tags', 'comments', 'milestones')
CJK = re.compile(r'[\u3400-\u9fff\u3040-\u30ff]')

def load(path, ref=None):
    if ref:
        result = subprocess.run(['git', 'show', f'{ref}:{path}'], cwd=ROOT, text=True, capture_output=True, check=True)
        return json.loads(result.stdout)
    return json.loads((ROOT / path).read_text(encoding='utf-8'))

def extract(html, output):
    soup = BeautifulSoup(html or '', 'html.parser')
    for element in soup.find_all():
        for attr in ('alt', 'title', 'aria-label'):
            value = element.get(attr, '')
            if isinstance(value, str) and CJK.search(value):
                output.add(value.strip())
    for node in soup.find_all(string=True):
        if isinstance(node, Comment) or node.parent.name in ('style', 'script', 'svg', 'kbd', 'time'):
            continue
        value = str(node).strip()
        if CJK.search(value) or (re.search(r'[A-Za-z]{3,} +[A-Za-z]{3,}', value) and not re.fullmatch(r'https?://\S+', value)):
            output.add(value)

def sources(ref=None):
    all_data = {name: load(f'migration/{name}.json', ref) for name in SOURCE_FILES}
    result = set()
    for name in ('published-posts', 'published-pages'):
        for entry in all_data[name]:
            for field in ('title', 'excerpt', 'content'):
                if field in entry:
                    extract(entry[field].get('rendered', ''), result)
    for name in ('categories', 'tags'):
        for entry in all_data[name]:
            extract(entry['name'], result)
    for entry in all_data['comments']:
        extract(entry['content']['rendered'], result)
    for entry in all_data['milestones']['items']:
        extract(entry['title'], result)
        extract(entry['description'], result)
    extract(all_data['milestones']['remainingHtml'], result)
    return result

def mapped(mapping, text):
    return isinstance(mapping.get(text), str) and bool(mapping[text].strip())

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', help='Git ref to compare for regressions and new texts')
    parser.add_argument('--summary', type=Path, help='Optional Markdown summary output')
    args = parser.parse_args()
    current = sources()
    if not current:
        raise ValueError('No source text found; refusing an empty coverage report')
    previous = sources(args.base) if args.base else set()
    lines = ['## Translation coverage', '', 'Counts are exact dictionary matches, not a measure of translation quality. Existing untranslated text is reported; new untranslated source text and loss of existing mappings fail the check.', '', '| Language | Mapped source strings | Missing | Unchanged mappings |', '| --- | ---: | ---: | ---: |']
    failures = []
    for lang in LANGUAGES:
        mapping = load(f'translations/{lang}.json')
        before = load(f'translations/{lang}.json', args.base) if args.base else {}
        if not isinstance(mapping, dict):
            raise ValueError(f'{lang} translation dictionary is not an object')
        invalid = [key for key, value in mapping.items() if not isinstance(value, str) or not value.strip()]
        if invalid:
            failures.append(f'{lang}: {len(invalid)} empty or invalid translations')
        coverage = sum(mapped(mapping, text) for text in current)
        unchanged = sum(mapped(mapping, text) and mapping[text].strip() == text for text in current)
        lines.append(f'| {lang} | {coverage}/{len(current)} ({coverage/len(current):.1%}) | {len(current)-coverage} | {unchanged} |')
        if args.base:
            regressions = [text for text in current & previous if mapped(before, text) and not mapped(mapping, text)]
            new_missing = [text for text in current - previous if not mapped(mapping, text)]
            if regressions:
                failures.append(f'{lang}: {len(regressions)} existing translations removed')
            if new_missing:
                failures.append(f'{lang}: {len(new_missing)} new source strings without a mapping')
    lines.extend(['', 'Unchanged mappings may be proper names or already-English content and need human review. Traditional Chinese is checked separately for data and URL preservation.'])
    if failures:
        lines.extend(['', '### Coverage failures', *[f'- {failure}' for failure in failures]])
    report = '\n'.join(lines) + '\n'
    print(report)
    if args.summary:
        with args.summary.open('a', encoding='utf-8') as out:
            out.write(report)
    return 1 if failures else 0

if __name__ == '__main__':
    sys.exit(main())
