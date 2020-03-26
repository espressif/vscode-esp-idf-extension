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

import click
from typing import Union

from .debug_adapter import A2VSC_STARTED_STRING, DebugAdapter, DaArgs
from .da_args import h, DaArgsDescriptor as DAD
from .tools import *


def load_dev_defaults(in_args):
    """
    -d 5 -p 43474 -e "C:/esp/branches/vsc_adapter_testing/blink/build/blink.elf" -l ./debug.log

    :param in_args:
    :return:
    """
    args = in_args
    if WIN32:
        args.debug = 5
        args.port = 43474
        # args.elfpath = os.path.join(idf_path, "examples", "get-started", "blink", "build", "blink.elf")
        args.elfpath = "C://ws//app//build//app-template.elf"
        # args.elfpath = "/media/agramakov/Win/esp/vsc_ws/app/build/app-template.elf"
        # args.elfpath = "C://Users//dongr//esp//esp-idf//examples//get-started//blink//build//blink.elf"
        args.log_file = "./debug.log"
        # args.log_mult_files = ""
    else:
        pass
    return args


def x86_test_mode(in_args):
    """

    Parameters
    ----------
    in_args:DaArgs

    Returns
    -------

    """
    args = in_args
    args.debug = 5
    args.log_file = "debug.log"
    args.oocd_mode = "without_oocd"
    args.toolchain_prefix = ""
    args.elfpath = ""
    return args


def connection_check_mode(in_args):
    args = in_args
    args.debug = 4
    args.port = 43474
    args.oocd_mode = "without_oocd"
    args.log_file = "debug.log"
    return args


# TODO Toolchain from "idf.xtensaEsp32Path" settings.json
# TODO xtensaEsp32Path -> xtensaEspToolchainPath, espToolchainPath
@click.command()
# Basic parameters:
@click.option(DAD.app_flash_off.cli_long_key, DAD.app_flash_off.cli_short_key, show_default=True,
              help=DAD.app_flash_off.help_str,
              default=DAD.app_flash_off.default_value,
              type=DAD.app_flash_off.implied_type)
@click.option(DAD.board_type.cli_long_key, DAD.board_type.cli_short_key, show_default=True,
              help=DAD.board_type.help_str,
              default=DAD.board_type.default_value,
              type=DAD.board_type.implied_type)  # TODO: move others to DaArgsDescriptor
@click.option('--debug', '-d', help=h['--debug'], type=Union[int], default=2, show_default=True)
@click.option('--device-name', '-dn', help=h['--device-name'], type=Union[str], default=None, show_default=True)
@click.option('--port', '-p', help=h['--port'], default=43474, show_default=True, type=Union[int])
#
# Specific modes:
@click.option('--conn-check', '-cc', help=h['--conn-check'], default=None, is_flag=True)
@click.option('--dev-dbg', '-ddbg', help=h['--dev-dbg'], default=None, is_flag=True)
@click.option('--dev-x86rq', '-dr', help=h['--dev-x86rq'], default=None, is_flag=True)
@click.option('--dev-defaults', '-dd', help=h['--dev-defaults'], default=None, is_flag=True)
#
# logging parameters:
@click.option('--log-file', '-l', help=h['--log-file'], type=Union[str])
@click.option('--log-mult-files', '-lm', help=h['--log-mult-files'], default=None, is_flag=True)
#
# GDB parameters:
@click.option('--toolchain-prefix', '-t', help=h['--toolchain-prefix'], type=Union[str], default=None,
              show_default=True)
@click.option('--elfpath', '-e', help=h['--elfpath'], default=None, type=Union[str])
#
# OpenOCD parameters:
@click.option('--oocd', '-o', help=h['--oocd'], default=os.environ.get("OPENOCD_BIN", "openocd"), show_default=True)
@click.option('--oocd-args', '-oa', help=h['--oocd-args'], default=None, show_default=True)
@click.option('--oocd-mode', '-om', help=h['--oocd-mode'],
              type=click.Choice(('run_and_connect', 'connect_to_instance', 'without_oocd')),
              default="connect_to_instance",
              show_default=True)
@click.option('--oocd-ip', '-ip', help=h['--oocd-ip'], default='localhost', show_default=True, type=Union[str])
@click.option('--oocd-scripts', '-s', help=h['--oocd-scripts'], default=None,
              show_default=True)
#
@click.pass_context
def cli(ctx,
        app_flash_off, board_type, conn_check, debug, device_name, dev_dbg, dev_x86rq, dev_defaults,
        elfpath, log_file, log_mult_files, oocd, oocd_args, oocd_mode, oocd_ip, port, oocd_scripts, toolchain_prefix):
    args_main = ObjFromDict(ctx.params)
    # Modificators
    if args_main.dev_defaults is not None:
        args_main = load_dev_defaults(args_main)
    if args_main.dev_x86rq is not None:
        args_main = x86_test_mode(args_main)
    if args_main.conn_check is not None:
        connection_check_mode(args_main)
    # Real work starts here
    dbg_a = DebugAdapter(args=args_main)
    dbg_a.log_cmd(A2VSC_STARTED_STRING)
    dbg_a.adapter_run()


if __name__ == '__main__':
    cli(sys.argv[1:])
