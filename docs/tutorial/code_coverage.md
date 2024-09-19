# Setting Up Code Coverage in your Project

## Requirements

Your ESP-IDF project should be configured to generate `gcda/gcno` coverage files using `gcov`. Please read [GCOV Code Coverage](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage) to learn more about code coverage with GCOV in ESP-IDF projects.

Please take a look at [Coverage](../COVERAGE.md) for more information about code coverage in this extension.

## Steps to Enable Code Coverage

Let's use the ESP-IDF [GCOV Example](https://github.com/espressif/esp-idf/tree/master/examples/system/gcov) for this tutorial.

1. Click menu View -> Command Palette... and type **ESP-IDF: Show Examples Projects** and choose `Use Current ESP-IDF (/path/to/esp-idf)`. If you don't see the option, please review the setup in [Install tutorial](./install.md).

2. A window will be open with a list a projects, go the **system** section and choose the `gcov`. You will see a **Create Project Using Example gcov** button in the top and a description of the project below. Click **Create Project Using Example GCOV** button.

<p>
  <img src="../../media/tutorials/coverage/gcov_example.png" alt="GCov example" height="500">
</p>

3. Now select a container directory where to copy the example project. For example, if you choose `/Users/myUser/someFolder` the resulting folder will be `/Users/myUser/someFolder/gcov`. This new project directory will be created and opened in Visual Studio Code.

4. First you should select an Espressif target (esp32, esp32s2, etc.) with the **ESP-IDF: Set Espressif Device Target** command. Default is `esp32` and the one used in this tutorial.

5. Next configure your sdkconfig project with the **ESP-IDF: Configure Project SDKConfig for Coverage** command or by yourself using the **ESP-IDF: SDK Configuration Editor** command (<kbd>CTRL</kbd> <kbd>E</kbd> <kbd>G</kbd> keyboard shortcut ) where you can modify the ESP-IDF project settings. After all changes are made, click save and close this window.

<p>
  <img src="../../media/tutorials/basic_use/gui_menuconfig.png" alt="GUI Menuconfig" height="500">
</p>

The example will enable the following options by default:

- Enable the Application Tracing Module under `Component Config -> Application Level Tracing -> Data Destination` by choosing `Trace Memory`.
- Enable GCOV to host interface under `Component Config -> Application Level Tracing -> GCOV to Host Enable`.
- Enable OpenOCD Debug Stubs under `Component Config -> ESP32-specific -> OpenOCD Debug Stubs`

> **NOTE:** For any project that you want to generate code coverage, you should enable these settings in your sdkconfig.

6. Now to build the project, flash your device and start the ESP-IDF Monitor you can use the **ESP-IDF: Build your Project**, **ESP-IDF: Flash your Project** and **ESP-IDF: Monitor Device** commands as explained in the [Basic use tutorial](./basic_use.md). If everything is executed correctly, there will be a message in ESP-IDF Monitor saying `Ready to dump GCOV data...`

> **NOTE:** There is also a **ESP-IDF: Build, Flash and Start a Monitor on your Device** command (<kbd>CTRL</kbd> <kbd>E</kbd> <kbd>D</kbd> keyboard shortcut).

7. Next step is to launch OpenOCD and send some commands. To start openOCD from the extension, execute the **ESP-IDF: OpenOCD Manager** command or from the `OpenOCD Server (Running | Stopped)` button in the Visual Studio Code status bar. OpenOCD server output is shown in menu `View` -> `Output` -> `ESP-IDF`.

8. Launch a new terminal with menu Terminal -> New Terminal and execute `telnet <oocd_host> <oocd_port>` which by default is `telnet localhost 4444`. Latest macOS users can use `nc <oocd_host> <oocd_port>` if `telnet` is not in the system.

> **NOTE:** you can modify `openocd.tcl.host` and `openocd.tcl.port` configuration settings to modify these values. Please review [ESP-IDF Settings](../SETTINGS.md) to see how to modify these configuration settings.

9. First send the OpenOCD command `esp gcov dump` for hard-coded dump which will dump two hard-coded dumps based on this example. After that send the `esp gcov` command for instant run-time dump.

<p>
  <img src="../../media/tutorials/coverage/oocd_cmds.png" alt="OpenOCD Commands" width="950">
</p>

10. After dumping data one or more times, open the desired file in your editor and execute the **ESP-IDF: Add Editor Coverage** command to highlight the editor with code coverage.

You can customize highlight color using these extension settings:

- Covered lines use `idf.coveredLightTheme` for light themes and `idf.coveredDarkTheme` for dark themes.
- Partially covered lines use `idf.partialLightTheme` for light themes and `idf.partialDarkTheme` for dark themes.
- Non-covered lines use `idf.uncoveredLightTheme` for light themes and `idf.uncoveredDarkTheme` for dark themes.

Visual Studio code support `"red"`, `rgb(255,0,120)` or `rgba(120,0,0,0.1)`.
Please review [Settings](../SETTINGS.md) to see how to modify these configuration settings.

<p>
  <img src="../../media/tutorials/coverage/editor_coverage.png" alt="Editor coverage" width="950">
</p>

11. When finished, use the **ESP-IDF: Remove Editor Coverage** command to remove the code coverage.

12. You can generate a html report using the **ESP-IDF: Get HTML Coverage Report for Project** command.

<p>
  <img src="../../media/tutorials/coverage/html_report.png" alt="html report" width="950">
</p>

## Troubleshooting

Make sure you had properly configure the required toolchain in `idf.toolsPath` or in your environment variable PATH since the GCOV executable used is `{TOOLCHAIN_PREFIX}-gcov` (replacing `TOOLCHAIN_PREFIX` for your `IDF_TARGET` toolchain prefix).

An easy way is to verify this is to execute **ESP-IDF: Open ESP-IDF Terminal** and type `{TOOLCHAIN_PREFIX}-gcov --version`.
