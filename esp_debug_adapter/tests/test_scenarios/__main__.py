import os
import time
import unittest
from logging import getLogger, debug, error, warning, info, critical, DEBUG, INFO, WARNING, CRITICAL, ERROR
import tempfile
import pathlib
from debug_adapter import DebugAdapter, DaArgs
import subprocess
from .client_da import ClientDa
from shutil import which

getLogger().setLevel(DEBUG)
WORKING_DIR = pathlib.Path("temp_sc_tests")

TEST_SRC = pathlib.Path(__file__).parent.joinpath("main.c")  # type: pathlib.Path
TEST_EXE = WORKING_DIR.joinpath("main")  # type: pathlib.Path
da = None  # type : DebugAdapter
ADAPTER_START_ARGS = ["-d 4",
                      "-om", "without_oocd",
                      "-l debug.log",
                      "-t \"\"",
                      "-e %s" % TEST_EXE.absolute()]
GDBINIT_CONTENT = """\
file main
b main
b 26
b 50
b 54
b 56
b 73
b 75
r
"""


def get_adapter4test():
    """

    Returns
    -------
    DebugAdapter
    """
    _args = DaArgs(
        debug=4,
        log_file="debug.log",
        oocd_mode="without_oocd",
        toolchain_prefix="",
        elfpath=WORKING_DIR + "/main"
    )
    return DebugAdapter(_args)


class RequestsTesingUsingScenarios(unittest.TestCase):

    def setUp(self):
        # 1. Crearte a working dir
        os.makedirs(WORKING_DIR, exist_ok=True)
        # 2. Build a native application
        os.system("gcc %s -g -o %s" % (TEST_SRC.absolute(), TEST_EXE.absolute()))
        # 3. Geterate gdbinit
        with open(WORKING_DIR.joinpath("gdbinit"), 'w') as f:
            f.write(GDBINIT_CONTENT)

    def tearDown(self):
        pass

    def run_adapter(self):
        debug("CWD: " + os.getcwd())
        # pipe_output = tempfile.TemporaryFile()
        da_main_path = pathlib.Path(__file__).parent.parent.parent.joinpath("debug_adapter_main.py")
        p_path = pathlib.Path(which("python3"))
        adapter_cmd = [p_path, str(da_main_path)]
        adapter_cmd += ADAPTER_START_ARGS
        # os.system("tree %s" % pathlib.Path(__file__).parent.parent.parent)
        info("run_adapter {}".format(adapter_cmd))
        da_proc = subprocess.Popen(
            bufsize=0, args=adapter_cmd, stdout=subprocess.PIPE,  # pipe_output,
            stderr=subprocess.STDOUT, universal_newlines=True)
        # let adapter to start, if we try to read its stdout imediately it can be empty
        # or may not contain DEBUG_ADAPTER_READY2CONNECT yet
        end_time = time.process_time() + 5.0
        while True:
            now = time.process_time()
            line = da_proc.stdout.readline()
            debug("Readed from DA: " + line)
            # line = pipe_output.readline()
            # print("Debug adapter is loading... :" + str(line), flush=True, end="")
            if "DEBUG_ADAPTER_READY2CONNECT" in line:
                info('Debug adapter is LOADED!')
                break
            if end_time <= now:
                self.fail("Failed to wait for DebugAdpater to start!")

    def runTest(self):

        info("Test ran")
        global da

        self.run_adapter()
        c = ClientDa(wo_checking=False)
        self.assertTrue(c.execute_scenario("init"))
        # try:
        # except Exception as e:
        #     raise self.failureException(e)
