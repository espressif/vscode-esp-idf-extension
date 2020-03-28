import unittest
import debug_adapter
import time


class ArgumentsTest(unittest.TestCase):

    def setUp(self):
        pass

    def tearDown(self):
        pass

    def da_start_stop(self, da_args):
        try:
            da = debug_adapter.DebugAdapter(da_args)
        except Exception as e:
            raise self.failureException(e)

    def runTest(self):
        try:
            print("Defining arguments")
            da_args_l = debug_adapter.DaArgs(log_file="test_args.log")
            da_args_new_int = debug_adapter.DaArgs(new_arg=123)
            da_args_new_str = debug_adapter.DaArgs(new_arg2=123)
            da_args_no_args = debug_adapter.DaArgs()
            print("Running adapters")

            self.da_start_stop(da_args_l)
            self.da_start_stop(da_args_new_int)
            self.da_start_stop(da_args_new_str)
            self.da_start_stop(da_args_no_args)

            print("Done")
        except Exception as e:
            raise self.failureException(e)
