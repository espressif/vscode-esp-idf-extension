import os
import sys
import unittest
from xmlrunner import XMLTestRunner
import test_scenarios
import test_arguments

# Make it possible to run this file from the root dir of DA without
# installing DA; useful for Travis testing, etc.
sys.path[0:0] = ['.']


def main():
    if not os.path.isfile('run_tests.py'):
        print('Please execute from a `tests` directory!')
        return 1
    else:
        runner = XMLTestRunner(verbosity=2, output='results')
        # tests = unittest.TestLoader().discover('.', pattern='test*.py')
        tests = unittest.TestSuite()
        tests.addTest(test_scenarios.RequestsTesingUsingScenarios())
        tests.addTest(test_arguments.ArgumentsTest())
        result = runner.run(tests)
        if result.wasSuccessful():
            return 0
        else:
            return 1


if __name__ == '__main__':
    sys.exit(main())
