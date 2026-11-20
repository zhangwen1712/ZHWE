import importlib.util
import json
import re
from bs4 import BeautifulSoup
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('generate_locales',Path(__file__).resolve().parents[1]/'scripts/generate-locales.py')
generator=importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)

class TranslationFallbackTests(unittest.TestCase):
    def setUp(self):
        self.entry={'id':1,'title':{'rendered':'标题'},'excerpt':{'rendered':'<p>摘要</p>'},'content':{'rendered':'<p>正文</p><img alt="图片" src="/a.jpg">'}}
        self.mapping={'标题':'Title','摘要':'Excerpt','正文':'Body','图片':'Image','评论':'Comment'}
        self.timeline={'items':[],'remainingHtml':''}

    def test_complete_requires_all_page_fields_and_attributes(self):
        self.assertTrue(generator.complete(self.entry,self.mapping,[],self.timeline))
        for key in ('标题','摘要','正文','图片'):
            incomplete=dict(self.mapping);incomplete.pop(key)
            self.assertFalse(generator.complete(self.entry,incomplete,[],self.timeline),key)

    def test_comments_are_part_of_page_completeness(self):
        comments=[{'post':1,'content':{'rendered':'<p>评论</p>'}}]
        self.assertTrue(generator.complete(self.entry,self.mapping,comments,self.timeline))
        self.assertFalse(generator.complete(self.entry,{k:v for k,v in self.mapping.items() if k!='评论'},comments,self.timeline))

    def test_mapped_text_with_untranslated_chinese_is_incomplete(self):
        mapping=dict(self.mapping,正文='English 正文')
        self.assertFalse(generator.complete(self.entry,mapping,[],self.timeline))

    def test_empty_translation_is_incomplete(self):
        mapping=dict(self.mapping,正文=' ')
        self.assertFalse(generator.complete(self.entry,mapping,[],self.timeline))

    def test_timeline_content_is_part_of_page_completeness(self):
        entry=dict(self.entry,id=213)
        timeline={'items':[{'title':'事件','description':'描述'}],'remainingHtml':''}
        self.assertFalse(generator.complete(entry,self.mapping,[],timeline))
        self.assertTrue(generator.complete(entry,dict(self.mapping,事件='Event',描述='Description'),[],timeline))

class PublishedTranslationAuditTests(unittest.TestCase):
    def test_complete_pages_have_no_untranslated_chinese_or_japanese(self):
        root=Path(__file__).resolve().parents[1]
        cjk=re.compile(r'[\u3400-\u9fff\u3040-\u30ff]')
        for lang in ('en','fr','es','it','de'):
            data=json.loads((root/'translations'/f'{lang}-content.json').read_text())
            for entry in data['published-posts']+data['published-pages']:
                if not entry['translationComplete']:
                    continue
                html=[entry[key]['rendered'] for key in ('title','excerpt','content') if key in entry]
                html += [c['content']['rendered'] for c in data['comments'] if c['post']==entry['id']]
                if entry['id']==213:
                    for event in data['milestones']['items']:
                        html += [event['title'],event['description']]
                    html.append(data['milestones']['remainingHtml'])
                for value in html:
                    soup=BeautifulSoup(value,'html.parser')
                    for tag in soup(['script','style','svg','kbd','time']):
                        tag.decompose()
                    self.assertNotRegex(soup.get_text(' ',strip=True),cjk,f"{lang} page {entry['id']}")

if __name__=='__main__':unittest.main()
