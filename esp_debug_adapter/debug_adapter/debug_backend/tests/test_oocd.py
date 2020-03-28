import os
import unittest
import xmlrunner
from debug_backend import get_oocd, OocdEsp32

REPORTS_DIR = os.path.abspath("./reports")


class BasicTests(unittest.TestCase):
    def test_simple_start(self):
        get_oocd(chip_name="Esp32")  # if any of files to launch is not exists will through an exception


if __name__ == '__main__':
    os.makedirs(REPORTS_DIR, exist_ok=True)
    os.chdir(REPORTS_DIR)
    with open('%s_results.xml' % os.path.basename(__file__), 'wb') as output:
        unittest.main(testRunner=xmlrunner.XMLTestRunner(output=output), failfast=False, buffer=False, catchbreak=False)
