# Copyright 2019 Espressif Systems (Shanghai) CO LTD
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

""" Lists serial port names

    :raises ImportError:
        When pyserial is not installed.
    :returns:
        A list of the serial ports available on the system
"""
import sys
try:
    import serial.tools.list_ports
except ImportError:
    print('Import has failed. Make sure pyserial is installed.')
    sys.exit(1)
print([comport.device for comport in serial.tools.list_ports.comports()])
