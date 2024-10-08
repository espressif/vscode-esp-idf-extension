# Using **gcov** to Provide Code Coverage

Source code coverage is data indicating the count and frequency of every program execution path that has been taken within a program’s runtime. [Gcov](https://en.wikipedia.org/wiki/Gcov) is a GCC tool that, when used in concert with the compiler, can generate log files indicating the execution count of each line of a source code.

Please read [GCOV Code coverage](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage) to learn more about code coverage with gcov in ESP-IDF projects.

## Requirements

Your ESP-IDF project should be configured to generate gcda/gcno coverage files using gcov as shown in [GCOV Code Coverage](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage). Please take a look at the [ESP-IDF gcov Example](https://github.com/espressif/esp-idf/tree/master/examples/system/gcov) as example project.

Make sure you had properly configure the toolchain in `idf.toolsPath` or in your environment variable PATH since the gcov executable used is `{TOOLCHAIN_PREFIX}-gcov` (replacing TOOLCHAIN_PREFIX for your IDF_TARGET toolchain prefix).

The **ESP-IDF: Configure Project SDKConfig for Coverage** command can set required values in your project SDKConfig to enable Code Coverage.

## Editor Coverage

For the text editor highlighting, the **ESP-IDF: Add Editor Coverage** command execute a child process with `{TOOLCHAIN_PREFIX}-gcov` to parse all gcda generated files and generate a JSON report. You can remove the coverage highlight with **ESP-IDF: Remove Editor Coverage**.

> **NOTE:** This assumes you had configure your extension with Xtensa or RISC-V toolchain in `idf.toolsPath`.

For the text editor, we use the json object generated by the previous command to highlight each line if it is covered or if it is not. We don't highlight noncode lines.

You can customize highlight color using the extension settings. Visual Studio code support `"red"`, `rgb(255,0,120)` or `rgba(120,0,0,0.1)` values.

- Covered lines use `idf.coveredLightTheme` for light themes and `idf.coveredDarkTheme` for dark themes.
- Partially covered lines use `idf.partialLightTheme` for light themes and `idf.partialDarkTheme` for dark themes.
- Non-covered lines use `idf.uncoveredLightTheme` for light themes and `idf.uncoveredDarkTheme` for dark themes.

## HTML report

The **ESP-IDF: Get HTML Coverage Report for Project** execute a child process with `{TOOLCHAIN_PREFIX}-gcov` to parse all gcda generated files for the HTML report.

> **NOTE:** This assumes you had configure your extension with Xtensa or RISC-V toolchain in `idf.toolsPath`.
