import re
from ..oocd import Oocd
from ..gdb import Gdb


class OocdXtensa(Oocd):
    def __init__(self, chip_name=None, oocd_exec=None, oocd_scripts=None, oocd_args=None, ip=None, log_level=None,
                 log_stream_handler=None, log_file_handler=None, top_defaults=None, **kwargs):

        defaults = {
            "chip_name": "Xtensa"
        }
        self.config = defaults  # type: dict
        if top_defaults:
            self.config.update(top_defaults)
        super(OocdXtensa, self).__init__(chip_name=chip_name, oocd_exec=oocd_exec, oocd_scripts=oocd_scripts,
                                         oocd_args=oocd_args,
                                         ip=ip, log_level=log_level, log_stream_handler=log_stream_handler,
                                         log_file_handler=log_file_handler, top_defaults=self.config, **kwargs)

    def perfmon_enable(self, counter, select, mask=None, kernelcnt=None, tracelevel=None):
        """Run OpenOCD perfmon_enable command, which starts performance counter

        counter: performance counter ID
        select, mask: determine the event being profiled, refer to Xtensa Debug Guide
        kernelcnt: 0 - count events with CINTLEVEL <= tracelevel,
                   1 - count events with CINTLEVEL > tracelevel

        If mask, kernelcnt, tracelevel are not specified, OpenOCD will use default values.
        """
        cmd = '%s perfmon_enable %d %d' % (self.chip_name, counter, select)
        if mask is not None:
            cmd += ' 0x%x' % mask
        if kernelcnt is not None:
            cmd += ' %d' % kernelcnt
        if tracelevel is not None:
            cmd += ' %d' % tracelevel
        self.cmd_exec(cmd)

    def perfmon_dump(self, counter=None):
        """Run OpenOCD perfmon_dump command

        Reported results are returned as a dictionary. Each key is the counter id.
        Each value is a tuple of counts for PRO and APP CPUs.
        If APP CPU is disabled, its count will be None.
        """
        cmd = '%s perfmon_dump' % self.chip_name
        if counter is not None:
            cmd += '%d' % counter
        resp = self.cmd_exec(cmd)
        # Response should have one line for every counter
        lines = resp.split('/n')
        result = {}
        for line in lines:
            if len(line) == 0:
                continue
            tokens = re.match(r'Counter (?P<counter>/d+): CPU0: (?P<count0>/d+)(/s* CPU1: (?P<count1>/d+))?', line)
            count0 = int(tokens.group('count0'))
            count1 = int(tokens.group('count1')) if tokens.group('count1') is not None else None
            counter = int(tokens.group('counter'))
            result[counter] = (count0, count1)
        return result


class GdbXtensa(Gdb):
    "An Abstract class !!!"
    def __init__(self, gdb_path=None, log_level=None, log_stream_handler=None, log_file_handler=None,
                 log_gdb_proc_file=None, remote_target=None, remote_address=None, remote_port=None, top_defaults=None,
                 **kwargs):
        defaults = {
            "gdb_path": "xtensa-gdb",
        }
        self.config = defaults  # type: dict
        if top_defaults:
            self.config.update(top_defaults)
        super(GdbXtensa, self).__init__(gdb_path=gdb_path, log_level=log_level, log_stream_handler=log_stream_handler,
                                        log_file_handler=log_file_handler, log_gdb_proc_file=log_gdb_proc_file,
                                        remote_target=remote_target, remote_address=remote_address,
                                        remote_port=remote_port,
                                        top_defaults=self.config, **kwargs)
