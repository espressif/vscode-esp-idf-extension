# Using this extension on Windows Subsystem for Linux (WSL)

We have tested this extension using Windows 10 Build 19041 with WSL 2 with the Microsoft's Ubuntu 20.04 distribution for WSL.

Currently in WSL 2, we have no access to serial ports. Calling `powershell.exe` from distribution's shell we obtain serial ports and perform flash and monitor tasks.

## Limitations

- Currently Python is also required in Windows machine.
- Based on build 17063, sharing environment variables between WSL and Windows is done with a single environment variable `WSLENV` which translates WSL paths to Windows paths and viceversa. We have tried to include tools like `xtensa-esp32-elf-gcc` in PATH without success. (If you can make it work, please contribute with a pull request). This issue makes certain features not to work in WSL like `xtensa-esp32-elf-addr2line` in ESP-IDF Monitor.

## WSL extension setup

1. Install ESP-IDF requirements for linux (also pip and venv which doesn't come by default on microsoft WSL distribution of Ubuntu).

```
sudo apt-get install git wget flex bison gperf python3-pip python3-venv python3-setuptools cmake ninja-build ccache libffi-dev libssl-dev dfu-util
```

2. Configure the extension as explained in [SETUP](./SETUP.md).

3. Create a ESP-IDF project and use extension features.
