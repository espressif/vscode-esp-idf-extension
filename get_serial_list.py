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
    print 'Import has failed. Make sure pyserial is installed.'
    sys.exit(1)
print([comport.device for comport in serial.tools.list_ports.comports()])
