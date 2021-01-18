# Post mortem debug mode

The `ESP-IDF: Launch IDF Monitor for CoreDump / GDB-Stub Mode` command launches a ESP-IDF Monitor terminal listening for core-dump/gdbstub events on which will launch a debug session where you can send gdb commands to
the chip (without continue, pause or other debug steps).

> **NOTE:** The `ESP-IDF: Monitor your device` command will not launch a debug session.

# Using Core dump

[ESP-IDF Core Dump](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/core_dump.html#core-dump) needs to be configured by using `Core dump's Data destination` to either `UART` or `FLASH` using the `ESP-IDF: SDK Configuration Editor` or `idf.py menuconfig`.

# Using GDB Remote protocol server (GDBSTUB)

ESP-IDF implement a [panic handler](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/fatal-errors.html#panic-handler) to capture and print execution errors.
For GDB Stub, you need to use `ESP-IDF: SDK Configuration Editor` or `idf.py menuconfig` to select `Invoke GDBStub` in `Panic handler behaviour`.
