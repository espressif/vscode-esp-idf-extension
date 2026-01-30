Release Notes
=============

All notable changes to the "Espressif IDF" extension are documented in this file.

2.0.2
-----

`v2.0.2 <https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v2.0.2>`_

Features and enhancements (2.0.2)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- `Show templates before configuration in New Project Wizard <https://github.com/espressif/vscode-esp-idf-extension/pull/1757>`_
- `Debug image viewer and also view C image array from files <https://github.com/espressif/vscode-esp-idf-extension/pull/1644>`_ — You can configure for OpenCV, LVGL and any custom data types as long as you provide an image C UInt8Array and size length.
- `Remove old debug adapter, ESP-MDF, ESP-Matter and ESP-HomeKit <https://github.com/espressif/vscode-esp-idf-extension/pull/1693>`_. Many of these frameworks are available in the ESP Component Registry. We are keeping ESP-ADF though.

Bug Fixes (2.0.2)
~~~~~~~~~~~~~~~~~

- `Show ESP-IDF versions in descending order <https://github.com/espressif/vscode-esp-idf-extension/pull/1704>`_

1.11.1
------

`v1.11.1 <https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.11.1>`_

Bug Fixes (1.11.1)
~~~~~~~~~~~~~~~~~~

- `Use Output Capture Execution only for Copilot Chat <https://github.com/espressif/vscode-esp-idf-extension/pull/1740>`_
- `Post-build always hangs in v1.11.0 <https://github.com/espressif/vscode-esp-idf-extension/pull/1733>`_
- `Remove await for clang check in activation <https://github.com/espressif/vscode-esp-idf-extension/pull/1745>`_
- `Prevent Set target from closing on focus lost <https://github.com/espressif/vscode-esp-idf-extension/pull/1748>`_
- `Listen to restart event request to fix debug restart button <https://github.com/espressif/vscode-esp-idf-extension/pull/1747>`_
- `Fix get project name in IDF Size task <https://github.com/espressif/vscode-esp-idf-extension/pull/1741>`_
- `Add menuconfig visual separator for root sections <https://github.com/espressif/vscode-esp-idf-extension/pull/1752>`_

1.11.0
------

`v1.11.0 <https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.11.0>`_

Features and enhancements (1.11.0)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- `Add DevKits support <https://github.com/espressif/vscode-esp-idf-extension/pull/1557>`_
- `Add gitignore on project creation <https://github.com/espressif/vscode-esp-idf-extension/pull/1578>`_
- `Pre-Release branch docs <https://github.com/espressif/vscode-esp-idf-extension/pull/1599>`_
- `Modify event activation for file types <https://github.com/espressif/vscode-esp-idf-extension/pull/1568>`_
- `Add classic menuconfig in Editor Panel <https://github.com/espressif/vscode-esp-idf-extension/pull/1598>`_
- `Update webviews to VS Code UI Style <https://github.com/espressif/vscode-esp-idf-extension/pull/1554>`_ — This removes the "ESP-IDF: Show Examples" command in favor of "ESP-IDF: New Project" since it provides better customization.
- `Allow customize Pytest glob pattern and unit test services <https://github.com/espressif/vscode-esp-idf-extension/pull/1593>`_
- `CLang install prompt if not installed <https://github.com/espressif/vscode-esp-idf-extension/pull/1615>`_
- `Allow additional files and directories for Full Clean commands <https://github.com/espressif/vscode-esp-idf-extension/pull/1613>`_
- `Extend JTAG flash arguments as configuration setting <https://github.com/espressif/vscode-esp-idf-extension/pull/1583>`_
- `Range support for downloads in Setup Wizard <https://github.com/espressif/vscode-esp-idf-extension/pull/1625>`_
- `Check OpenOCD is running before debug is launched <https://github.com/espressif/vscode-esp-idf-extension/pull/1638>`_
- `Add function names in Disassembly view <https://github.com/espressif/vscode-esp-idf-extension/pull/1634>`_
- `OpenOCD Hints in Hints Viewer <https://github.com/espressif/vscode-esp-idf-extension/pull/1476>`_
- `Add detect as default serial port option and use esptool.py to find serial port <https://github.com/espressif/vscode-esp-idf-extension/pull/1632>`_
- `Pre-release campaign notification <https://github.com/espressif/vscode-esp-idf-extension/pull/1643>`_
- `Prefer gdbinit prefix_map with fallback to prefix_map_gdbinit <https://github.com/espressif/vscode-esp-idf-extension/pull/1660>`_
- `AI Integration with Copilot Chat using Language Tool API <https://github.com/espressif/vscode-esp-idf-extension/pull/1621>`_
- `Allow customize PyPi Index URL in setup wizard <https://github.com/espressif/vscode-esp-idf-extension/pull/1692>`_
- `Add create empty project command <https://github.com/espressif/vscode-esp-idf-extension/pull/1698>`_
- `Add Unity Runner and Parser, Remove Pytest <https://github.com/espressif/vscode-esp-idf-extension/pull/1681>`_

