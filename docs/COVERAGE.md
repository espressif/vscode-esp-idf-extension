## Using Gcov and Gcovr to provide code coverage

# Requirements

Your ESP-IDF project should be configured to generate gcda/gcno coverage files using gcov. Please take a look at the [ESP-IDF gcov example](https://github.com/espressif/esp-idf/tree/master/examples/system/gcov) to see how to set up your project.

This extension also requires `gcovr` to generate JSON and HTML reports from generated files. This is installed as Python dependencies when following the **ESP-IDF: Configure ESP-IDF extension** command.
Please take a look at [ONBOARDING](./docs/ONBOARDING.md) for more information.

Make sure you have properly configure xtensa toolchain in your PATH since the gcov executable used is `xtensa-esp32-elf-gcov` and `gcovr` exists in your `${idf.pythonBinPath}`.

## Editor Coverage

For the text editor highlighting, we use `gcovr -r . --gcov-executable xtensa-eslp-elf-gcov --json` and `gcovr -r . --gcov-executable xtensa-eslp-elf-gcov --html` for the HTML report.
