# Debugging

> **NOTE:** Make sure to configure your drivers as mentioned in ESP-IDF [Configure JTAG Interface](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/configure-ft2232h-jtag.html) documentation.

This tutorial shows you how to debug ESP-IDF projects using the Visual Studio Code extension for ESP-IDF. If you haven't configured the extension as explained in [Install tutorial](./install.md) please do it first.

1. Configure, build and flash your project as explained in [Basic use tutorial](./basic_use.md).
2. Set the proper values for OpenOCD Configuration files in the `idf.openOCDConfigs` configuration setting. You can choose a specific board listed in OpenOCD using **ESP-IDF: Select OpenOCD Board Configuration** or **ESP-IDF: Set Espressif Device Target**.

> **NOTE:** Please take a look at [Configuring of OpenOCD for specific target](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/jtag-debugging/tips-and-quirks.html#configuration-of-openocd-for-specific-target) for more information about these configuration files.

3. With the blink example folder open in your visual studio code window, press F5.

Several steps will be automatically done for you but explained for clarity. You can skip to step 6 to continue the debug tutorial part.

4. OpenOCD server is launched in the background and the output is shown in menu `View` -> Output -> ESP-IDF. By default it will be launched using localhost, port `4444` for Telnet communication, port `6666` for TCL communication and port `3333` for gdb.

> **NOTE:** You can start or stop the OpenOCD from Visual Studio Code using the **ESP-IDF: OpenOCD Manager** command or from the `OpenOCD Server (Running | Stopped)` button in the visual studio code status bar.

> **NOTE:** You can modify `openocd.tcl.host` and `openocd.tcl.port` configuration settings to modify these values. You can also set `idf.openOcdDebugLevel` to lower or increase (0-4) the messages from OpenOCD in the OpenOCD output. Please review [ESP-IDF Settings](../SETTINGS.md) to see how to modify these configuration settings.

5. The [Eclipse CDT GDB Adapter](https://github.com/eclipse-cdt-cloud/cdt-gdb-adapter) is launched in the background and the output is shown in the Debug Console. This adapter is a proxy between Visual Studio Code, configured toolchain GDB and OpenOCD server. Please review [Debugging](../DEBUGGING.md) for more information how to customize the debugging behavior by modifying launch.json arguments.

6. The debug session will start after the debug adapter server is launched and ready.

<p>
  <img src="../../media/tutorials/debug/init_halted.png" alt="Initial halted" height="500">
</p>

# Setting a custom application image offset

If you modify the application image offset you need to modify openOCD launch arguments to update the application image offset. This can happens if OpenOCD output (Menu View -> Output -> `ESP-IDF`) shows an error like this:

```
 Failed to get flash maps (-6)!\n❌ Error: Failed to get flash maps (-6)!\nWarn : Application image is invalid! Check configured binary flash offset 'appimage_offset'.
```

To update openOCD launch arguments, open the project's `settings.json` and add or modify:

```json
{
  "idf.openOcdLaunchArgs": [
    "-c",
    "init",
    "-c",
    "reset halt",
    "-c",
    "esp appimage_offset 0x20000"
  ]
}
```

where ``0x20000`` is your application image offset used in the partition table.

# Navigating Through the Code, Call Stack and Threads

7. When the target is halted, the editor will show the line of code where the program halted and the list of threads in the `Call Stack` sub-window `(a)` on the `Run` icon in the Activity Bar on the side of Visual Studio Code. The first line of call stack under main `(b)` contains the last called function `app_main()`, which in turned was called from `main_task()` as shown in the previous image. Each line of the stack also contains the file name and line number `(c)` where the function was called. By clicking on each of the stack entries, you will see the file opened.

By expanding threads you can navigate throughout the application. Some threads contains much longer call stack where you can see, besides function calls, numbers like `0x4000bff0` representing address of binary code not provided in source form.

<p>
  <img src="../../media/tutorials/debug/thread5.png" alt="Threads"  height="500">
</p>

Go back to the `app_main()` in Thread #1 to familiar code of blink.c file that will be examined in more details in the following examples. Debugger makes it easy to navigate through the code of entire application. This comes handy when stepping through the code and working with breakpoints and will be discussed below.

# Setting and Clearing Breakpoints

When debugging, we would like to be able to stop the application at critical lines of code and then examine the state of specific variables, memory and registers / peripherals. To do so we are using breakpoints. They provide a convenient way to quickly get to and halt the application at specific line.

8. Let’s establish two breakpoints when the state of LED changes. Based on the code listing above, this happens at lines 57 and 80. To set a breakpoint, go to the desired line and press F9 or click on the circle shown next to the line number (editor margin).
   The list of breakpoints is shown in the `Breakpoints` sub-window on the `Run` icon in the Activity Bar on the side of Visual Studio Code.

> **NOTE:** Consider that ESP32 has a maximum of 2 hardware breakpoints. Please look at [ESP-IDF Debugging tips: Breakpoints](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-breakpoints) for more information.

<p>
  <img src="../../media/tutorials/debug/breakpoint.png" alt="breakpoint" height="500">
</p>

The Visual Studio Code shows a **Debug toolbar** on the top of the editor with several actions as explained in [Visual Studio Code Debug Actions](https://code.visualstudio.com/docs/editor/debugging#_debug-actions).

9. If you press F5 (Continue/Pause) the processor will run and halt at the next breakpoint. If you press F5 again, it will stop at the next breakpoint and so on. you will be able to see that LED is changing the state after each click to "Continue" program execution.

# Halting the Target Manually

Read more about breakpoints under [breakpoints and watchpoints available](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-breakpoints) and [what else should i know about breakpoints?](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-where-breakpoints)

10. When debugging, you may resume application and enter code waiting for some event or staying in infinite loop without any break points defined. In such case, to go back to debugging mode, you can break program execution manually by pressing "Continue/Pause" button. To check it, delete all breakpoints and click "Continue". Then click “Pause”. Application will be halted at some random point and LED will stop blinking.

It is also possible to step through the code using “Step Into (F11)” and “Step Over (F10)” commands. The difference is that “Step Into (F11)” is entering inside subroutines calls, while “Step Over (F10)” steps over the call, treating it as a single source line.

Before being able to demonstrate this functionality, using information discussed in previous paragraph, make sure that you have only one breakpoint defined at line 57 of `blink.c`.

11. Resume program by entering pressing F5 and let it halt. Now press “Step Over (F10)”, one by one couple of times, to see how debugger is stepping one program line at a time.

<p>
  <img src="../../media/tutorials/debug/step_over.png" alt="Step over" height="500">
</p>

# Stepping Through the Code

12. If you press “Step Into (F11)” instead, then debugger will step inside subroutine call.

<p>
  <img src="../../media/tutorials/debug/step_into.png" alt="Step into" height="500">
</p>

13. If you press “Step Out (Shift + F11)” instead, then debugger will step outside the subroutine call.

<p>
  <img src="../../media/tutorials/debug/step_out.png" alt="Step out" height="500">
</p>

In this particular case debugger stepped inside `vTaskDelay(CONFIG_BLINK_PERIOD / portTICK_PERIOD_MS)` and effectively moved to `tasks.c` code. See [Why stepping with “next” does not bypass subroutine calls?](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-why-next-works-as-step) for potential limitations using the `next` command.

# Watching and Setting Program Variables

A common debugging tasks is checking the value of a program variable as the program runs. To be able to demonstrate this functionality, update file `blink.c` by adding a declaration of a global variable int i above definition of function `blink_task`. Then add `i++` inside `while(1)` of this function to get `i` incremented on each blink.

14. Stop debugging by pressing "Stop (Shift + F5)". Build and flash the code to the ESP and restart the debugger by pressing F5. Once the application is halted, set a breakpoint in the line where `i++` is.

15. Next in the `Watch` sub-window on the `Run` icon in the Activity Bar on the side of Visual Studio Code, click the `+` and enter `i` to start watching its value.

16. Continue the program execution by pressing F5. Each time the program is halted, you will see `i` being incremented.

<p>
  <img src="../../media/tutorials/debug/watch_set_program_vars.png" alt="Watch program variables" height="500">
</p>

# Setting Conditional Breakpoint

You can also set a breakpoint to halt the program execution if a certain condition is satisfied. See [Visual Studio Code conditional breakpoints](https://code.visualstudio.com/docs/editor/debugging#_conditional-breakpoints).

To set a new conditional breakpoint, go to the desired line and right click on the circle shown next to the line number (editor margin) and select `Add Conditional Breakpoint` action. You can also modify a breakpoint to add a condition in the list of breakpoints in the `Breakpoints` sub-window on the `Run` icon in the Activity Bar on the side of Visual Studio Code. Click the `pencil` icon on the breakpoint and set the breakpoint condition.

For this example, go to line 79 and right click on the circle shown next to the line number (editor margin) and select `Add Conditional Breakpoint` action and set `i=2`. When you start the debug, it will stop on line 79 when `i` has value of 2.

<p>
  <img src="../../media/tutorials/debug/conditional_breakpoint.png" alt="Watch program variables" height="500">
</p>

# Disassembly view

You can check the assembly code from the debugging session by doing a right click in any line in of source code file and pressing `Open Disassembly View`. This will open the **Disassemble View** showing the assembly code with C code where you can set breakpoints too.

<p>
  <img src="../../media/tutorials/debug/disassembly_view.png" alt="Disassembly view" height="500">
</p>

# Watchpoints (Data Breakpoints)

See [ESP-IDF breakpoints and watchpoints available](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#breakpoints-and-watchpoints-available) for more information.

# Next steps

You can send any GDB commands in the Debug console with `> COMMAND`. For example `> i threads`.

<p>
  <img src="../../media/tutorials/debug/gdb_commands.png" alt="GDB Commands" height="500">
</p>

More about [Command Line Debugging](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/debugging-examples.html#command-line).

Our extension implements a `ESP-IDF: Peripheral View` tree view in the `Run and Debug` view which will use the SVD file defined in the `IDF Svd File Path (idf.svdFilePath)` configuration setting in [settings.json](../SETTINGS.md) to populate a set of peripherals registers values for the active debug session target. You could download Espressif SVD files from [Espressif SVD](https://github.com/espressif/svd) repository.

<p>
  <img src="../../media/tutorials/debug/peripheral_viewer.png" alt="GDB Commands" height="500">
</p>

You can start a monitor session that can capture fatal error events with `ESP-IDF: Launch IDF Monitor for CoreDump / GDB-Stub Mode` command and, if configured in your project's sdkconfig, trigger the start of a debug session for GDB remote protocol server (GDBStub) or [ESP-IDF Core Dump](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/core_dump.html#core-dump) when an error is found. Read more in the [panic handler documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/fatal-errors.html#panic-handler).

- **Core Dump** is configured when `Core Dump's Data Destination` is set to either `UART` or `FLASH` using the `ESP-IDF: SDK Configuration Editor` extension command or `idf.py menuconfig` in a terminal.
- **GDB Stub** is configured when `Panic Handler Behaviour` is set to `Invoke GDBStub` using the`ESP-IDF: SDK Configuration Editor` extension command or `idf.py menuconfig` in a terminal.

you can modify the debug session as shown in the [Debugging](../DEBUGGING.md) documentation by customizing launch.json arguments such as custom initial gdb commands.

See other [ESP-IDF extension features](../FEATURES.md).
