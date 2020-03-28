from .Esp import *


class OocdEsp32_S2(OocdEsp):

    def __init__(self, chip_name=None, oocd_exec=None, oocd_scripts=None, oocd_args=None, ip=None, log_level=None,
                 log_stream_handler=None, log_file_handler=None, top_defaults=None, **kwargs):
        defaults = {
            "chip_name": "Esp32-S2",
            "oocd_args": ["-f", "interface/ftdi/esp32_devkitj_v1.cfg",
                          "-f", "target/esp32s2.cfg"],
        }
        self.config = defaults  # type: dict
        if top_defaults:
            self.config.update(top_defaults)
        super(OocdEsp32_S2, self).__init__(chip_name=chip_name, oocd_exec=oocd_exec, oocd_scripts=oocd_scripts,
                                           oocd_args=oocd_args,
                                           ip=ip, log_level=log_level, log_stream_handler=log_stream_handler,
                                           log_file_handler=log_file_handler, top_defaults=self.config, **kwargs)


class GdbEsp32_S2(GdbEsp):
    def __init__(self, gdb_path=None, log_level=None, log_stream_handler=None, log_file_handler=None,
                 log_gdb_proc_file=None, remote_target=None, remote_address=None, remote_port=None, top_defaults=None,
                 **kwargs):
        defaults = {
            "gdb_path": "xtensa-esp32s2-elf-gdb",
        }
        self.config = defaults  # type: dict
        if top_defaults:
            self.config.update(top_defaults)
        super(GdbEsp32_S2, self).__init__(gdb_path=gdb_path, log_level=log_level, log_stream_handler=log_stream_handler,
                                          log_file_handler=log_file_handler, log_gdb_proc_file=log_gdb_proc_file,
                                          remote_target=remote_target, remote_address=remote_address,
                                          remote_port=remote_port,
                                          top_defaults=self.config, **kwargs)

    def set_app_offset(self, offset):
        """

        Parameters
        ----------
        offset: int

        """
        self.monitor_run('esp32_s2 appimage_offset 0x%x' % offset)
        self.config['app_offset'] = str(offset)
