import os
import subprocess
import telnetlib
import threading
import time
from .globals import *
from . import log


class Oocd(threading.Thread):
    # TODO add reading OPENOCD_SCRIPTS and others
    _oocd_proc = None
    _logger = None
    CREATION_FLAGS = 0
    STDOUT_DEST = subprocess.PIPE
    OOCD_TELNET_PORT = 4444

    def get_config(self, param_name, in_val=None):
        if in_val is not None:
            return in_val
        return self.config.get(param_name)

    def __init__(self, chip_name=None,
                 oocd_exec=None,
                 oocd_scripts=None,
                 oocd_args=None,
                 ip=None,
                 log_level=None,
                 log_stream_handler=None,
                 log_file_handler=None,
                 top_defaults=None,
                 **kwargs):
        """

        Parameters
        ----------
        chip_name
        oocd_exec
            use "" value for pass openocd's subprocess creation
        oocd_scripts
        oocd_args
        ip
        log_level
        log_stream_handler
        log_file_handler
        top_defaults
        kwargs
        """
        defaults = {
            "chip_name": CHIP_NAME_NA,
            "oocd_exec": os.environ.get("OPENOCD_BIN", "openocd"),
            "ip": 'localhost',
        }
        super(Oocd, self).__init__()
        # defaults
        self.config = defaults  # type: dict
        if top_defaults:
            self.config.update(top_defaults)

        chip_name = self.get_config("chip_name", chip_name)
        oocd_exec = self.get_config("oocd_exec", oocd_exec)

        oocd_scripts = self.get_config("oocd_scripts", oocd_scripts)
        oocd_args = self.get_config("oocd_args", oocd_args)

        ip = self.get_config("ip", ip)
        log_level = self.get_config("log_level", log_level)
        log_stream_handler = self.get_config("log_stream_handler", log_stream_handler)
        log_file_handler = self.get_config("log_file_handler", log_file_handler)

        oocd_full_args = []
        if oocd_scripts is None:
            oocd_scripts = os.environ.get("OPENOCD_SCRIPTS", None)
            if oocd_scripts is not None:
                oocd_full_args += ['-s', oocd_scripts]

        oocd_full_args += oocd_args

        self.chip_name = chip_name
        self.do_work = True
        ip_binary = ip.encode('utf-8')
        if oocd_exec is not None:
            self._logger = log.logger_init('OpenOCD', log_level, log_stream_handler, log_file_handler)
        self._logger.debug('Start OpenOCD: {%s}', oocd_args)

        if oocd_exec != "":  # if oocd_exec is not empty - run
            try:
                self._oocd_proc = subprocess.Popen(
                    bufsize=0, args=[oocd_exec] + oocd_full_args,
                    stdin=None, stdout=self.STDOUT_DEST, stderr=subprocess.STDOUT,
                    creationflags=self.CREATION_FLAGS, universal_newlines=True
                )
                time.sleep(1)
            except FileNotFoundError:
                self._logger.error("OpenOCD exec file is not found!")
                raise FileNotFoundError("OpenOCD exec file is not found!")
            if self._oocd_proc.poll() is not None:
                self._logger.error("Failed to start telnet connection with OpenOCD cause it's closed!")
                self._logger.error(self._oocd_proc.stdout.read())
                raise ProcessLookupError("OpenOCD is closed!")
        else:
            self._logger.debug('Open telnet conn...')
            try:
                self._tn = telnetlib.Telnet(ip_binary, self.OOCD_TELNET_PORT, 5)
                self._tn.read_until(b'>', 5)
            except Exception as e:
                self._logger.error('Failed to open telnet connection with OpenOCD!')
                if oocd_exec is not None:
                    if self._oocd_proc.stdout:
                        out = self._oocd_proc.stdout.read()
                        self._logger.debug(
                            '================== OOCD OUTPUT START =================\n'
                            '%s================== OOCD OUTPUT END =================\n',
                            out)
                    self._oocd_proc.terminate()
                raise e

    def run(self):
        while self._oocd_proc.stdout and self.do_work:
            ln = self._oocd_proc.stdout.readline()
            if len(ln) == 0:
                break
            self._logger.debug(ln.rstrip(' \r\n'))

    def stop(self):
        self._logger.debug('Close telnet conn')
        self._tn.close()
        self._logger.debug('Stop OpenOCD')
        self.do_work = False
        self._oocd_proc.terminate()
        self._logger.debug('Join thread')
        self.join()
        self._logger.debug('Close stdout')
        if self._oocd_proc.stdout:
            self._oocd_proc.stdout.close()
        self._logger.debug('OOCD thread stopped')

    def cmd_exec(self, cmd):
        # read all output already sent
        resp = self._tn.read_very_eager()
        self._logger.debug('TELNET <-: %s' % resp)
        self._logger.debug('TELNET ->: %s' % cmd)
        cmd_sent = cmd + '\n'
        self._tn.write(cmd_sent)
        resp = self._tn.read_until('>')
        # remove all '\r' first
        resp = resp.replace('\r', '')
        # command we sent will be echoed back - remove it
        index_start = resp.find(cmd_sent)
        if index_start >= 0:
            resp = resp[index_start + len(cmd_sent):]
        # the response will also include '>', next prompt - remove it as well
        index_end = resp.rfind('>')
        if index_end >= 0:
            resp = resp[:index_end]
        self._logger.debug('TELNET <-: %s' % resp)
        return resp

    def perfmon_dump(self, **kwargs):
        return None

    def perfmon_enable(self, **kwargs):
        return None
