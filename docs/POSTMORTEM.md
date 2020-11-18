# Using Core dump

[ESP-IDF Core Dump](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/core_dump.html#core-dump) needs to be configured by using `Core dump's Data destination` either UART or FLASH in your project's sdkconfig or
using the `ESP-IDF: SDK Configuration Editor`.

# Using GDB Remote protocol server (GDBSTUB)

Sometimes a program cannot execute in a well-defined way. ESP-IDF implement a [panic handler](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/fatal-errors.html#panic-handler) to capture and print these errors.
For GDB Stub, you need to set `CONFIG_ESP_SYSTEM_PANIC_GDBSTUB` in sdkconfig or using the `ESP-IDF: SDK Configuration Editor` select `Invoke GDBStub` in `Panic handler behaviour`.

The `ESP-IDF: Launch IDF Monitor for CoreDump / GDB-Stub Mode` command launches a ESP-IDF Monitor terminal listening for core-dump/gdbstub events which will launch a debug session where you can send gdb commands to
the chip (without continue, pause or other debug steps). The `ESP-IDF: Monitor your device` command will not launch debug session on the former events.