Bug Fixes (1.11.0)
~~~~~~~~~~~~~~~~~~

- `Update disassemble screenshot <https://github.com/espressif/vscode-esp-idf-extension/pull/1588>`_
- `JTAG acronym issues <https://github.com/espressif/vscode-esp-idf-extension/pull/1604>`_
- `Fix IDF_TARGET in multiple project configuration profiles <https://github.com/espressif/vscode-esp-idf-extension/pull/1579>`_
- `Fix Partial encryption in encrypted flashing <https://github.com/espressif/vscode-esp-idf-extension/pull/1373>`_
- `Close OpenOCD after JTAG flash end <https://github.com/espressif/vscode-esp-idf-extension/pull/1601>`_
- `NodeJS 20 in CI <https://github.com/espressif/vscode-esp-idf-extension/pull/1611>`_
- `Update build message <https://github.com/espressif/vscode-esp-idf-extension/pull/1603>`_
- `Fix append git and pigweed to PATH instead of prepend <https://github.com/espressif/vscode-esp-idf-extension/pull/1614>`_
- `Use latest in master in docs <https://github.com/espressif/vscode-esp-idf-extension/pull/1636>`_
- `Fix fileExists check in Setup panel <https://github.com/espressif/vscode-esp-idf-extension/pull/1609>`_ Thanks @jonsambro
- `Use mon program_esp instead of load for Symbol loading in debug <https://github.com/espressif/vscode-esp-idf-extension/pull/1556>`_ Thanks @wormyrocks
- `Move Status bar items to the left <https://github.com/espressif/vscode-esp-idf-extension/pull/1626>`_
- `Fix set target preview targets <https://github.com/espressif/vscode-esp-idf-extension/pull/1652>`_
- `Fix App trace and Heap Trace <https://github.com/espressif/vscode-esp-idf-extension/pull/1656>`_
- `Setup wizard misleading idf.py not found message fix <https://github.com/espressif/vscode-esp-idf-extension/pull/1642>`_
- `Clang and OpenOCD in PATH validation <https://github.com/espressif/vscode-esp-idf-extension/pull/1666>`_
- `Telemetry issues bugfixes <https://github.com/espressif/vscode-esp-idf-extension/pull/1675>`_
- `Fix openOCDRulesPath in addOpenOCDRules <https://github.com/espressif/vscode-esp-idf-extension/pull/1685>`_
- `Add constraints in pytest install step <https://github.com/espressif/vscode-esp-idf-extension/pull/1686>`_
- `Add double quotes around gdbinit file path <https://github.com/espressif/vscode-esp-idf-extension/pull/1684>`_

1.10.1
------

`v1.10.1 <https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.10.1>`_

Features and enhancements (1.10.1)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- `Evaluate variables on hover, view variables as Hex, set data breakpoints <https://github.com/espressif/vscode-esp-idf-extension/pull/1521>`_
- `Clang project settings configuration <https://github.com/espressif/vscode-esp-idf-extension/pull/1489>`_
- `Show currently active openOCD board in selection list <https://github.com/espressif/vscode-esp-idf-extension/pull/1527>`_
- `Add ESP-IDF vscode profile templates <https://github.com/espressif/vscode-esp-idf-extension/pull/1499>`_

Bug Fixes (1.10.1)
~~~~~~~~~~~~~~~~~~

