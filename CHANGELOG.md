<a href="https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension">
  <img src="./media/espressif_icon.png" alt="espressif logo" title="Espressif" align="right" height="30" />
</a>

# [ESP-IDF VS Code Extension's](http://github.com/espressif/vscode-esp-idf-extension) Changelog

---

All notable changes to the "Espressif IDF" extension will be documented in this file.

## [1.7.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.7.0)

### Features and enhancements

- [Update extension initial autoconfiguration](https://github.com/espressif/vscode-esp-idf-extension/pull/1075)
- [Add Commands tree view in Espressif explorer](https://github.com/espressif/vscode-esp-idf-extension/pull/1081)
- [Update OpenOCD boards filtered by selected IDF target](https://github.com/espressif/vscode-esp-idf-extension/pull/1079)
- [Documentation commands name consistency](https://github.com/espressif/vscode-esp-idf-extension/pull/1082)
- [Add new notification mode: Output, Notification, All, Silent](https://github.com/espressif/vscode-esp-idf-extension/pull/1087)
- [Remove gcovr dependency, implement GCOV html report and UI coverage from toolchain gcov](https://github.com/espressif/vscode-esp-idf-extension/pull/1099)
- [Add ESP-IDF Unit Testing with Pytest-Embeded in vscode extension tests UI](https://github.com/espressif/vscode-esp-idf-extension/pull/1013)
- [Add esp32c2 esp32h2 IDF targets to extension](https://github.com/espressif/vscode-esp-idf-extension/pull/1112)
- [Remove Microsoft C/C++ from extension dependencies](https://github.com/espressif/vscode-esp-idf-extension/pull/1103)
- [Add ESP-IDF SBOM check command](https://github.com/espressif/vscode-esp-idf-extension/pull/1094)

### Bug Fixes

- [Update application insights](https://github.com/espressif/vscode-esp-idf-extension/pull/1069)
- [Remove video link from changelog](https://github.com/espressif/vscode-esp-idf-extension/pull/1071)
- [Fix esp32h2 in set target command](https://github.com/espressif/vscode-esp-idf-extension/pull/1057)
- [Fix for env PATH variable reference](https://github.com/espressif/vscode-esp-idf-extension/pull/1093) Thanks @dyarkovoy
- [Fix for qemu workspace reference](https://github.com/espressif/vscode-esp-idf-extension/pull/1097) Thanks @dyarkovoy
- [Fix sdkconfig defaults in build arguments](https://github.com/espressif/vscode-esp-idf-extension/pull/1077)
- [Fix duplicated python executable in setup UI, Add Windows compiler path fix](https://github.com/espressif/vscode-esp-idf-extension/pull/1084)
- [Migration to vue 3 and UI fixes](https://github.com/espressif/vscode-esp-idf-extension/pull/1035)
- [Update docker templates to latest esp-idf version](https://github.com/espressif/vscode-esp-idf-extension/pull/1109)
- [Fix tar.xz install from extension, show or hide progress notification based idf.notificationMode setting](https://github.com/espressif/vscode-esp-idf-extension/pull/1118)

## [1.6.5](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.6.5)

### Features and enhancements

- [Add execPath as configuration variable substitution](https://github.com/espressif/vscode-esp-idf-extension/pull/1003)
- [Add manual testing report documentation](https://github.com/espressif/vscode-esp-idf-extension/pull/1023)
- [Create a project from external components](https://github.com/espressif/vscode-esp-idf-extension/pull/994)
- [Add precommit linter](https://github.com/espressif/vscode-esp-idf-extension/pull/1034)
- [Mention windows keyboard shortcut install documentation](https://github.com/espressif/vscode-esp-idf-extension/pull/1046)

### Bug Fixes

- [Change compiler path to relative path in c_cpp_properties.json](https://github.com/espressif/vscode-esp-idf-extension/pull/1012)
- [Update template tasks.json regex](https://github.com/espressif/vscode-esp-idf-extension/pull/1014)
- [USe Python 3.8.7 for ESP-IDF < 5.0](https://github.com/espressif/vscode-esp-idf-extension/pull/1021)
- [Remove IDF component manager from extension requirements.txt](https://github.com/espressif/vscode-esp-idf-extension/pull/1048)
- [Add IDF Size fix for ESP-IDF 5.1 or newer](https://github.com/espressif/vscode-esp-idf-extension/pull/1039)
- [Disable ESP-Matter commands for Windows](https://github.com/espressif/vscode-esp-idf-extension/pull/1052)

## [1.6.4](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.6.4)

### Features and enhancements

- [Add IDF Target to project configuration editor](https://github.com/espressif/vscode-esp-idf-extension/pull/983)
- [Add ESP-IDF Rainmaker download and build support](https://github.com/espressif/vscode-esp-idf-extension/pull/988)
- [Add IDF Monitor timestamps settings](https://github.com/espressif/vscode-esp-idf-extension/pull/989) Thanks @boarchuz !
- [Add gitee mirrors for git cloning when using Espressif Download Server](https://github.com/espressif/vscode-esp-idf-extension/pull/972)

### Bug Fixes

- [Fix resolve task manager](https://github.com/espressif/vscode-esp-idf-extension/pull/982)
- [Increase input width in sdk configuration editor](https://github.com/espressif/vscode-esp-idf-extension/pull/991)
- [Update debug adapter breakpoint on running debug session](https://github.com/espressif/vscode-esp-idf-extension/pull/997)
- [Update IDF embed git and python versions](https://github.com/espressif/vscode-esp-idf-extension/pull/999)
- [Fix workspace folder scope in tasks addTask, add IDF Monitor timestamps IDF version validation](https://github.com/espressif/vscode-esp-idf-extension/pull/1001)

## [1.6.3](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.6.3)

### Features and enhancements

- [Add idf.enableSizeTaskAfterBuildTask to enable disable Size task](https://github.com/espressif/vscode-esp-idf-extension/pull/965)
- [Zap Install no longer needed](https://github.com/espressif/vscode-esp-idf-extension/pull/967) Thanks @Diegorro98 !
- [Add consistency messages for flashing](https://github.com/espressif/vscode-esp-idf-extension/pull/971)
- [Add idf.customTerminalExecutable and idf.customTerminalExecutableArgs](https://github.com/espressif/vscode-esp-idf-extension/pull/973)

### Bug Fixes

- [Fix default monitor baud rate](https://github.com/espressif/vscode-esp-idf-extension/pull/964)
- [Fix NVS editor spaces](https://github.com/espressif/vscode-esp-idf-extension/pull/977)

## [1.6.2](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.6.2)

### Features and enhancements

- [add idf monitorBaudRate setting](https://github.com/espressif/vscode-esp-idf-extension/pull/951)
- [add idf enableStatusBar setting to show status bar](https://github.com/espressif/vscode-esp-idf-extension/pull/953)
- [Add custom offset to flash binaries to IDF serial port](https://github.com/espressif/vscode-esp-idf-extension/pull/957)

### Bug Fixes

- [use idf showOnboardingOnInit on extension activate](https://github.com/espressif/vscode-esp-idf-extension/pull/950)
- [add container user to dialout group](https://github.com/espressif/vscode-esp-idf-extension/pull/944)
- [Trim NVS partition CLRF](https://github.com/espressif/vscode-esp-idf-extension/pull/945)
- [Fix GUI Size UI](https://github.com/espressif/vscode-esp-idf-extension/pull/955)
- [remove virtualenv install from setup workflow](https://github.com/espressif/vscode-esp-idf-extension/pull/956)

## [1.6.1](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.6.1)

### Features and enhancements

- [Add coredump as data subtype](https://github.com/espressif/vscode-esp-idf-extension/pull/901) Thanks @ramiws !
- [Use webpack 5](https://github.com/espressif/vscode-esp-idf-extension/pull/916) Thanks @Spacefish !
- [Add ESP32 C6 boards](https://github.com/espressif/vscode-esp-idf-extension/pull/917) Thanks @Spacefish !
- [Add unit test and end to end testing docs](https://github.com/espressif/vscode-esp-idf-extension/pull/912)
- [Update platform on ESP-Matter shallow cloning](https://github.com/espressif/vscode-esp-idf-extension/pull/923) Thanks @Diegorro98 !
- [Add zap-cli install in ESP-Matter install](https://github.com/espressif/vscode-esp-idf-extension/pull/925) Thanks @Diegorro98 !

### Bug Fixes

- [Show only valid ESP-IDF setups](https://github.com/espressif/vscode-esp-idf-extension/pull/908)
- [Update non root dockerfile](https://github.com/espressif/vscode-esp-idf-extension/pull/910)
- [Fix wrong binaries multiple options](https://github.com/espressif/vscode-esp-idf-extension/pull/920) Thanks @jmigual !
- [Fix CMakeLists launch error](https://github.com/espressif/vscode-esp-idf-extension/pull/909)
- [Fix target reset on IDF Monitor when debug session starts](https://github.com/espressif/vscode-esp-idf-extension/pull/914)

## [1.6.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.6.0)

### Features and enhancements

- [Add nightly documentation install instructions](https://github.com/espressif/vscode-esp-idf-extension/pull/839)
- [Add linux archs to platforms](https://github.com/espressif/vscode-esp-idf-extension/pull/859)
- [Add ESP-Matter Python packages install](https://github.com/espressif/vscode-esp-idf-extension/pull/869) Thanks @Diegorro98 !
- [Add Nightly build links](https://github.com/espressif/vscode-esp-idf-extension/pull/874)
- [Add Watch variables expansion in debugging view](https://github.com/espressif/vscode-esp-idf-extension/pull/860)
- [Add multiple sdkconfig support](https://github.com/espressif/vscode-esp-idf-extension/pull/870)
- [Save and select multiple existing ESP-IDF setups in Setup Wizard](https://github.com/espressif/vscode-esp-idf-extension/pull/898)
- [Use multiple configurations for same ESP-IDF project with Project configuration wizard](https://github.com/espressif/vscode-esp-idf-extension/pull/882)

### Bug Fixes

- [Fix build arguments order](https://github.com/espressif/vscode-esp-idf-extension/pull/848)
- [Add Target to IDF Monitor](https://github.com/espressif/vscode-esp-idf-extension/pull/850)
- [Add Dispose sdk config command in documentation](https://github.com/espressif/vscode-esp-idf-extension/pull/849)
- [Fix app trace project elf file reference](https://github.com/espressif/vscode-esp-idf-extension/pull/864)
- [Fix QEMU monitor](https://github.com/espressif/vscode-esp-idf-extension/pull/863)
- [Fix nightly link bot comment](https://github.com/espressif/vscode-esp-idf-extension/commit/6e688150b8fd8798376258358f974e5384760dc4)
- [Fix ESP Matter device path hard set](https://github.com/espressif/vscode-esp-idf-extension/pull/871)
- [Fix submodules typo](https://github.com/espressif/vscode-esp-idf-extension/pull/888) Thanks @ttytyper !
- [Fix WSL usbipd install docs](https://github.com/espressif/vscode-esp-idf-extension/pull/892) Thanks @@ronger-x !
- [Fix linux-tools references](https://github.com/espressif/vscode-esp-idf-extension/pull/894)
- [Fix Kconfig server directory output](https://github.com/espressif/vscode-esp-idf-extension/pull/895)

## [1.5.1](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.5.1)

### Features and enhancements

- [Use embed git for ESP-IDF Tools install ](https://github.com/espressif/vscode-esp-idf-extension/pull/783)
- [Add flash button in partition table editor](https://github.com/espressif/vscode-esp-idf-extension/pull/774)
- [Remove managed components on full clean command](https://github.com/espressif/vscode-esp-idf-extension/pull/793)
- [Allow user to customize the build directory path](https://github.com/espressif/vscode-esp-idf-extension/pull/794)
- [Light ESP-Matter download](https://github.com/espressif/vscode-esp-idf-extension/pull/820) Thanks @Diegorro98!
- [Add input for custom openOCD board](https://github.com/espressif/vscode-esp-idf-extension/pull/830)
- [Add variables parsing and view binary data in debugging session](https://github.com/espressif/vscode-esp-idf-extension/pull/831)

### Bug Fixes

- [Add quotes for constraint file](https://github.com/espressif/vscode-esp-idf-extension/pull/790)
- [Fix OpenOCD version validator](https://github.com/espressif/vscode-esp-idf-extension/pull/806)
- [Fixed default branch for esp-matter](https://github.com/espressif/vscode-esp-idf-extension/pull/809) Thanks @Diegorro98!
- [Anonimize doctor command home path](https://github.com/espressif/vscode-esp-idf-extension/pull/805)
- [Fix pigweed path](https://github.com/espressif/vscode-esp-idf-extension/pull/816) Thanks @Diegorro98!
- Update [qemu version](https://github.com/espressif/vscode-esp-idf-extension/pull/818) and [add linux-tools-virtual-package](https://github.com/espressif/vscode-esp-idf-extension/pull/817) Thanks @biggates!
- [Fix ESP-IDF any for IDF Tools](https://github.com/espressif/vscode-esp-idf-extension/pull/821)
- [Fix empty workspace folder doctor command output](https://github.com/espressif/vscode-esp-idf-extension/pull/825)

## [1.5.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.5.0)

### Features and enhancements

- [Disassembly view](https://github.com/espressif/vscode-esp-idf-extension/pull/670)
- [Customize build folder directory](https://github.com/espressif/vscode-esp-idf-extension/pull/668)
- [Add unit test for getGcovExecutable function](https://github.com/espressif/vscode-esp-idf-extension/commit/9e4ca9c509af2f1a020def50370e305d4aa623d1)
- [Docker container tutorial for the extension](https://github.com/espressif/vscode-esp-idf-extension/pull/693) Thanks @xiaolongba !
- [Use esp-idf constraints file for python packages](https://github.com/espressif/vscode-esp-idf-extension/pull/700)
- [Add esp32s3 default board](https://github.com/espressif/vscode-esp-idf-extension/pull/724)
- [Remove powershell wrapper for WSL](https://github.com/espressif/vscode-esp-idf-extension/pull/734)
- [Add C Code in Disassembly view](https://github.com/espressif/vscode-esp-idf-extension/pull/741)
- [Unified ESP-IDF Output channel](https://github.com/espressif/vscode-esp-idf-extension/pull/716)
- [Add ESP-Matter framework support](https://github.com/espressif/vscode-esp-idf-extension/pull/547)
- [Add ESP-IDF tags for older ESP-IDF versions download in Setup Wizard](https://github.com/espressif/vscode-esp-idf-extension/pull/747)
- [Add DFU documentation](https://github.com/espressif/vscode-esp-idf-extension/pull/752)
- [Add existing project tutorial](https://github.com/espressif/vscode-esp-idf-extension/pull/771)
- [Add preview targets support in idf.py set-target](https://github.com/espressif/vscode-esp-idf-extension/pull/767)
- [Peripheral Register view](https://github.com/espressif/vscode-esp-idf-extension/pull/755)
- [Add custom openOCD server launch arguments](https://github.com/espressif/vscode-esp-idf-extension/pull/777)

### Bug Fixes

- [Fix port on status bar](https://github.com/espressif/vscode-esp-idf-extension/pull/662)
- [Clean terminal output before build task](https://github.com/espressif/vscode-esp-idf-extension/pull/692)
- [Fix release branch option to use git clone](https://github.com/espressif/vscode-esp-idf-extension/pull/696)
- [Fix write configuration settings to use current workspace](https://github.com/espressif/vscode-esp-idf-extension/pull/701)
- [Fix no-stub esptool flash argument](https://github.com/espressif/vscode-esp-idf-extension/pull/702)
- [Close IDF Monitor before erase flash task](https://github.com/espressif/vscode-esp-idf-extension/pull/705)
- [Add encrypt and refactor to single flash command](https://github.com/espressif/vscode-esp-idf-extension/pull/719)
- [Fix partition table explorer issues](https://github.com/espressif/vscode-esp-idf-extension/pull/726) Thanks @boarchuz !
- [Fix doc link for project creation template](https://github.com/espressif/vscode-esp-idf-extension/pull/729) Thanks @hassandraga !
- [Fix pythonBinPath in DFU Flashing](https://github.com/espressif/vscode-esp-idf-extension/pull/740)
- [Add idf.gitPathWin to avoid WSL issues](https://github.com/espressif/vscode-esp-idf-extension/pull/737)
- [Add spiffs and fat as partition table data subtypes](https://github.com/espressif/vscode-esp-idf-extension/pull/745)
- [Fix problem matcher regex for tasks](https://github.com/espressif/vscode-esp-idf-extension/pull/749)
- [Add space validation in Setup Wizard](https://github.com/espressif/vscode-esp-idf-extension/pull/761)
- [Fix doctor command core python requirements](https://github.com/espressif/vscode-esp-idf-extension/pull/766)
- [Fix tar xz extraction](https://github.com/espressif/vscode-esp-idf-extension/pull/776)
- [Update problem matcher regex](https://github.com/espressif/vscode-esp-idf-extension/pull/779)
- [Update Pull request template](https://github.com/espressif/vscode-esp-idf-extension/pull/753)

## [1.4.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.4.0)

### Features and enhancements

- [Show task output on Notification silent mode](https://github.com/espressif/vscode-esp-idf-extension/pull/606)
- [DFU Support](https://github.com/espressif/vscode-esp-idf-extension/pull/566)
- [Check core requirements.txt first](https://github.com/espressif/vscode-esp-idf-extension/pull/620)
- [Add debug adapter use generic classes](https://github.com/espressif/vscode-esp-idf-extension/pull/617)
- [Update compilerPath when IDF_TARGET changes](https://github.com/espressif/vscode-esp-idf-extension/pull/619)
- [Update marked dependency to latest](https://github.com/espressif/vscode-esp-idf-extension/pull/634)
- [Add other platforms in setup](https://github.com/espressif/vscode-esp-idf-extension/pull/636)
- [Use workspace folder in readParameter](https://github.com/espressif/vscode-esp-idf-extension/pull/641)
- [Add project wizard tutorial](https://github.com/espressif/vscode-esp-idf-extension/pull/651)
- [Update extension node dependencies](https://github.com/espressif/vscode-esp-idf-extension/pull/639) like node-sass to sass
- [Add eFuse Explorer refresh and clear summary](https://github.com/espressif/vscode-esp-idf-extension/pull/650)
- [OpenVSX extension release](https://github.com/espressif/vscode-esp-idf-extension/pull/652)

### Bug Fixes

- [Remove Windows Prerequisites](https://github.com/espressif/vscode-esp-idf-extension/pull/604)
- [Add tutorials links](https://github.com/espressif/vscode-esp-idf-extension/pull/621)
- [Clean dirty repositories](https://github.com/espressif/vscode-esp-idf-extension/pull/622)
- [Hide not-visible options in SDK Configuration editor](https://github.com/espressif/vscode-esp-idf-extension/pull/633)
- [Use relative elf in WSL monitor](https://github.com/espressif/vscode-esp-idf-extension/pull/625)
- [Add ccache logic in SDK Configuration editor](https://github.com/espressif/vscode-esp-idf-extension/pull/637)
- [Add ccache fixes for IDF_TARGET and add idf component](https://github.com/espressif/vscode-esp-idf-extension/pull/645) Thanks @meltdown03 !

## [1.3.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.3.0)

### Features and enhancements

- [Create virtual env before install-python-env](https://github.com/espressif/vscode-esp-idf-extension/pull/536)
- [Partition table editor unit testing](https://github.com/espressif/vscode-esp-idf-extension/pull/538)
- [NVS partition table editor unit testing](https://github.com/espressif/vscode-esp-idf-extension/pull/545)
- [Add JTAG configuration links in documentation](https://github.com/espressif/vscode-esp-idf-extension/pull/549)
- [Add ninja arguments for build task](https://github.com/espressif/vscode-esp-idf-extension/pull/564)
- [Add CMake and Ninja-build to setup when not found in PATH](https://github.com/espressif/vscode-esp-idf-extension/pull/550)
- [IDF Target and serial port only saved in workspace folder](https://github.com/espressif/vscode-esp-idf-extension/pull/562)
- [Add size task after build task](https://github.com/espressif/vscode-esp-idf-extension/pull/567)
- [SDK Configuration editor and Build end to end testing](https://github.com/espressif/vscode-esp-idf-extension/pull/491)
- [Add flashing types in documentation](https://github.com/espressif/vscode-esp-idf-extension/pull/576)
- [Project creation end to end testing](https://github.com/espressif/vscode-esp-idf-extension/pull/586)
- [GDB timeout scale factor in launch json for espidf configuration](https://github.com/espressif/vscode-esp-idf-extension/pull/575)
- [Add WSL Enable configuration setting](https://github.com/espressif/vscode-esp-idf-extension/pull/590)
- [Add pre build, post build, pre flash, post flash custom task (with icon for custom tasks)](https://github.com/espressif/vscode-esp-idf-extension/pull/585)
- [Add Welcome page](https://github.com/espressif/vscode-esp-idf-extension/pull/584)
- [Add setup end to end testing](https://github.com/espressif/vscode-esp-idf-extension/pull/595)

### Bug Fixes

- [Fix multiple save scope calls on workspace folder setup](https://github.com/espressif/vscode-esp-idf-extension/pull/526)
- [Fix documentation links](https://github.com/espressif/vscode-esp-idf-extension/pull/528)
- [Fix spaces in git path](https://github.com/espressif/vscode-esp-idf-extension/pull/533)
- [Remove openOCD copy rules button](https://github.com/espressif/vscode-esp-idf-extension/pull/544)
- [Update cppdbg launch json default configuration](https://github.com/espressif/vscode-esp-idf-extension/pull/555) Thanks @rdancer !
- [Fix openOCD configuration files in project wizard and settings](https://github.com/espressif/vscode-esp-idf-extension/pull/569)
- [Fix idf size UI issues due to idf_size.py schema changes](https://github.com/espressif/vscode-esp-idf-extension/pull/535)
- [Fix WSL detection and add WSL enable configuration setting](https://github.com/espressif/vscode-esp-idf-extension/pull/578)
- [Add silent notification for error messages](https://github.com/espressif/vscode-esp-idf-extension/pull/582)
- [Fix unused esp container directory being created](https://github.com/espressif/vscode-esp-idf-extension/pull/591)

## [1.2.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.2.0)

### Features and enhancements

- [Add ESP-IDF QEMU integration](https://github.com/espressif/vscode-esp-idf-extension/pull/451) to monitor and debug on emulated ESP32.
- [Add openOCD rules command and button on setup wizard end for Linux users](https://github.com/espressif/vscode-esp-idf-extension/pull/470)
- [Add verify matching binary before debug](https://github.com/espressif/vscode-esp-idf-extension/pull/472)
- [Heap tracing using gdbinit file](https://github.com/espressif/vscode-esp-idf-extension/pull/467)
- [Partition tree from target device and flash bin to partition](https://github.com/espressif/vscode-esp-idf-extension/pull/478)
- [Project creation unit testing](https://github.com/espressif/vscode-esp-idf-extension/pull/479)
- [Update debug adapter to latest commit](https://github.com/espressif/vscode-esp-idf-extension/pull/481)
- [Use Espressif mirrors for ESP-IDF tools download in setup wizard](https://github.com/espressif/vscode-esp-idf-extension/pull/514)
- Add CCache [enable setting](https://github.com/espressif/vscode-esp-idf-extension/pull/517) into [build task](https://github.com/espressif/vscode-esp-idf-extension/pull/523)
- [Add serial port and IDF_TARGET to status bar](https://github.com/espressif/vscode-esp-idf-extension/pull/519)

### Bug Fixes

- [Add git executable before venv](https://github.com/espressif/vscode-esp-idf-extension/pull/468)
- [Add openOCD debug level configuration setting and fix ESP-IDF version without git history](https://github.com/espressif/vscode-esp-idf-extension/pull/518)
- [Add save scope reference in documentation](https://github.com/espressif/vscode-esp-idf-extension/pull/489)
- [Chinese localization fixes](https://github.com/espressif/vscode-esp-idf-extension/pull/507) Thanks @larryli !
- [Fix arduino as component cloning promise await if directory exists](https://github.com/espressif/vscode-esp-idf-extension/pull/481)
- Fix recursive examples not rendering in production in [new project wizard](https://github.com/espressif/vscode-esp-idf-extension/pull/486) and [show examples](https://github.com/espressif/vscode-esp-idf-extension/pull/513)
- [Fix multiple projects documentation link](https://github.com/espressif/vscode-esp-idf-extension/pull/503)
- [Update MacOS default keyboard shortcuts](https://github.com/espressif/vscode-esp-idf-extension/pull/493)
- [Use process execution instead of shell for flashing task](https://github.com/espressif/vscode-esp-idf-extension/pull/469)
- Windows fixes for [gcovr](https://github.com/espressif/vscode-esp-idf-extension/pull/509) and [qemu](https://github.com/espressif/vscode-esp-idf-extension/pull/510)

## [1.1.1](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.1.1)

### Features and enhancements

- [Enable or disable CMakeLists srcs auto update](https://github.com/espressif/vscode-esp-idf-extension/pull/443)
- [Run Cmake configure only when CMakeCache.txt does not exists](https://github.com/espressif/vscode-esp-idf-extension/pull/442)
- [Add Component manager to add ESP-IDF components to project](https://github.com/espressif/vscode-esp-idf-extension/pull/273)
- [Import ESP-IDF Project command](https://github.com/espressif/vscode-esp-idf-extension/pull/464)
- [Add board select testing](https://github.com/espressif/vscode-esp-idf-extension/pull/446)

### Bug Fixes

- [Fix app trace file path](https://github.com/espressif/vscode-esp-idf-extension/pull/431)
- [Fix setup on Windows](https://github.com/espressif/vscode-esp-idf-extension/pull/444)
- [Fix reset values on SDK Configuration editor and openOCD version validator](https://github.com/espressif/vscode-esp-idf-extension/pull/459)
- [Add extension templates in new project](https://github.com/espressif/vscode-esp-idf-extension/pull/461)
- [Fix monitor closing before flashing](https://github.com/espressif/vscode-esp-idf-extension/pull/463)

## [1.1.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.1.0)

### Features and enhancements

- [JTAG Flashing in Build, flash, monitor](https://github.com/espressif/vscode-esp-idf-extension/pull/400) command
- [Testing Docker image and doctor command testing](https://github.com/espressif/vscode-esp-idf-extension/pull/365)
- [ESP-IDF Examples recursive subcategories shown in side menu](https://github.com/espressif/vscode-esp-idf-extension/pull/412)
- Add [ESP-IDF: Configure project for coverage](https://github.com/espressif/vscode-esp-idf-extension/pull/354) to set sdkconfig values for Code coverage
- Use [embed python and embed git for windows](https://github.com/espressif/vscode-esp-idf-extension/pull/416) in extension setup.

### Bug Fixes

- [Fix remove package.json dependencies](https://github.com/espressif/vscode-esp-idf-extension/commit/2c34b8fa6704e28aef47b22bf00bbffb0481799c)
- [Enable IDF Component manager configuration setting](https://github.com/espressif/vscode-esp-idf-extension/pull/389)
- [Fix openOCD default boards configuration files](https://github.com/espressif/vscode-esp-idf-extension/pull/391)
- [Fix binaries included in flashing](https://github.com/espressif/vscode-esp-idf-extension/pull/406)

## [1.0.3](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.0.3)

### Features and enhancements

- [Separate Python Pip errors in extension setup](https://github.com/espressif/vscode-esp-idf-extension/pull/377)
- [Add Component manager flag for build task](https://github.com/espressif/vscode-esp-idf-extension/pull/374)
- [Package vsix without extension dependencies](https://github.com/espressif/vscode-esp-idf-extension/pull/372)
- [Customize compiler and build tasks arguments, use esptool_extra_args and encrypted flags from build/flasher_args.json](https://github.com/espressif/vscode-esp-idf-extension/pull/363)

### Bug Fixes

- [Send Ctrl + \] signal to exit idf monitor on flash tasks](https://github.com/espressif/vscode-esp-idf-extension/pull/382)
- [Fix New project wizard require serial ports, add esp32s3 esp32c3, release vsix without extension dependencies](https://github.com/espressif/vscode-esp-idf-extension/pull/378)
- [Check arduino component directory exists, remove old arduino-esp32 cloning branches](hhttps://github.com/espressif/vscode-esp-idf-extension/pull/370)
- [Remove IDF Tools exact match on extension activation](https://github.com/espressif/vscode-esp-idf-extension/pull/359)
- [Fix device configuration target setting](https://github.com/espressif/vscode-esp-idf-extension/pull/384)

## [1.0.2](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.0.2)

### Features and enhancements

- [Add monitor process kill timeout configuration setting](https://github.com/espressif/vscode-esp-idf-extension/pull/358)

### Bug Fixes

- [Fix monitor shell executable path for monitor command](https://github.com/espressif/vscode-esp-idf-extension/pull/358)
- [Tasks presentation options fixes](https://github.com/espressif/vscode-esp-idf-extension/pull/357)
- [Remove IDF version validation](https://github.com/espressif/vscode-esp-idf-extension/pull/351)

## [1.0.1](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.0.1)

### Features and enhancements

- [Add remove CMakelists.txt elements](https://github.com/espressif/vscode-esp-idf-extension/pull/330)
- [Add ESP32-S3 and ESP32-C3 idf targets](https://github.com/espressif/vscode-esp-idf-extension/pull/338)
- [Add ESP-IDF validation for heap tracing and sdk configuration editor](https://github.com/espressif/vscode-esp-idf-extension/pull/347)
- [New Project Wizard](https://github.com/espressif/vscode-esp-idf-extension/pull/171)

### Bug Fixes

- [Fix WSL 1 Flashing](https://github.com/espressif/vscode-esp-idf-extension/pull/331)
- [Fix compiler in settings.json](https://github.com/espressif/vscode-esp-idf-extension/pull/334)
- [Fix relative links in tasks output](https://github.com/espressif/vscode-esp-idf-extension/pull/337)

## [1.0.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.0.0)

### Features and enhancements

- [Add report button](https://github.com/espressif/vscode-esp-idf-extension/pull/302) to send error to telemetry backend.
- [Launch ESP-IDF Monitor on debug session launch](https://github.com/espressif/vscode-esp-idf-extension/pull/303).
- [CI Enhancements](https://github.com/espressif/vscode-esp-idf-extension/pull/308)
- [New IDF Component command](https://github.com/espressif/vscode-esp-idf-extension/pull/310) to add a component in current project.
- [Add post build ninja summary from Chromium tools script](https://github.com/espressif/vscode-esp-idf-extension/pull/315)
- [Add command to dispose cached SDK Configuration Editor confserver process](https://github.com/espressif/vscode-esp-idf-extension/pull/325)

### Bug Fixes

- [Fix JTAG Flashing issue](https://github.com/espressif/vscode-esp-idf-extension/pull/301)
- [Fix select UI on SDK Configuration Editor](https://github.com/espressif/vscode-esp-idf-extension/pull/304)
- [Use only major_minor for python_env directories](https://github.com/espressif/vscode-esp-idf-extension/pull/311)
- [Update Arduino esp32 branches and fallback on master](https://github.com/espressif/vscode-esp-idf-extension/pull/312)
- [Kill ESP-IDF Monitor terminal on Flash task execution](https://github.com/espressif/vscode-esp-idf-extension/pull/314)
- [Fix CMakeLists.txt Editor schema error](https://github.com/espressif/vscode-esp-idf-extension/pull/319)
- [Fix missing ESP-ADF ESP-MDF env variables on Windows](https://github.com/espressif/vscode-esp-idf-extension/pull/320)
- [Fix default compiler path on Show ESP-IDF examples created projects](https://github.com/espressif/vscode-esp-idf-extension/pull/324)

## [0.6.1](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.6.1)

### Features and enhancements

- [ESP-IDF: Doctor command](https://github.com/espressif/vscode-esp-idf-extension/pull/255) to generate an extension configuration report.
- [Enhance readme and documentation](https://github.com/espressif/vscode-esp-idf-extension/pull/284)
- [Select openOCD board command](https://github.com/espressif/vscode-esp-idf-extension/pull/286) based on esp-config.json from OpenOCD repository.
- [Russian localization for commands](https://github.com/espressif/vscode-esp-idf-extension/pull/216) Thanks @Vasilius-001 !

### Bug Fixes

- [WSL 1 serial port fix](https://github.com/espressif/vscode-esp-idf-extension/pull/298)
- [Fix OpenOCD Config Files](https://github.com/espressif/vscode-esp-idf-extension/pull/296) Thanks @meltdown03 !
- [Fix custom terminal output formatting](https://github.com/espressif/vscode-esp-idf-extension/pull/291)
- [Remove check IDF tools before build or flash, update tasks.json template](https://github.com/espressif/vscode-esp-idf-extension/pull/281)
- [Fix env variables settings in IDF Monitor command](https://github.com/espressif/vscode-esp-idf-extension/pull/274)
- [Fix eFuse explorer icons](https://github.com/espressif/vscode-esp-idf-extension/pull/268)

## [0.6.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.6.0)

### Features & Enhancements

- [Changelog Viewer](https://github.com/espressif/vscode-esp-idf-extension/pull/180)
- [Core Dump & GDB Stub Postmortem Debug Support](https://github.com/espressif/vscode-esp-idf-extension/pull/176)
- [Add Support for Powershell Core](https://github.com/espressif/vscode-esp-idf-extension/pull/212)
- [ESP-IDF custom CMake Editor](https://github.com/espressif/vscode-esp-idf-extension/pull/203)
- [Add Option to silent the notifications](https://github.com/espressif/vscode-esp-idf-extension/pull/220)
- [Enhance doc search from vscode, also show results inside vscode itself](https://github.com/espressif/vscode-esp-idf-extension/pull/215)
- [Show Rainmaker LoggedIn User's Info](https://github.com/espressif/vscode-esp-idf-extension/pull/235)
- [Add WSL Serial Support](https://github.com/espressif/vscode-esp-idf-extension/pull/224)
- [JTAG Flashing Support](https://github.com/espressif/vscode-esp-idf-extension/pull/183)
- [Add e-fuse bit viewer](https://github.com/espressif/vscode-esp-idf-extension/pull/151)
- [Add Full Clean Command](https://github.com/espressif/vscode-esp-idf-extension/pull/250)
- [Full Partition Table Editor UI](https://github.com/espressif/vscode-esp-idf-extension/pull/170)
- [NVS Partition Editor UI](https://github.com/espressif/vscode-esp-idf-extension/pull/246)
- [Enhanced Onboarding & Simplification](https://github.com/espressif/vscode-esp-idf-extension/pull/159)
- [Use variable app_image_offset for debugAdapter](https://github.com/espressif/vscode-esp-idf-extension/issues/225)
- [Win configuration parameters](https://github.com/espressif/vscode-esp-idf-extension/issues/234)

### Bug Fixes

- [Fix Rainmaker UI Crash](https://github.com/espressif/vscode-esp-idf-extension/issues/245)
- [Fix Create project using example error](https://github.com/espressif/vscode-esp-idf-extension/issues/239)
- [Fix Conflict with PlatformIO and ESP-IDF Extension](https://github.com/espressif/vscode-esp-idf-extension/issues/190)
- [Fix Menuconfig Related Error](https://github.com/espressif/vscode-esp-idf-extension/issues/199)
- [Fix issues with IntelliSense](https://github.com/espressif/vscode-esp-idf-extension/issues/191)

## [0.5.1](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.5.1)

### Release Bug Fix

- Fix the CI release to marketplace bug not packaging the `esp_debug_adapter`
- Fix the System Tracing UI theme, and added webview panel icons

## [0.5.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.5.0)

### ESP-ADF & ESP-MDF

- Added support for ESP-ADF and ESP-MDF
- Fixed some bugs related to [Device Baud Rate](https://github.com/espressif/vscode-esp-idf-extension/pull/166), [Webview Background Color](https://github.com/espressif/vscode-esp-idf-extension/pull/166), [Menuconfig](https://github.com/espressif/vscode-esp-idf-extension/pull/166)

## [0.4.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.4.0)

### System View Tracing Viewer, Search IDF Documentation, etc.

- Add System View Tracing [support]() inside vscode, which will enable you to easily view the timeline, events stream, etc., of of existing heap tracing (.svdat) file
- Add support for Arduino as ESP32 Component
- Add [support](https://github.com/espressif/vscode-esp-idf-extension#available-commands) for searching ESP-IDF documentation from vscode itself.
- Fixed some bugs related to [debug adapter](https://github.com/espressif/vscode-esp-idf-extension/pull/134), [gui menuconfig](https://github.com/espressif/vscode-esp-idf-extension/pull/145), [task based commands](https://github.com/espressif/vscode-esp-idf-extension/pull/143), [UI and style enhancements](https://github.com/espressif/vscode-esp-idf-extension/pull/137), etc.

## [0.3.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.3.0)

### Heap Tracing, Code Coverage Support, Rainmaker Support and bug fixes

- Add Heap Tracing [support](https://github.com/espressif/vscode-esp-idf-extension#log--heap-tracing) inside vscode for ESP32 and ESP32-S2 chips
- Show [code-coverage](https://github.com/espressif/vscode-esp-idf-extension#code-coverage) inside the vscode editor for your ESP-IDF projects
- Add ESP Rainmaker IoT cloud [support](https://github.com/espressif/vscode-esp-idf-extension#esp-rainmaker-support) inside vscode, this will enable you to control your ESP32 and ESP32-S2 devices from vscode
- Use `webview.asWebviewUri(...)` API for making extension web browser compatible
- Add [support](https://github.com/espressif/vscode-esp-idf-extension/blob/master/docs/TELEMETRY.md) for telemetry
- Fix some typos in template project
- Fix Poweshell export env support
- Improve onboarding docs
- Fix some typos in Documentation
- Fix workspace folder error for no opened workspaces

## [0.2.2](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.2.2)

### Add problem matcher support for build and Minor Bug Fixes

- Add support for Problem Matcher in vscode to show line number errors for build which will make navigation to the error easier
- Update some CI issues
- Fixed build related errors

## [0.2.1](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.2.1)

### Minor bug fixes and performance enhancements

- SEO for vscode marketplace, add keywords and update description
- Enhance and Fix some bugs with IDF Monitor terminal
- Update Stale CI configs
- Project structore enhancement, remove unused files in project
- Fix xtensa toolchain issue and getProjectName
- Update OpenOCD script checks

## [0.2.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.2.0)

### Release Debug Adapter for ESP-IDF withing VSCode

- Release Debug Adapter, this would enable debugging for an IDF project from within the VSCode IDE, please refer the guide for how to use the same
- Add support for save before IDF build, this would save all your edited files and then trigger a build.
- Add Prettier for code linting and formatting (improving extension developer experience)
- Update Issue Template for GH
- Minor bug fixes and enhancements

## [0.1.4](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.1.4)

### i18n Validation and CMake based reading of project name

- Auto validate missing `i18n` keys and trigger build failure if not found.
- Read & Sync project name using `CMakeList`

## [0.1.3](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.1.3)

### Automate Github and VSCode Marketplace release

- Release to Github and VSCode Marketplace using Github Actions
- Minor bug fixes

## [0.1.2](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.1.2)

### Breaking Project Structural changes

- Use `yarn` instead of `npm`
- Use `webpack` to bundle all of the extension
- Reduce overall size of the `.vsix` significantly

## [0.1.1](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.1.1)

### Release to the VSCode Marketplace

- Preview release to the VSCode Marketplace
- Update docs
- CI improvements

## [0.1.0](https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v0.1.0)

### Initial Public Release

- Initial ESP-IDF commands
- Build, flash and monitor with CMake functionality
- GUIConfig to setup your project ESP-IDF settings.
- IDF Size Analysis GUI
- App Trace Logging
- ...and much more
