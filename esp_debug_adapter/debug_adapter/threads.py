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

import threading
import json
import psutil
import itertools
from . import base_schema, log
from .tools import PY3

if PY3:
    _next_seq = itertools.count().__next__
else:
    _next_seq = itertools.count().next


class KillerThread(threading.Thread):
    def __init__(self):
        self._to_kill = []
        threading.Thread.__init__(self, name="Killer")

    @staticmethod
    def kill_outer_proc(name):
        pid_list = psutil.pids()
        for pid in pid_list:
            p = psutil.Process(pid)
            if p.name() == name:
                p.kill()

    def kill(self, to_kill):
        if to_kill is not []:
            self._to_kill = to_kill
            self.start()

    def run(self):
        for name in self._to_kill:
            try:
                self.kill_outer_proc(name)
            except Exception as e:
                print(e)


class ReaderThread(threading.Thread):
    def __init__(self, stream, process_command):
        self._stop = False
        self._logger = log.new_logger("Debug Adapter (ReaderThread)")
        self.stream = stream  # stream to read
        self.process_command = process_command
        threading.Thread.__init__(self, name="ReaderThread")

    def run(self):
        try:
            while not self._stop:
                data = self.read()
                if data is None:  # hence, EOF
                    break
                protocol_message = base_schema.from_dict(data)
                self.process_command(protocol_message)
        except Exception as e:
            if e == SystemExit:
                return
            log.debug_exception(e)

    def read(self):
        """
        Reads one message from the stream and returns the related dict (or None if EOF was reached).
        """
        headers = {}
        while True:
            # Interpret the http protocol headers
            line = self.stream.readline()  # The trailing \r\n should be there.
            if not line:  # EOF
                self._logger.debug("EOF")
                return None
            self._logger.debug('read line: >>%s<<\n' % (line.replace(b'\r', b'\\r').replace(b'\n', b'\\n')), )
            line = line.strip().decode('ascii')
            if not line:  # Read just a new line without any contents
                break
            try:
                name, value = line.split(': ', 1)
            except ValueError:
                raise RuntimeError('invalid header line: {}'.format(line))
            headers[name] = value

        if not headers:
            raise RuntimeError('got message without headers')

        size = int(headers['Content-Length'])

        # Get the actual json
        body = self.stream.read(size)

        return json.loads(body.decode('utf-8'))


class WriterThread(threading.Thread):
    def __init__(self, stream, queue):
        self._stop = False
        self._logger = log.new_logger("Debug Adapter (WriterThread)")
        self.stream = stream
        self.queue = queue
        threading.Thread.__init__(self, name="WriterThread")

    def run(self):
        try:
            while not self._stop:
                to_write = self.queue.get()
                to_json = getattr(to_write, 'to_json', None)
                if to_json is not None:
                    # Some protocol message
                    to_write.seq = _next_seq()
                    try:
                        to_write = to_json()
                    except Exception as e:
                        log.debug_exception(e)
                        log.debug_exception('Error serializing %s to json.' % (to_write,))
                        continue

                self._logger.debug('Writing: %s\n' % (to_write,))

                if to_write.__class__ == bytes:
                    as_bytes = to_write
                else:
                    as_bytes = to_write.encode('utf-8')

                self.stream.write(b'Content-Length: %d\r\n\r\n' % (len(as_bytes)))
                self.stream.write(as_bytes)
                self.stream.flush()
        except Exception as e:
            log.debug_exception(e)