- `No workspace fsPath launch error <https://github.com/espressif/vscode-esp-idf-extension/pull/1538>`_
- `Disassembly view DAP request updates <https://github.com/espressif/vscode-esp-idf-extension/pull/1518>`_
- `Status bar items names on right click <https://github.com/espressif/vscode-esp-idf-extension/pull/1515>`_
- `Replace user HOME or USERPROFILE for HOMEPATH in doctor command logs <https://github.com/espressif/vscode-esp-idf-extension/pull/1517>`_
- `Add user validation before burning eFuses <https://github.com/espressif/vscode-esp-idf-extension/pull/1540>`_
- `Add current setup to ESP-IDF setup list <https://github.com/espressif/vscode-esp-idf-extension/pull/1513>`_
- `Fix OpenOCD Args in project configuration state <https://github.com/espressif/vscode-esp-idf-extension/pull/1551>`_
- `Execute export script in IDF Terminal, allow custom terminal executable <https://github.com/espressif/vscode-esp-idf-extension/pull/1558>`_
- `Add eFuse docs in readme <https://github.com/espressif/vscode-esp-idf-extension/pull/1545>`_
- `Remove which and where dependency, browse binary in list of PATH <https://github.com/espressif/vscode-esp-idf-extension/pull/1565>`_
- `Fix cloning dev branches <https://github.com/espressif/vscode-esp-idf-extension/pull/1584>`_
- `Add Windows ARM serialport binaries <https://github.com/espressif/vscode-esp-idf-extension/pull/1585>`_
- `Add idf-python and idf-git Github mirrors <https://github.com/espressif/vscode-esp-idf-extension/pull/1586>`_
- `Fix sysview gdbinit commands <https://github.com/espressif/vscode-esp-idf-extension/pull/1580>`_
- `Fix update debug adapter debugPort in launch.json <https://github.com/espressif/vscode-esp-idf-extension/pull/1587>`_

1.10.0
------

`v1.10.0 <https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.10.0>`_

Features and enhancements (1.10.0)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

- `Add command to delete esp-idf specific settings <https://github.com/espressif/vscode-esp-idf-extension/pull/1353>`_
- `Add idf.monitorPort setting <https://github.com/espressif/vscode-esp-idf-extension/pull/1429>`_
- `Add idf.jtagFlashCommandExtraArgs <https://github.com/espressif/vscode-esp-idf-extension/pull/1450>`_
- `Use idf qemu and idf.qemuExtraArgs for debug and monitor <https://github.com/espressif/vscode-esp-idf-extension/pull/1462>`_
- `App bootloader partition table build flash cmds, read Partition from device, partition specific flashing <https://github.com/espressif/vscode-esp-idf-extension/pull/1436>`_

Bug Fixes (1.10.0)
~~~~~~~~~~~~~~~~~~~

- `Russian translation typos fix <https://github.com/espressif/vscode-esp-idf-extension/pull/1409>`_ Thanks @SinglWolf
- `Fix esp_idf.json setup not recognized <https://github.com/espressif/vscode-esp-idf-extension/pull/1451>`_
- `Quotes for export script in IDF Terminal <https://github.com/espressif/vscode-esp-idf-extension/pull/1428>`_
- `Fix preFlashTask in multiples profiles projects <https://github.com/espressif/vscode-esp-idf-extension/pull/1441>`_
- `Add web extension debug and other documentation <https://github.com/espressif/vscode-esp-idf-extension/pull/1453>`_
- `Fix openOCD arguments order <https://github.com/espressif/vscode-esp-idf-extension/pull/1482>`_
- `Fix project configuration documents <https://github.com/espressif/vscode-esp-idf-extension/pull/1480>`_
- `Fix create example project from Components registry <https://github.com/espressif/vscode-esp-idf-extension/pull/1485>`_
- `Use remoteName to detect Codespaces environment <https://github.com/espressif/vscode-esp-idf-extension/pull/1483>`_
- `Use 2 spaces for tab size on created json files <https://github.com/espressif/vscode-esp-idf-extension/pull/1510>`_
- `Ensure build directory exists resolve workspaceFolder paths in Project Configuration editor <https://github.com/espressif/vscode-esp-idf-extension/pull/1417>`_
- `Fix build flash monitor release serial port <https://github.com/espressif/vscode-esp-idf-extension/pull/1502>`_
- `Merge env vars and add IDF_TARGET in Project Configuration Editor and New Project Wizard <https://github.com/espressif/vscode-esp-idf-extension/pull/1498>`_

Older releases
--------------

For release notes from **1.9.1** through **0.1.0**, see the `CHANGELOG on GitHub <https://github.com/espressif/vscode-esp-idf-extension/blob/master/CHANGELOG.md>`_.
