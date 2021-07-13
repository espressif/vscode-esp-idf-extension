---
name: Bug report
about: Create a report to help us improve
title: "[Bug Report]: "
labels: "bug-report"
---

**Pre Bug Report Checklist**
Before reporting any bug please make sure of these points.

- [ ] Make sure you have searched for existing bugs and features request before you post an issue.
- [ ] This is a bug report for the ESP-IDF Visual Studio Code extension and **not** an ESP-IDF bug report.
- [ ] I've read the docs and found no information that could have helped solving the issue.

**Describe the bug**
A clear and concise description of what the bug is (current behavior).

**To Reproduce**
Steps to reproduce the behavior (including the full log).

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment (please complete the following information):**

- OS Name & Version: [e.g. MacOS X 10.14.5]
- VSCode Version: [e.g. 1.35.1]
- ESP-IDF Version: [e.g. v3.2.2]
- Python Version: [e.g. 2.7.10]

> **NOTE**: You can use the `ESP-IDF: Doctor command` to generate a report of your configuration.

**Output**

Click the menu `View` and select `Output`. This extension uses several output channels: ESP-IDF, ESP-IDF Debug Adapter, Heap Trace, OpenOCD and SDK Configuration Editor.

Please share the output of the channel related to your issue. For example ESP-IDF is used mostly for the extension setup process.

**Logs**
If applicable, please share the log file which can be obtained from

- Windows: `%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION\esp_idf_vsc_ext.log`
- Linux & MacOSX: `$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/esp_idf_vsc_ext.log`

**Extension Configuration settings**
Open Command Palette (F1 or View Menu -> Command Palette) and type `Preferences: Open Settings (JSON)` or use `{CURRENT_PROJECT}/.vscode/settings.json` to get the following extension configuration settings value:

- `idf.espIdfPath` (MacOS or Linux) or `idf.espIdfPathWin` (Windows) also called `Path to locate ESP-IDF framework (IDF_PATH)` in `Preferences: Open Settings (UI)`.
- `idf.pythonBinPath` (MacOS or Linux) or `idf.pythonBinPathWin` (Windows) also called `Python absolute binary path used to execute ESP-IDF Python Scripts` in `Preferences: Open Settings (UI)`.
- `idf.openOcdConfigs` also called `List of configuration files inside OpenOCD Scripts directory` in `Preferences: Open Settings (UI)`.
- `idf.customExtraPaths` also called `Paths to be appended to PATH` in `Preferences: Open Settings (UI)`.
- `idf.customExtraVars` also called `Variables to be added to system environment variables` in `Preferences: Open Settings (UI)`.
- `idf.adapterTargetName` also called `Target name for ESP-IDF Debug Adapter` in `Preferences: Open Settings (UI)`.
- `idf.customAdapterTargetName` is used when `idf.adapterTargetName` is set to `custom`.

**Additional context**
Add any other context about the problem here.
