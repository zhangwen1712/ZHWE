import contextlib
import importlib.util
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('coverage_check', Path(__file__).resolve().parents[1] / 'scripts/check-translation-coverage.py')
coverage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coverage)

class CoverageTests(unittest.TestCase):
    def run_check(self, old_source, new_source, before, after):
        def sources(ref=None):
            return old_source if ref else new_source
        def load(path, ref=None):
            return before if ref else after
        with patch.object(coverage, 'LANGUAGES', ('en',)), patch.object(coverage, 'sources', side_effect=sources), patch.object(coverage, 'load', side_effect=load), patch.object(sys, 'argv', ['check', '--base', 'base']), contextlib.redirect_stdout(io.StringIO()):
            return coverage.main()

    def test_existing_missing_is_reported_not_a_regression(self):
        self.assertEqual(self.run_check({'a', 'b'}, {'a', 'b'}, {'a': 'A'}, {'a': 'A'}), 0)

    def test_new_untranslated_text_fails(self):
        self.assertEqual(self.run_check({'a'}, {'a', 'b'}, {'a': 'A'}, {'a': 'A'}), 1)

    def test_deleting_existing_mapping_fails(self):
        self.assertEqual(self.run_check({'a'}, {'a'}, {'a': 'A'}, {}), 1)

    def test_deleted_source_needs_no_mapping(self):
        self.assertEqual(self.run_check({'a', 'b'}, {'a'}, {'a': 'A', 'b': 'B'}, {'a': 'A'}), 0)

    def test_empty_translation_fails(self):
        self.assertEqual(self.run_check({'a'}, {'a'}, {'a': 'A'}, {'a': ' '}), 1)

if __name__ == '__main__':
    unittest.main()
