import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/check-content-integrity.py'
class ContentIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        (self.root/'migration').mkdir();(self.root/'scripts').mkdir();shutil.copy(SCRIPT,self.root/'scripts/check-content-integrity.py')
        self.data={'published-posts':[{'id':1,'link':'https://example.test/post/','image':'/a.webp','content':{'rendered':'<img src="/a.webp">'}}], 'published-pages':[{'id':2,'link':'https://example.test/about/','content':{'rendered':'<p>About</p>'}}], 'comments':[{'id':3}], 'media':[{'id':4,'source_url':'https://example.test/a.webp'}]}
        self.write_data();subprocess.run(['git','init','-q',str(self.root)],check=True)
        subprocess.run(['git','-C',str(self.root),'add','migration'],check=True)
        subprocess.run(['git','-C',str(self.root),'-c','user.email=test@example.invalid','-c','user.name=Test','commit','-qm','baseline'],check=True)
    def tearDown(self):self.tmp.cleanup()
    def write_data(self):
        for name,data in self.data.items():(self.root/'migration'/f'{name}.json').write_text(json.dumps(data))
    def audit(self):
        env=dict(os.environ,BASE_SHA='HEAD');return subprocess.run(['python3',str(self.root/'scripts/check-content-integrity.py')],env=env,capture_output=True,text=True)
    def test_unchanged_passes(self):self.assertEqual(self.audit().returncode,0)
    def test_deleted_published_post_fails(self):
        self.data['published-posts']=[];self.write_data();self.assertNotEqual(self.audit().returncode,0)
    def test_removed_media_reference_fails(self):
        self.data['published-posts'][0]['image']='';self.data['published-posts'][0]['content']['rendered']='';self.write_data();self.assertNotEqual(self.audit().returncode,0)
    def test_removed_comment_fails(self):
        self.data['comments']=[];self.write_data();self.assertNotEqual(self.audit().returncode,0)
    def test_changed_permalink_fails(self):
        self.data['published-posts'][0]['link']='https://example.test/new/';self.write_data();self.assertNotEqual(self.audit().returncode,0)

if __name__=='__main__':unittest.main()
