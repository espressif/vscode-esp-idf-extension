# Using this extension on Windows Subsystem for Linux (WSL)

> **NOTE**: On WSL 1 serial ports are available so the behavior doesn't change from regular Linux extension environment.

This extension was tested in Windows 10 Build 19041 with the Microsoft's Ubuntu 20.04 distribution for WSL 2.

Currently in WSL 2, there is no access to serial ports. Calling `powershell.exe` from distribution's shell we obtain serial ports and perform flash and monitor tasks.

## Limitations

- Currently Python is also required in Windows machine and available in environment PATH as `python`.
- Based on build 17063, sharing environment variables between WSL and Windows is done with a single environment variable `WSLENV` which translates WSL paths to Windows paths and viceversa. We have tried to include tools like `xtensa-esp32-elf-gcc` in PATH without success. (If you can make it work, please contribute with a pull request). This issue makes certain features not to work in WSL like `xtensa-esp32-elf-addr2line` in ESP-IDF Monitor.

## WSL extension setup

1. Install ESP-IDF requirements for linux (also pip and venv which doesn't come by default on microsoft WSL distribution of Ubuntu).

```
sudo apt-get install git wget flex bison gperf python3-pip python3-venv python3-setuptools cmake ninja-build ccache libffi-dev libssl-dev dfu-util
```

> **NOTE: ** The user might need to install pip in the virtual environment like: `$IDF_TOOLS_PATH/python_env/idf4.2_py3.8_env/bin/python ./get-pip.py`.

2. Configure the extension as explained in [SETUP](./SETUP.md).

3. Create an ESP-IDF project and use extension features.
