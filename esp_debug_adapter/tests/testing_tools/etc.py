import os
from subprocess import Popen, PIPE
import time
from debug_adapter import A2VSC_READY2CONNECT_STRING



def cwd_to_script_dir(dir_in_pyscript_dir=None):
    cur_work_dir = os.path.dirname(os.path.abspath(__file__))
    if dir_in_pyscript_dir:
        cur_work_dir = os.path.join(cur_work_dir, dir_in_pyscript_dir)
    os.chdir(cur_work_dir)
    return cur_work_dir




def run_adapter():
    cwd_to_script_dir()
    os.chdir("..")
    print(os.getcwd())
    p = Popen(['python.exe', "C:\\esp\\masters\\esp_debug_adapter\\debug_adapter_main.py", "-dr"], stdout=PIPE)
    line = ""
    while not (A2VSC_READY2CONNECT_STRING in line):
        line = p.stdout.readline()
        print(line)
        time.sleep(.1)
    print("Adapter is ready!")


def kill_adapter():
    # de._killer.kill(['xtensa-esp32-elf-gdb.exe', 'openocd.exe'])
    # while self._killer.isAlive():
    pass  # wait while killer do the job it programmed for


if __name__ == '__main__':
    # gen_gdbinit()
    # build_x86()
    run_adapter()
    print("done")
