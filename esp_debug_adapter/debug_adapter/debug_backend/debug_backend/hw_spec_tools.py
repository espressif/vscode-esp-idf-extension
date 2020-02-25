import sys
import os

from .gdb import Gdb
from .oocd import Oocd
from .hw_specific import *

# useful if there is some variety of naming
hw_names = {
    "esp32s2beta": "Esp32_S2",
    "esp32s2_beta": "Esp32_S2",
    "esp32_s2beta": "Esp32_S2",
    "esp32_s2_beta": "Esp32_S2",
    "esp32s2": "Esp32_S2",
    "esp32-s2": "Esp32_S2",
    "esp32-s2beta": "Esp32_S2",
    "esp32-s2-beta": "Esp32_S2",
    "esp32s2-beta": "Esp32_S2",
    "esp_32": "Esp32",
    "esp-32": "Esp32",
}


def get_hw_list():
    hw_list = []
    p = os.path.dirname(__file__)
    files = os.listdir(os.path.join(p, "hw_specific"))
    for f in files:
        hw_list.append(os.path.splitext(f)[0])
    return hw_list


def _str_to_class(classname):
    return getattr(sys.modules[__name__], classname)


def get_good_name(some_name):
    """

    Parameters
    ----------
    some_name str - some name to check

    Returns
    -------
    str  - good name, recognizable by the Backend
    """
    good_name = ""  # empty string by default
    if  (some_name is None) or (not len(some_name)):  # if chip_name not make sense
        return good_name
    better_name = hw_names.get(some_name.strip().lower(), some_name)  # if there is no conversion - keep it
    hw_list = get_hw_list()
    for hw in hw_list:
        if better_name.lower() == hw.lower():  # lower for being case insensitive
            good_name = hw
            break
        # if nothing was found - stays ""
    return good_name


def get_gdb(chip_name=None,
            gdb_path=None,
            log_level=None,
            log_stream_handler=None,
            log_file_handler=None,
            log_gdb_proc_file=None,
            remote_target=None,
            remote_address=None,
            remote_port=None, **kwargs):
    """
    set to != None value to redefine get_gdb logic

    Parameters
    ----------
    chip_name : Any(None, str)
    gdb_path : Any(None, str)
    log_level : Any(None, str)
    log_stream_handler : Any(None, str)
    log_file_handler : Any(None, str)
    log_gdb_proc_file : Any(None, str)
    remote_target : Any(None, str)
    remote_address : Any(None, str)
    remote_port : Any(None, str)

    Returns
    -------
    Gdb
    """
    _gdb = _str_to_class("Gdb" + get_good_name(chip_name))
    return _gdb(gdb_path=gdb_path,
                log_level=log_level,
                log_stream_handler=log_stream_handler,
                log_file_handler=log_file_handler,
                log_gdb_proc_file=log_gdb_proc_file,
                remote_target=remote_target,
                remote_address=remote_address,
                remote_port=remote_port, **kwargs)


def get_oocd(chip_name=None,
             oocd_exec=None,
             oocd_scripts=None,
             oocd_args=None,
             ip=None,
             log_level=None,
             log_stream_handler=None,
             log_file_handler=None,
             **kwargs):
    """
    set to != None value to redefine get_gdb logic

    Parameters
    ----------
    chip_name : Any(None, str)
    oocd_exec : Any(None, str)
    oocd_scripts : Any(None, str)
    oocd_args : Any(None, str)
    ip : Any(None, str)
    log_level : Any(None, str)
    log_stream_handler : Any(None, str)
    log_file_handler : Any(None, str)

    Returns
    -------
    Any
    """
    _oocd = _str_to_class("Oocd" + get_good_name(chip_name))
    return _oocd(chip_name=chip_name,
                 oocd_exec=oocd_exec,
                 oocd_scripts=oocd_scripts,
                 oocd_args=oocd_args,
                 ip=ip,
                 log_level=log_level,
                 log_stream_handler=log_stream_handler,
                 log_file_handler=log_file_handler, **kwargs)
