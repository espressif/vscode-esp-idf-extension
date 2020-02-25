# Start Modes and Arguments

## Minimal config

In minimal configuration is supposed you have the following set up:

*   Installed [OpenOCD_esp32](https://github.com/espressif/openocd-esp32)
*   Installed [Python](https://www.python.org)
*   Installed python dependencies from `requirements.txt` (`pip install -r requirements.txt`)
*   Variables set:
    *   $PATH: path/to/openocd/bin/folder (e.g. `%USERPROFILE%/esp/openocd-esp32/bin`)
    *   $OPENOCD_SCRIPTS: path/to/openocd/scripts (e.g. `%USERPROFILE%/esp/openocd-esp32/share/openocd/cripts`)
*   esp-wrover-kit connected to USB

To run execute

`debug_adapter_main.py -e PATH/2/ELF.elf`

After that connect to `localhost:43474` or `my.custom.i.p:43474` via any DAP compatible debugger (e.g. VSCode)

## Specific developer modes

For developers purposes there is following keys, setting up debugger to specific configuration

### --conn_check/-cc

Turn Adapter in mode handling only `initialize` request and then disconnecting - needed for testing

### --dev-defaults / -dd

Equals to run with:

`-d 5 -e "C:\esp\branches\vsc_adapter_testing\blink\build\blink.elf" -l ./debug.log`

### --dev-x86rq / -dr

Equals to run with:

`-d 5 -e './testing/target_x86_app/main' -om without_oocd -l debug.log`

### --dev_dbg / -dd

Launching with the main class `DebugAdapterTests` instead of  `DebugAdapter` (see `debug_adapter/tests/debug_adapter_tests_class.py`)
