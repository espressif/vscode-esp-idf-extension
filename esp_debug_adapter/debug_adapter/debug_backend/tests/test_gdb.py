import os
import unittest
import xmlrunner
import tempfile
from debug_backend import get_gdb, Gdb

REPORTS_DIR = os.path.abspath("./reports")


class BasicTests(unittest.TestCase):
    gdb = None  # type: Gdb

    def test_gdbrun(self):
        with self.assertRaises(ValueError):
            self.gdb = get_gdb(gdb_path="absolutely_not_gdb")
        self.gdb = get_gdb()

    def test_creationOfGdbProcLog(self):
        tmp_log_file = tempfile.NamedTemporaryFile(delete=False)
        self.gdb = get_gdb(log_gdb_proc_file=tmp_log_file.name)
        self.assertTrue(os.path.exists(tmp_log_file.name))


if __name__ == '__main__':
    os.makedirs(REPORTS_DIR, exist_ok=True)
    os.chdir(REPORTS_DIR)
    with open('%s_results.xml' % os.path.basename(__file__), 'wb') as output:
        unittest.main(testRunner=xmlrunner.XMLTestRunner(output=output), failfast=False, buffer=False, catchbreak=False)
