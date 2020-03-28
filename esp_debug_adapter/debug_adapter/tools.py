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

import os
import sys
import time
from datetime import datetime
from . import log

PY3 = sys.version_info[0] == 3
PY2 = sys.version_info[0] == 2
WIN32 = sys.platform == "win32"

if WIN32:
    import win32api


class ObjFromDict(object):
    """
    @DynamicAttrs
    Turns a dictionary into a class
    """

    def __init__(self, dictionary):
        """Constructor"""
        for key in dictionary:
            setattr(self, key, dictionary[key])

    def __repr__(self):
        """"""
        return "<FromDict: %s>" % str(self.__dict__)

    def get_dict(self):
        return self.__dict__


def path_disassemble(in_path):
    """

    Parameters
    ----------
    in_path: str

    Returns
    -------
    win_drive: str
    path: str
    name: str
    extension: str
    exists: bool
    """
    path_abs = os.path.abspath(in_path)

    win_drive, tail = os.path.splitdrive(path_abs)
    path, f_ext = os.path.split(tail)
    name, extension = os.path.splitext(f_ext)
    exists = os.path.exists(path_abs)
    return win_drive, path, name, extension, exists


def get_good_path(srs_path):
    """

    Parameters
    ----------
    srs_path

    Returns
    -------
    srs_path
    """
    r = ""
    try:
        if not WIN32:
            r = str(srs_path)
        else:
            r = win32api.GetLongPathName(win32api.GetShortPathName(srs_path))
    except Exception as e:
        r = srs_path
    return r


class Measurement(object):
    def __init__(self):
        self.start = time.time()  # type: float
        self.end = None  # type: float
        self.time = None  # type: float

    def _ending(self):
        self.end = time.time()
        self.time = self.end - self.start

    def _logging(self, level):
        log.log("Measured %f s ( from ~ %s)" % (
            self.time,
            datetime.fromtimestamp(self.start).strftime("%H:%M:%S,%f")
        ), level)

    def _warning(self, warn_msg):
        log.warning("%s - Measured %f s ( from ~ %s)" % (
            warn_msg,
            self.time,
            datetime.fromtimestamp(self.start).strftime("%H:%M:%S,%f")))

    def stop(self):
        self._ending()
        self._logging(log.INFO)

    def stop_n_check(self, warn_time_thr, warn_msg="The operation took too long!"):
        """

        Parameters
        ----------
        warn_time_thr : float
            in seconds
        warn_msg : str
            in words

        Returns
        -------

        """
        self._ending()
        if self.time > warn_time_thr:
            self._warning(warn_msg)
            return True
        return False
