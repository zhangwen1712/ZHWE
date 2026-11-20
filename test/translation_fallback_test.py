import importlib.util
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

    def test_empty_translation_is_incomplete(self):
        mapping=dict(self.mapping,正文=' ')
        self.assertFalse(generator.complete(self.entry,mapping,[],self.timeline))

    def test_timeline_content_is_part_of_page_completeness(self):
        entry=dict(self.entry,id=213)
        timeline={'items':[{'title':'事件','description':'描述'}],'remainingHtml':''}
        self.assertFalse(generator.complete(entry,self.mapping,[],timeline))
        self.assertTrue(generator.complete(entry,dict(self.mapping,事件='Event',描述='Description'),[],timeline))

if __name__=='__main__':unittest.main()
