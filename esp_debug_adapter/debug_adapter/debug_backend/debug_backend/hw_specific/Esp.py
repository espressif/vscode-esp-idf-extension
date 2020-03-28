import os
from ..globals import *
from ..gdb import DebuggerError
from .Xtensa import *


class OocdEsp(OocdXtensa):
    def __init__(self, chip_name=None, oocd_exec=None, oocd_scripts=None, oocd_args=None, ip=None, log_level=None,
                 log_stream_handler=None, log_file_handler=None, top_defaults=None, **kwargs):
        defaults = {}
        self.config = defaults  # type: dict
        if top_defaults:
            self.config.update(top_defaults)
        super(OocdEsp, self).__init__(chip_name=chip_name, oocd_exec=oocd_exec, oocd_scripts=oocd_scripts,
                                      oocd_args=oocd_args,
                                      ip=ip, log_level=log_level, log_stream_handler=log_stream_handler,
                                      log_file_handler=log_file_handler, top_defaults=self.config, **kwargs)


class GdbEsp(GdbXtensa):
    "An Abstract class !!!"
    def __init__(self, gdb_path=None, log_level=None, log_stream_handler=None, log_file_handler=None,
                 log_gdb_proc_file=None, remote_target=None, remote_address=None, remote_port=None, top_defaults=None,
                 **kwargs):
        defaults = {
            "app_offset": "0x10000",
            "main_function": "app_main"
        }
        self.config = defaults  # type: dict
        if top_defaults:
            self.config.update(top_defaults)
        super(GdbEsp, self).__init__(gdb_path=gdb_path, log_level=log_level, log_stream_handler=log_stream_handler,
                                     log_file_handler=log_file_handler, log_gdb_proc_file=log_gdb_proc_file,
                                     remote_target=remote_target, remote_address=remote_address,
                                     remote_port=remote_port,
                                     top_defaults=self.config, **kwargs)

    def target_program(self, file_name, off, actions='verify', tmo=30):
        """

        actions can be any or both of 'verify reset'

        Parameters
        ----------
        file_name : str
        off : str
        actions : str
        tmo : int

        """
        local_file_path = file_name
        if os.name == 'nt':
            # Convert filepath from Windows format if needed
            local_file_path = local_file_path.replace("\\", "/")
        self.monitor_run('program_esp %s %s 0x%x' % (local_file_path, actions, int(off)), tmo)

    def connect(self, main_func=None):
        Gdb.connect(self)
        self.console_cmd_run("set remotetimeout 3")
        self.console_cmd_run("set remote hardware-watchpoint-limit 2")
        self.console_cmd_run("mon reset halt")
        self.console_cmd_run("flushregs")
        if main_func is not None:
            self.console_cmd_run("thb %s" % main_func)
            self.console_cmd_run("c")

    def exec_run(self, start=True):
        # -exec-run [ --all | --thread-group N ] [ --start ]
        self.target_reset()
        self.wait_target_state(TARGET_STATE_STOPPED, 10)
        # update GDB memory map
        self.set_app_offset(offset=int(self.config['app_offset'], 0))
        self.disconnect()
        if start:
            self.connect(main_func=self.config['main_function'])
        else:
            self.connect()
        self.wait_target_state(TARGET_STATE_STOPPED, 10)

    def get_thread_info(self, thread_id=None):
        """

        Parameters
        ----------
        thread_id : int or None
            thread to info if exists

        Returns
        -------
        current-thread-id : str
        threads : dict
        """
        # -thread-info [ thread-id ]
        if self._target_state != TARGET_STATE_STOPPED:
            self.exec_interrupt()
            self.wait_target_state(TARGET_STATE_STOPPED, 5)
        return Gdb.get_thread_info(self, thread_id)
