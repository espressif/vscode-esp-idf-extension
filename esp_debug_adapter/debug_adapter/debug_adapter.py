# MIT License
#
# Copyright (c) 2020 Espressif Systems (Shanghai) Co. Ltd.
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights to
# use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
# of the Software, and to permit persons to whom the Software is furnished to do
# so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
#
# SPDX-License-Identifier: MIT

import socket
import threading
from datetime import datetime
from time import sleep

# noinspection PyCompatibility
from queue import Queue
from typing import List, Dict, Any
from pprint import pformat

from . import debug_backend as dbg
from . import schema
from . import log
from .command_processor import CommandProcessor
from .da_args import DaArgs
from .threads import KillerThread, ReaderThread, WriterThread
from .tools import *

A2VSC_STARTED_STRING = "DEBUG_ADAPTER_STARTED"
A2VSC_READY2CONNECT_STRING = "DEBUG_ADAPTER_READY2CONNECT"
A2VSC_STOPPED_STRING = "DEBUG_ADAPTER_STOPPED"


class DebugAdapter:
    """
    Adapter class
    """

    def __init__(self, args, gdb_inst=None, oocd_inst=None):
        """
        Parameters
        ----------
        args : dict or object or DaArgs
        gdb_inst : dbg.Gdb
            if provided an existing instance, handling at start_gdb()
        oocd_inst : dbg.Oocd
            if provided an existing instance, handling at start_oocd()
        """
        # === arguments adaptation
        if isinstance(args, dict):
            args = ObjFromDict(args)

        self.start_time = datetime.now().strftime("%Y_%m_%d_%H-%M-%S")
        log.init(args, start_time_str=self.start_time)
        if args.debug > 2:
            import os
            log.info("Working directory: %s" % os.getcwd())
            log.info("Arguments: \n" + pformat(args.get_dict(), indent=4))

        self.args = args
        self.__socket_stuff = {'srv': None,  # typ
                               'sock_resp': None,
                               'r_file': None}  # type: Dict[str, Any[socket.socket]]
        self.state = DaStates()  # type: DaStates
        if isinstance(self.state.toolchain_prefix, str):
            self.state.toolchain_prefix = (self.args.toolchain_prefix.strip("'")).strip("\"")
        # openocd mode handling
        if self.args.oocd_mode == "run_and_connect":
            self.state.openocd_need_run = True
            self.state.openocd_skip_connection = False
        elif self.args.oocd_mode == "connect_to_instance":
            self.state.openocd_need_run = False
            self.state.openocd_skip_connection = False
            self.state.oocd_ip = args.oocd_ip
        else:  # without_oocd
            self.state.openocd_need_run = False
            self.state.openocd_skip_connection = True

        # === private stuff:
        self.__write_queue = Queue()
        self.__command_processor = CommandProcessor(self, self.__write_queue, self.args)
        self.__read_from = None
        self.__write_to = None
        # === protected stuff
        self._killer = KillerThread()
        self._gdb = gdb_inst  # type: dbg.Gdb
        self._oocd = oocd_inst  # type: dbg.Oocd
        self._thread_cache = []  # old thread states
        # === public stuff:
        self.reader = None  # type: Any(ReaderThread,None)
        self.writer = None  # type: Any(WriterThread,None)
        self.target_poller = None
        self.threads = []  # type: List[schema.Thread]
        self.thread_selected = None  # type: Any(int,None)
        self.frame_id_selected = None  # type: Any(int,None)

    def _wait_for_connection(self):
        """
        Starts listen to socket. After the connection creates file for data reading and writing
        """
        self._start_socket_listening()
        self.state.ready = False
        log.debug("Got connection\n")
        self.__socket_stuff['r_file'] = self.__socket_stuff['sock_resp'].makefile('rwb')
        self.__write_to = self.__socket_stuff['r_file']
        self.__read_from = self.__socket_stuff['r_file']
        self.state.ready = True

    def _start_socket_listening(self):
        try:
            self.__socket_stuff['srv'] = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.__socket_stuff['srv'].setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.__socket_stuff['srv'].bind(('localhost', self.args.port))
            log.info("Listening on port {}\n".format(self.args.port))
            self.log_cmd(A2VSC_READY2CONNECT_STRING)
            self.__socket_stuff['srv'].listen(0)
            self.__socket_stuff['sock_resp'], _ = self.__socket_stuff['srv'].accept()
        except Exception as e:
            log.warning("Error with a port #%d" % self.args.port)
            raise e

    def get_backtrace(self, thread_id):
        """
        Send stack-list-frames to gdb
        Parameters
        ----------
        thread_id: int
            Unique thread id than could be generated with self.frame_id_create

        Returns
        -------
        str
            string with result
        """
        self._gdb.select_thread(thread_id)
        return self._gdb.get_backtrace()

    def adapter_run(self, gdb_inst=None, oocd_inst=None):
        """
        Parameters
        ----------
        gdb_inst : dbg.Gdb
            if provided an existing instance, handling at
            command_processor().on_initialize_request -> self.da.adapter_init() -> start_gdb()
        oocd_inst : dbg.Oocd
            if provided an existing instance, handling at
            command_processor().on_initialize_request -> self.da.adapter_init() -> start_oocd()

        """
        self._gdb = gdb_inst
        self._oocd = oocd_inst
        log.info('Starting. Cmd: %s\n' % (' '.join(sys.argv),))
        if self.args.conn_check is not None:
            self.state.connection_check_mode = True
        self.adapter_connect()
        if self.state.connected:
            self.reader.start()
            self.writer.start()
            self.state.running = True
        else:
            self.state.error = True
            log.debug('Not connected')

    @staticmethod
    def log_cmd(cmd_string):
        """
        Logging method for interfacing with supervisor that monitors the log. E.g. could indicate that DA is ready
        Parameters
        ----------
        cmd_string : str
        """
        print(cmd_string)
        log.cmd("Printed cmd: " + cmd_string)

    @staticmethod
    def frame_id_generate(thread_id, frame_level):
        """
        Codder of an unique frame id name (used dec)

        Parameters
        ----------
        thread_id : int or str
        frame_level : int or str

        Returns
        -------
        frame_id : int
        """
        frame_id = int(thread_id) * 1000 + int(frame_level)
        return frame_id

    @staticmethod
    def frame_id_read(frame_id):
        """
        DeCodder of an unique frame id name (used dec)

        Parameters
        ----------
        frame_id : int or str

        Returns
        -------
        threadId : int
        frame_level : int
        """
        frame_id = int(frame_id)
        thread_id = frame_id // 1000  # type: int
        frame_level = frame_id - thread_id * 1000
        return thread_id, frame_level

    def adapter_restart(self):  # TODO think about removing
        self.state.ready = False
        # self._stopped = True
        old_reader = self.reader
        old_writer = self.writer

        # self._gdb.console_cmd_run('restart 0')
        # self._gdb.gdb_process_restart()
        self.adapter_run()

        # self.adapter_stop()
        old_writer._stop = True
        old_reader._stop = True

        if self.state.openocd_need_run:
            self.stop_oocd()
        self.stop_gdb()

    def adapter_stop(self):
        """
        Safely stops all processes of DA
        """
        try:
            self.stop_target_poller()
            self.stop_gdb()
            if self.state.openocd_need_run:
                self.stop_oocd()
            self.stop_writer_thread()
            self.stop_reader_thread()
            self.__socket_stuff['srv'].close()
        except Exception as e:
            log.debug_exception(e)
            self.state.error = True
        self.state.running = False
        self.log_cmd(A2VSC_STOPPED_STRING)

    def adapter_connect(self):
        if not self.state.connected:
            if self.args.port is not None:
                self._wait_for_connection()
            else:
                if PY2:
                    self.__write_to = sys.stdout
                    self.__read_from = sys.stdin
                    if WIN32:
                        # must read streams as binary on windows
                        import msvcrt
                        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
                        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
                else:
                    self.__write_to = sys.stdout.buffer
                    self.__read_from = sys.stdin.buffer
            self.reader = ReaderThread(self.__read_from, self.__command_processor)
            self.writer = WriterThread(self.__write_to, self.__write_queue)
            self.state.connected = True
        else:
            log.debug('Already connected')

    def adapter_init(self):
        """
        Starts OpenOCD (depends on input arguments) and Gdb
        """
        if self.state.openocd_need_run:
            self.start_oocd()
        if (not self.is_connection_check_mode()):
            self.start_gdb()
        self.state.initialized = True

    def poll_target(self, *kwargs):
        log.info("Poll target")
        if self.state.wait_target_state == dbg.TARGET_STATE_STOPPED:
            stopped,rsn_str = self.is_stopped()
            if stopped:
                self.state.wait_target_state = dbg.TARGET_STATE_UNKNOWN
                self.__command_processor.generate_StoppedEvent(reason=rsn_str,
                                                               thread_id=0,
                                                               all_threads_stopped=True)
        elif self.state.wait_target_state == dbg.TARGET_STATE_RUNNING:
            # this is not fully implemented yet, need to define when we need to start waiting for target get running
            try:
                self._gdb.wait_target_state(dbg.TARGET_STATE_RUNNING, 0)
                self.state.wait_target_state = dbg.TARGET_STATE_UNKNOWN
                self.__command_processor.generate_ContinuedEvent(thread_id=0,
                                                                all_threads_continued=True)
            except dbg.DebuggerTargetStateTimeoutError:
                pass
        if self.state.wait_target_state != dbg.TARGET_STATE_UNKNOWN:
            # restart timer if we still need to wait for target state
            self.target_poller = threading.Timer(1.0, self.poll_target, args=[self,])
            self.target_poller.start()

    def reset(self):
        """
        Reset the target and wait a stop

        Returns
        -------
        stop reason : int

        """
        self._gdb.target_reset()
        rsn = self._gdb.wait_target_state(dbg.TARGET_STATE_STOPPED, 10)
        return rsn

    def fw_write(self):
        """
        Writes program to target
        """
        state, rsn = self._gdb.get_target_state()
        if state != dbg.TARGET_STATE_STOPPED:
            self._gdb.exec_interrupt()
            self._gdb.wait_target_state(dbg.TARGET_STATE_STOPPED, 5)
        win_drive, path, name, extension, exists = path_disassemble(self.args.elfpath)
        bin_path = os.path.join(win_drive, path, name + ".bin")
        bin_path = str(bin_path)
        self._gdb.target_program(file_name=bin_path, off=self.args.app_flash_off)
        self._gdb.target_reset()
        log.debug("App was flashed\n")

    def gdb_restart(self):
        """
        Stops than starts gdb process with the same settings
        """
        self.stop_gdb()
        self.start_gdb()

    def relaunch_app(self):
        """
        Interrupts the target, then resets it
        """
        self._gdb.exec_interrupt()
        self._gdb.target_reset()
        self.resume_exec()

    def pause(self):
        """
        Sent an interrupt signal to target
        """
        state, rsn = self._gdb.get_target_state()
        # print 'DebuggerTestAppTests.LOAD_APP %s / %s' % (cls, app_bins)
        if state != dbg.TARGET_STATE_STOPPED:
            self._gdb.exec_interrupt()
            rsn = self._gdb.wait_target_state(dbg.TARGET_STATE_STOPPED, 5)
        log.debug("Reason of pause: " + str(rsn))

    def select_frame(self, frame_id, force=False):
        """
        Parameters
        ----------
        frame_id : int or str
            Frame id in a format 0dTFFF where thousands is  thread number, FFF - frame level = 0...999
        force : bool
        """
        # if there is some frame_id
        if (frame_id is not None) \
                and (self.frame_id_selected != frame_id or force):  # if it is new or forced
            thread_id, fr_level = self.frame_id_read(frame_id)
            self._gdb.select_thread(thread_id)
            self._gdb.select_frame(fr_level)
            self.frame_id_selected = frame_id

    def get_scopes(self, frame_id=None):
        """

        Parameters
        ----------
        frame_id : int
            Frame number tthat could be created or read with self.frame_id_* api

        Returns
        -------
        list
            list of variable names
        """
        self.select_frame(frame_id)
        s = []
        v_list = self._gdb.get_local_variables(no_values=True)
        s.append({'name': 'Local',
                  'vals_list': v_list})
        return s

    def get_vars(self, frame_id=None):
        """
        List of variables. Each variable is an object in terms of GDB (read the manual)

        Parameters
        ----------
        frame_id : int
            Frame number tthat could be created or read with self.frame_id_* api

        Returns
        -------
            list
                list of local variables

        """
        self.select_frame(frame_id, force=True)  # TODO try to remove changing of a frame
        v = self._gdb.get_local_variables(no_values=False)
        return v

    def break_add(self, src_line, condition=''):
        """
        Breakpoint setting

        Parameters
        ----------
        condition : str
        src_line : str
        """
        self._gdb.add_bp(src_line, ignore_count=0, cond=condition)

    def break_removeall(self):
        self._gdb.delete_bp("")

    def is_connection_check_mode(self):
        """

        Returns
        -------
        bool : if the connection_check_mode is used (read DA help)
        """
        return self.state.connection_check_mode

    def is_stopped(self):
        """
        Returns
        -------
        bool
            True - stopped, False - not.
        int
            The reason of stopping
        """
        try:
            r = self._gdb.wait_target_state(dbg.TARGET_STATE_STOPPED, 0)
            if r == dbg.TARGET_STOP_REASON_BP:
                return True, 'breakpoint'
            elif r == dbg.TARGET_STOP_REASON_STEPPED:
                return True, 'stepped'
            elif r == dbg.TARGET_STOP_REASON_SIGINT:
                return True, 'pause'
            elif r == dbg.TARGET_STOP_REASON_FN_FINISHED:
                return True, 'entry'
            else:
                return True, 'exception'
        except dbg.DebuggerTargetStateTimeoutError:
            return False, ''

    def is_inherited_gdb(self):
        """
        Check if there is some gdb object for using instead of creating the one one by DA
        Returns
        -------
        bool
            Result
        """
        return self._gdb is not None

    def is_inherited_oocd(self):
        """
        Check if there is some openocd object for using instead of creating the one one by DA
        Returns
        -------
        bool
            Result
        """
        return self._oocd is not None

    def start_gdb(self):
        """ Starting GDB and write the result into state.gdb_started attribute
        """
        if not self.is_inherited_gdb():
            try:
                if log.LOG_TO_MULT_FILES:
                    log_file_handler = log.get_file_handler('adapter_gdb_')
                else:
                    log_file_handler = log.get_file_handler()
                self._gdb = dbg.get_gdb(chip_name=self.args.device_name,
                                        log_level=log.level,
                                        log_file_handler=log_file_handler,
                                        log_stream_handler=log.stream_handler,
                                        log_gdb_proc_file="gdb_proc.log",
                                        remote_target=(not self.state.openocd_skip_connection)
                                        )
                self._gdb.exec_file_set(self.args.elfpath)
                self._gdb.connect()
            except Exception as e:
                raise e
        self.state.gdb_started = True

    def start_oocd(self):
        """ Starts oocd, write the result into state.oocd_started attribute
        """
        if not self.args.oocd:
            return
        if not self.is_inherited_oocd():
            # if self.args.debug > 4: # TODO doesn't connecting with this
            #     oocd_args = oocd_args + ['-d']
            if log.LOG_TO_MULT_FILES:
                log_file_handler = log.get_file_handler('adapter_oocd_')
            else:
                log_file_handler = log.get_file_handler()
            self._oocd = dbg.get_oocd(chip_name=self.args.device_name,
                                      oocd_exec=self.args.oocd,
                                      oocd_scripts=self.args.oocd_scripts,
                                      oocd_args=self.args.oocd_args,
                                      ip=self.state.oocd_ip,
                                      log_level=log.level,
                                      log_file_handler=log_file_handler,
                                      log_stream_handler=log.stream_handler
                                      )
            self._oocd.start()
            self.state.oocd_started = True

    def stop_oocd(self):
        """
        Stops OpenOCD subprocess if it was lauched
        """
        try:
            if self.state.oocd_started:
                self._oocd.stop()
                self.state.oocd_started = False
        except Exception as e:
            log.debug(e)

    def stop_reader_thread(self):
        """
        Stops ReaderThread and ensure in that
        """
        self.reader._stop = True
        while self.writer.is_alive is True:
            sleep(0.1)

    def stop_writer_thread(self):
        """
        Stops WriterThread and ensure in that
        """
        self.writer._stop = True
        self.__write_queue.put('exit')
        while self.writer.is_alive is True:
            sleep(0.1)

    def start_target_poller(self, state):
        self.state.wait_target_state = state
        self.target_poller = threading.Timer(1.0, self.poll_target, args=[self,])
        self.target_poller.start()

    def stop_target_poller(self):
        if self.state.wait_target_state == dbg.TARGET_STATE_UNKNOWN:
            return
        self.state.wait_target_state = dbg.TARGET_STATE_UNKNOWN
        self.target_poller.cancel()
        self.target_poller.join()

    def stop_gdb(self):
        """
        Stops GDB subprocess if it was lauched
        """
        try:
            if self.state.gdb_started:
                self._gdb.gdb_exit()
                self.state.gdb_started = False
        except Exception as e:
            log.debug(e)

    def threads_analysis(self, force_upd=False):
        """
        Should be launched after DebugAdapter.get_threads(). It separated of the last one for possibility to insert
        a response for a request method (positive or negative) before starting to to find a changes (if we have they).

        Parameters
        ----------
        force_upd : bool
        """

        def are_all_stopped(threads):
            for t in threads:
                if t['state'] != "stopped":
                    return False
            return True

        if (self.threads != self._thread_cache) or force_upd:  # changes!!!
            # === processing
            self.state.threads_are_stopped = are_all_stopped(self.threads)
            # === finalizing:
            self._thread_cache = self.threads
            self.state.threads_updated = False

    def set_variable(self, name, value):
        """
        Parameters
        ----------
        name : str
            name of a variable
        value : str
        """
        # TODO: select frame is not selected?
        # self._gdb.var_assign(file_func, name, value)
        self._gdb.data_eval_expr('%s=%s' % (name, value))

    def evaluate(self, expr):
        """
        Parameters
        ----------
        expr: str

        Returns
        -------
        result: str
        """
        r = self._gdb.data_eval_expr(expr)
        return r

    def get_threads(self):
        """
        Read threads exists on target
        """
        self.state.ready = False
        try_num = 0
        while try_num < 3:
            try:
                # self.pause()
                self._gdb.wait_target_state(dbg.TARGET_STATE_STOPPED, 10)
                gdb_resp = self._gdb.get_thread_info()
                self.threads = gdb_resp[1]
                self.state.threads_updated = True
                self.state.ready = True
                return True
            except dbg.DebuggerTargetStateTimeoutError as e:
                log.debug(e)
                try_num += 1
        self.state.ready = True
        return False

    def stop_exec(self):
        """ Stops target execution and ensures that it is in STOPPED state
        """
        state, _ = self._gdb.get_target_state()
        if state != dbg.TARGET_STATE_STOPPED:
            self._gdb.exec_interrupt()
            rsn = self._gdb.wait_target_state(dbg.TARGET_STATE_STOPPED, 10)
            assert (rsn == dbg.TARGET_STOP_REASON_SIGINT)

    def resume_exec(self, loc=None):
        """
        Resumes target execution and ensures that it is in RUNNING state

        Parameters
        ----------
        loc : str
            Location to which pc will jump before executing 'continue'
        """
        state, rsn = self._gdb.get_target_state()
        if state != dbg.TARGET_STATE_RUNNING:
            if loc:
                pc = self._gdb.get_reg('pc')
                log.debug('Resume from addr 0x%x' % pc)
                self._gdb.exec_jump(loc)
            else:
                self._gdb.exec_continue()
            self._gdb.wait_target_state(dbg.TARGET_STATE_RUNNING, 5)
        self.start_target_poller(dbg.TARGET_STATE_STOPPED)

    def run(self, start=False, main_func="start_cpu0"):
        """
        Runs a target program execution. If start==True set breakpoint at app_main
        """
        state, rsn = self._gdb.get_target_state()
        if state == dbg.TARGET_STATE_RUNNING:
            self.pause()
        self._gdb.exec_run(start)

    def start(self):
        self.run(start=True)

    def _check_run_n_stop(self):
        try:
            self._gdb.wait_target_state(dbg.TARGET_STATE_RUNNING)
            self._gdb.wait_target_state(dbg.TARGET_STATE_STOPPED)
            pass
        except dbg.DebuggerTargetStateTimeoutError:
            return False
        return True

    def step(self):
        """
        Performs program step (step over, "next" command in GDB)
        """
        # self._gdb.get_current_frame()
        self._gdb.exec_next()
        return self._check_run_n_stop()

    def step_in(self):
        """
        Performs program step (step in, "step" command in GDB)
        """
        self._gdb.exec_step()
        return self._check_run_n_stop()

    def step_out(self):
        """
        Runs until current function retunrs (step out, "finish" command in GDB)
        """
        self._gdb.exec_finish()
        return self._check_run_n_stop()


class DaStates(object):
    running = False
    ready = False
    connected = False
    initialized = False
    configured_by_client = False
    connection_check_mode = False
    in_restarting_process = False
    no_debug = False  # argument of a launch request
    preparing_restart = False
    gdb_started = False
    ocd_started = False
    wait_target_state = dbg.TARGET_STATE_UNKNOWN
    oocd_ip = 'localhost'
    openocd_need_run = False
    openocd_skip_connection = False
    threads_updated = False  # True if something called a get_threads() method
    threads_are_stopped = None  # type: bool or None
    # sets to False after the update processed (for example, stopEvent generated)
    error = False
    start_time = None  # type: str
    toolchain_prefix = None  # type: str
