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

from typing import Union

h = {  # @formatter:off
    "--app_flash_off":      'Program start address offset (ESP32_APP_FLASH_OFF)',
    "--board-type":         'Type of the board to run tests on (you could use OOCD_TEST_BOARD envvar by default)',
    "--debug":              'Debug level (0-4), 5 - for a full OOCD log',
    "--device-name":        'The name of used hardware to debug (currently Esp32 or Esp32_S2). It defines '
                            '--toolchain-prefix',
    "--port":               "Listen on given port for VS Code connections",
    "--conn-check":         'Mode for development purposes',
    "--dev-dbg":            'Mode for development purposes',
    "--dev-x86rq":          'Mode for development purposes',
    "--dev-defaults":       'Mode for development purposes',
    "--log-file":           'Path to log file.',
    "--log-mult-files":     'Log to separated files',
    "--toolchain-prefix":   '(If not set, drives by --device-name!) Toolchain prefix. If set, rewrites the value '
                            'specified by --device-name.',
    "--elfpath":            'A path to a builder elf file for debugging.',
    "--oocd":               'Path to OpenOCD binary file, (used OPENOCD_BIN envvar or (if not set) '
                            '\'openocd\' by default)',
    "--oocd-args":          "(If not set, drives by --device-name!) Specifies custom OpenOCD args. If set, rewrites the"
                            " value specified by --device-name.",
    "--oocd-mode":          'Cooperation with OpenOCD',
    "--oocd-ip":            "Ip for remote OpenOCD connection",
    "--oocd-scripts":       'Path to OpenOCD TCL scripts (use OPENOCD_SCRIPTS envvar by default)',
}  # @formatter:on


class DaArg(object):
    def __init__(self,
                 name="argument",
                 cli_long_key="--long_key",
                 cli_short_key="-l",
                 help_str="The Help field wasn't written yet",
                 implied_type=str,
                 default_value=None
                 ):
        """

        Parameters
        ----------
        name : str
        cli_long_key : str
        cli_short_key : str
        help_str : str
        implied_type : Any
        default_value
        """

        self.name = name
        self.help_str = help_str
        self.default_value = default_value
        self.implied_type = implied_type
        self.cli_long_key = cli_long_key
        self.cli_short_key = cli_short_key
        self._value = None

    def set(self, value):
        assert (self.implied_type == type(value))
        self._value = value

    def get(self):
        return self._value


class DaArgsDescriptor(object):
    # @formatter:off
    app_flash_off = DaArg(name="app_flash_off",
                          cli_long_key="--app_flash_off",
                          cli_short_key="-a",
                          help_str=h["--app_flash_off"],
                          default_value=0x10000,
                          implied_type=Union[int])

    board_type =    DaArg(name="board_type",
                          cli_long_key="--board-type",
                          cli_short_key="-b",
                          help_str=h["--app_flash_off"],
                          default_value=None,
                          implied_type=None)

    # @formatter:on


class DaArgs(object):
    """
    Contains mandatory set of Da arguments. Can be extended with **kwargs
    """

    def __init__(self, app_flash_off=None, board_type="", conn_check=False, debug=2, device_name="", dev_dbg=False,
                 dev_x86rq=False, dev_defaults=False, elfpath="", log_file=None, log_mult_files=False, oocd="",
                 oocd_args=None, oocd_mode="", oocd_ip="", port=43474, oocd_scripts="", toolchain_prefix="",
                 **kwargs):
        """

        Parameters
        ----------
        app_flash_off:int
        board_type:str
        conn_check:bool
        debug:int
        device_name:str
        dev_dbg:bool
        dev_x86rq:bool
        dev_defaults:bool
        elfpath:str
        log_file:str
        log_mult_files:bool
        oocd:str
        oocd_args:str
        oocd_mode:str
        oocd_ip:str
        port:int
        oocd_scripts:str
        toolchain_prefix:str
        """
        self.app_flash_off = app_flash_off
        self.board_type = board_type
        self.conn_check = conn_check
        self.debug = debug
        self.device_name = device_name
        self.dev_dbg = dev_dbg
        self.dev_x86rq = dev_x86rq
        self.dev_defaults = dev_defaults
        self.elfpath = elfpath
        self.log_file = log_file
        self.log_mult_files = log_mult_files
        self.oocd = oocd
        self.oocd_args = oocd_args
        self.oocd_mode = oocd_mode
        self.oocd_ip = oocd_ip
        self.port = port
        self.oocd_scripts = oocd_scripts
        self.toolchain_prefix = toolchain_prefix
        for key in kwargs:
            setattr(self, key, kwargs[key])
