import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

SCRIPT=Path(__file__).resolve().parents[1]/'scripts/check-site-integrity.py'
LANGS={'en':'','zh-CN':'zh','zh-Hant':'zh-Hant','fr':'fr','es':'es','it':'it','de':'de','x-default':''}
ORIGIN='https://zhwe-blog.pages.dev'

class SiteIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        for directory in ('scripts','ci','dist'): (self.root/directory).mkdir()
        shutil.copy(SCRIPT,self.root/'scripts/check-site-integrity.py')
        (self.root/'ci/known-missing-internal.json').write_text('[]')
        (self.root/'dist/robots.txt').write_text('User-agent: *\nDisallow: /\n')
        (self.root/'dist/sitemap.xml').write_text(f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>{ORIGIN}/</loc></url></urlset>')
        alternates=''.join(f'<link rel="alternate" hreflang="{lang}" href="{ORIGIN}/{prefix+"/" if prefix else ""}">' for lang,prefix in LANGS.items())
        for prefix in set(LANGS.values()):
            directory=self.root/'dist'/prefix;directory.mkdir(exist_ok=True)
            path=f'/{prefix}/' if prefix else '/'
            (directory/'index.html').write_text(f'<meta name="robots" content="noindex,nofollow"><link rel="canonical" href="{ORIGIN}{path}">{alternates}<a href="/">Home</a>')

    def tearDown(self):self.tmp.cleanup()
    def run_audit(self):return subprocess.run(['python3',str(self.root/'scripts/check-site-integrity.py')],capture_output=True,text=True)
    def test_valid_site_passes(self):self.assertEqual(self.run_audit().returncode,0)
    def test_new_broken_link_fails(self):
        with (self.root/'dist/index.html').open('a') as f:f.write('<img src="/missing.webp">')
        result=self.run_audit();self.assertNotEqual(result.returncode,0);self.assertIn('/missing.webp',result.stdout)
    def test_known_missing_link_is_reported_without_failure(self):
        (self.root/'ci/known-missing-internal.json').write_text(json.dumps(['/missing.webp']))
        with (self.root/'dist/index.html').open('a') as f:f.write('<img src="/missing.webp">')
        result=self.run_audit();self.assertEqual(result.returncode,0);self.assertIn('/missing.webp',result.stdout)
    def test_wrong_canonical_fails(self):
        file=self.root/'dist/fr/index.html';file.write_text(file.read_text().replace(f'{ORIGIN}/fr/',f'{ORIGIN}/wrong/',1))
        self.assertNotEqual(self.run_audit().returncode,0)

if __name__=='__main__':unittest.main()
