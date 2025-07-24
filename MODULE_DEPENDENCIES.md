# ESP-IDF VS Code Extension - Module Dependencies and Initialization Order

This document provides a comprehensive overview of the extension's module structure, dependencies, and initialization order.

## Module Dependency Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         EXTENSION ENTRY POINT                            │
│                           (extension.ts)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        FOUNDATION LAYER (Layer 1)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │   Logger     │  │    Config    │  │    Utils     │                 │
│  │ (logger/)    │  │  (config.ts) │  │ (utils.ts)   │                 │
│  └──────────────┘  └──────────────┘  └──────────────┘                 │
│         │                 │                  │                           │
│         └─────────────────┴──────────────────┘                          │
│                            │                                               │
│                            ▼                                               │
│                  ┌─────────────────────┐                                  │
│                  │ ExtensionConfigStore │                                  │
│                  │  (common/store.ts)  │                                  │
│                  └─────────────────────┘                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      CONFIGURATION LAYER (Layer 2)                       │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │ idfConfiguration │  │ ProjectConfigStore│  │  Telemetry       │    │
│  │                  │  │ (project-conf/)   │  │                  │    │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘    │
│         │                      │                        │                 │
│         └──────────────────────┴────────────────────────┘               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      CORE SERVICES LAYER (Layer 3)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ OutputChannel│  │RainmakerStore│  │KconfigLang    │                │
│  │ (logger/)    │  │ (rainmaker/) │  │Client (kconfig)│                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │DebugAdapter   │  │OpenOCDManager│  │QemuManager   │                │
│  │Manager        │  │(espIdf/      │  │(qemu/)       │                │
│  │(espIdf/debug) │  │openOcd/)     │  └──────────────┘                │
│  └──────────────┘  └──────────────┘                                    │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │LanguageTool  │  │CommandDict   │  │TaskManager   │                │
│  │(langTools/)  │  │(cmdTreeView/ │  │(taskManager) │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    WORKSPACE & PROJECT LAYER (Layer 4)                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐    │
│  │workspaceConfig   │  │ProjectConfig     │  │StatusBar         │    │
│  │                  │  │Manager          │  │(statusBar/)       │    │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘    │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐                          │
│  │CoverageRenderer   │  │UnitTest           │                          │
│  │(coverage/)        │  │(espIdf/unitTest/) │                          │
│  └──────────────────┘  └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      FEATURE MODULES LAYER (Layer 5)                      │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Build        │  │ Flash        │  │ Monitor      │                │
│  │ (build/)     │  │ (flash/)     │  │(espIdf/     │                │
│  │              │  │              │  │monitor/)    │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Menuconfig   │  │ Partition    │  │ Size        │                │
│  │(espIdf/      │  │ Table        │  │(espIdf/     │                │
│  │menuconfig/)  │  │(espIdf/      │  │size/)       │                │
│  │              │  │partition-    │  │             │                │
│  │              │  │table/)       │  │             │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Tracing      │  │ Core Dump    │  │ EFuse        │                │
│  │(espIdf/      │  │(espIdf/     │  │(efuse/)      │                │
│  │tracing/)     │  │core-dump/)  │  │              │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Serial       │  │ Component    │  │ Documentation│                │
│  │(espIdf/      │  │ Manager     │  │(espIdf/      │                │
│  │serial/)      │  │(component-  │  │documentation)│                │
│  │              │  │manager/)    │  │              │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        UI & VIEWS LAYER (Layer 6)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Setup Panel  │  │ Welcome      │  │ New Project  │                │
│  │(setup/)      │  │(welcome/)    │  │(newProject/) │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Tree Views   │  │ Webviews     │  │ Rainmaker    │                │
│  │(cmdTreeView/ │  │(views/)      │  │(rainmaker/)  │                │
│  │idfComponents│  │              │  │              │                │
│  │etc.)         │  │              │  │              │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    INTEGRATION & SUPPORT LAYER (Layer 7)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ Support      │  │ CDT Debug   │  │ Clang       │                │
│  │(support/)    │  │ Adapter      │  │(clang/)     │                │
│  │              │  │(cdtDebug     │  │             │                │
│  │              │  │Adapter/)     │  │             │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │
│  │ CMake        │  │ Hints        │  │ Version     │                │
│  │(cmake/)      │  │(espIdf/      │  │ Switcher    │                │
│  │              │  │hints/)       │  │(version     │                │
│  │              │  │              │  │Switcher/)   │                │
│  └──────────────┘  └──────────────┘  └──────────────┘                │
└─────────────────────────────────────────────────────────────────────────┘
```

## Initialization Order

The extension initializes in the following order during the `activate()` function:

### Phase 1: Foundation Initialization (Critical - Must Complete First)
1. **Logger** (`logger/logger.ts`)
   - Initializes winston logger
   - Sets up log file and transports
   - **Dependencies**: None (foundation)

2. **ExtensionConfigStore** (`common/store.ts`)
   - Global configuration storage
   - **Dependencies**: Logger

3. **ProjectConfigStore** (`project-conf/`)
   - Project-specific configuration storage
   - **Dependencies**: Logger, ExtensionConfigStore

4. **Telemetry** (`telemetry/`)
   - Telemetry service initialization
   - **Dependencies**: Logger, idfConfiguration

5. **Utils Context** (`utils.ts`)
   - Sets extension context for utility functions
   - **Dependencies**: None

### Phase 2: Non-Critical Initialization (Can Fail Gracefully)
6. **ChangelogViewer** (`changelog-viewer.ts`)
   - Shows changelog on first run
   - **Dependencies**: Logger, ExtensionConfigStore

7. **PreReleaseNotification** (`preReleaseNotification.ts`)
   - Shows pre-release notifications
   - **Dependencies**: Logger, ExtensionConfigStore

8. **PreCheck** (`common/PreCheck.ts`)
   - Environment and workspace validation
   - **Dependencies**: Logger

### Phase 3: Workspace Validation
9. **Workspace Check**
   - Validates ESP-IDF project structure
   - Checks for CMakeLists.txt
   - **Dependencies**: PreCheck, Logger

### Phase 4: Core Services Initialization
10. **DebugAdapterManager** (`espIdf/debugAdapter/debugAdapterManager.ts`)
    - Debug adapter lifecycle management
    - **Dependencies**: Logger, idfConfiguration

11. **OutputChannel** (`logger/outputChannel.ts`)
    - VS Code output channel for ESP-IDF
    - **Dependencies**: Logger

12. **RainmakerStore** (`rainmaker/store.ts`)
    - Rainmaker cloud service storage
    - **Dependencies**: ExtensionConfigStore

13. **KconfigLangClient** (`kconfig/`)
    - Kconfig language server client
    - **Dependencies**: Logger

14. **LanguageTool** (`langTools/`)
    - Language model tool integration
    - **Dependencies**: Logger, idfConfiguration

15. **OpenOCDManager** (`espIdf/openOcd/openOcdManager.ts`)
    - OpenOCD server management
    - **Dependencies**: Logger, idfConfiguration

16. **QemuManager** (`qemu/qemuManager.ts`)
    - QEMU emulator management
    - **Dependencies**: Logger, idfConfiguration

17. **CommandDictionary** (`cmdTreeView/cmdStore.ts`)
    - Command registry and metadata
    - **Dependencies**: None

### Phase 5: Tree Providers & Views
18. **Tree Providers Registration**
    - CommandsProvider (`cmdTreeView/cmdTreeDataProvider.ts`)
    - ESPRainMakerTreeDataProvider (`rainmaker/`)
    - AppTraceTreeDataProvider (`espIdf/tracing/tree/`)
    - AppTraceArchiveTreeDataProvider (`espIdf/tracing/tree/`)
    - PartitionTreeDataProvider (`espIdf/partition-table/tree.ts`)
    - ESPEFuseTreeDataProvider (`efuse/view.ts`)
    - IdfComponentsDataProvider (`idfComponentsDataProvider.ts`)
    - **Dependencies**: Logger, ExtensionConfigStore

19. **Tracing Managers**
    - AppTraceManager (`espIdf/tracing/appTraceManager.ts`)
    - GdbHeapTraceManager (`espIdf/tracing/gdbHeapTraceManager.ts`)
    - **Dependencies**: Tree providers

20. **PeripheralTreeView** (`espIdf/debugAdapter/peripheralTreeView.ts`)
    - Debug peripheral viewer
    - **Dependencies**: Logger

### Phase 6: Status Bar & Workspace Setup
21. **Status Bar Items**
    - OpenOCD status bar
    - QEMU status bar
    - Workspace status bar items
    - **Dependencies**: CommandDictionary, workspaceConfig

22. **Workspace Initialization** (if workspace is open)
    - initSelectedWorkspace (`workspaceConfig.ts`)
    - getIdfTargetFromSdkconfig (`workspaceConfig.ts`)
    - CoverageRenderer (`coverage/renderer.ts`)
    - **Dependencies**: StatusBar, idfConfiguration

23. **UnitTest Controller** (`espIdf/unitTest/adapter.ts`)
    - Unit testing integration
    - **Dependencies**: Logger, context

### Phase 7: File Watchers & Event Handlers
24. **File System Watchers**
    - Source file watcher (CMakeLists.txt updates)
    - SDKConfig watcher
    - Kconfig menus watcher
    - **Dependencies**: Logger, workspaceConfig

25. **Debug Session Handlers**
    - onDidTerminateDebugSession
    - **Dependencies**: DebugAdapterManager, OpenOCDManager

### Phase 8: Command Registration
26. **Command Registration**
    - All `registerIDFCommand()` calls
    - Commands registered throughout the file
    - **Dependencies**: All previous modules

### Phase 9: Project Configuration Manager (Conditional)
27. **ProjectConfigurationManager** (`project-conf/ProjectConfigurationManager.ts`)
    - Multi-project configuration management
    - **Dependencies**: WorkspaceRoot, StatusBar, ExtensionConfigStore
    - Only initialized if workspace is open

## Module Dependency Details

### Core Foundation Modules

#### Logger (`logger/logger.ts`)
- **Purpose**: Centralized logging system
- **Dependencies**: None (foundation)
- **Used By**: All modules
- **Initialization**: First (Phase 1)

#### Config (`config.ts`)
- **Purpose**: Global constants and configuration namespaces
- **Dependencies**: ExtensionConfigStore, ProjectConfigStore, RainmakerStore
- **Used By**: Most modules
- **Initialization**: Early (Phase 1)

#### Utils (`utils.ts`)
- **Purpose**: Utility functions and helpers
- **Dependencies**: Logger
- **Used By**: Most modules
- **Initialization**: Early (Phase 1)

### Configuration Modules

#### idfConfiguration (`idfConfiguration.ts`)
- **Purpose**: ESP-IDF configuration parameter management
- **Dependencies**: Logger, Config, ProjectConfigStore
- **Used By**: Build, Flash, Monitor, Debug, etc.
- **Initialization**: Phase 2

#### ProjectConfigStore (`project-conf/`)
- **Purpose**: Project-specific configuration storage
- **Dependencies**: ExtensionConfigStore, Logger
- **Used By**: idfConfiguration, ProjectConfigurationManager
- **Initialization**: Phase 1

### Core Services

#### DebugAdapterManager (`espIdf/debugAdapter/debugAdapterManager.ts`)
- **Purpose**: Manages ESP-IDF debug adapter lifecycle
- **Dependencies**: Logger, idfConfiguration
- **Used By**: Debug commands, extension activation
- **Initialization**: Phase 4

#### OpenOCDManager (`espIdf/openOcd/openOcdManager.ts`)
- **Purpose**: OpenOCD server process management
- **Dependencies**: Logger, idfConfiguration
- **Used By**: Debug adapter, flash commands
- **Initialization**: Phase 4

#### QemuManager (`qemu/qemuManager.ts`)
- **Purpose**: QEMU emulator management
- **Dependencies**: Logger, idfConfiguration
- **Used By**: QEMU-related commands
- **Initialization**: Phase 4

### Feature Modules

#### Build (`build/`)
- **buildTask.ts**: Build task execution
- **buildCmd.ts**: Build command implementation
- **Dependencies**: Logger, idfConfiguration, workspaceConfig, TaskManager
- **Used By**: Build commands, Flash commands

#### Flash (`flash/`)
- **flashTask.ts**: Flash task execution
- **uartFlash.ts**: UART flashing
- **eraseFlashTask.ts**: Flash erasure
- **Dependencies**: Logger, idfConfiguration, workspaceConfig, Build, SerialPort
- **Used By**: Flash commands

#### Monitor (`espIdf/monitor/`)
- **Purpose**: Serial monitor for device output
- **Dependencies**: Logger, idfConfiguration, SerialPort
- **Used By**: Monitor commands

#### Menuconfig (`espIdf/menuconfig/`)
- **confServerProcess.ts**: Configuration server process
- **MenuconfigPanel.ts**: UI panel for menuconfig
- **Dependencies**: Logger, idfConfiguration, workspaceConfig
- **Used By**: Menuconfig commands

#### Partition Table (`espIdf/partition-table/`)
- **Purpose**: Partition table editor and management
- **Dependencies**: Logger, idfConfiguration, workspaceConfig
- **Used By**: Partition table commands

#### Size Analysis (`espIdf/size/`)
- **idfSize.ts**: Size analysis logic
- **idfSizePanel.ts**: UI panel
- **Dependencies**: Logger, idfConfiguration, workspaceConfig
- **Used By**: Size analysis commands

#### Tracing (`espIdf/tracing/`)
- **appTraceManager.ts**: Application tracing
- **gdbHeapTraceManager.ts**: Heap tracing via GDB
- **Dependencies**: Logger, idfConfiguration, workspaceConfig, DebugAdapterManager
- **Used By**: Tracing commands

### UI Modules

#### Setup Panel (`setup/`)
- **Purpose**: Initial setup wizard
- **Dependencies**: Logger, idfConfiguration, idfToolsManager
- **Used By**: Setup commands

#### Welcome Panel (`welcome/`)
- **Purpose**: Welcome screen
- **Dependencies**: Logger, ExtensionConfigStore
- **Used By**: Welcome commands

#### Views (`views/`)
- **Purpose**: Vue.js webviews for various features
- **Dependencies**: Vue, Pinia (runtime)
- **Used By**: Various UI commands

### Integration Modules

#### CDT Debug Adapter (`cdtDebugAdapter/`)
- **Purpose**: Eclipse CDT GDB debug adapter
- **Dependencies**: Logger, DebugAdapterManager
- **Used By**: Debug configurations

#### Clang (`clang/`)
- **Purpose**: Clang settings configuration
- **Dependencies**: Logger, idfConfiguration
- **Used By**: Clang configuration commands

#### Support (`support/`)
- **Purpose**: Troubleshooting and diagnostics
- **Dependencies**: Logger, idfConfiguration
- **Used By**: Doctor command, troubleshooting panel

## Key Dependencies Summary

### Most Dependent Modules (Used by many others)
1. **Logger** - Used by virtually all modules
2. **idfConfiguration** - Used by all feature modules
3. **Config** - Used by configuration and feature modules
4. **Utils** - Used by many utility functions

### Least Dependent Modules (Standalone)
1. **Logger** - No dependencies
2. **Config** - Only depends on stores
3. **CommandDictionary** - Standalone metadata

### Critical Path Modules (Must initialize successfully)
1. Logger
2. ExtensionConfigStore
3. ProjectConfigStore
4. idfConfiguration
5. DebugAdapterManager
6. OutputChannel

## Notes

- Modules in Phase 1-2 are critical and must initialize successfully
- Modules in Phase 3+ can fail gracefully without blocking activation
- File watchers and event handlers are registered after core services
- Commands are registered last, after all dependencies are available
- Some modules (like ProjectConfigurationManager) are only initialized conditionally based on workspace state

## Extension Commands Reference

This section lists all commands registered in `extension.ts`, grouped by related functionality.

### Build & Clean Commands

- `espIdf.buildDevice` - Build the ESP-IDF project
- `espIdf.buildApp` - Build application only
- `espIdf.buildBootloader` - Build bootloader only
- `espIdf.buildPartitionTable` - Build partition table only
- `espIdf.buildDFU` - Build for DFU flash method
- `espIdf.fullClean` - Clean build directory and extra paths
- `espIdf.idfReconfigureTask` - Reconfigure ESP-IDF project (CMake)
- `espIdf.customTask` - Execute custom task

### Flash Operations

- `espIdf.flashDevice` - Flash device (auto-detect encryption)
- `espIdf.flashUart` - Flash via UART
- `espIdf.flashDFU` - Flash via DFU
- `espIdf.jtag_flash` - Flash via JTAG
- `espIdf.flashAndEncryptDevice` - Flash and encrypt device
- `espIdf.flashAppUart` - Flash application via UART
- `espIdf.flashBootloaderUart` - Flash bootloader via UART
- `espIdf.flashPartitionTableUart` - Flash partition table via UART
- `espIdf.eraseFlash` - Erase flash memory
- `espIdf.selectFlashMethodAndFlash` - Select flash method and flash
- `espIdf.flashBinaryToPartition` - Flash binary to specific partition

### Monitor Commands

- `espIdf.monitorDevice` - Start serial monitor
- `espIdf.monitorQemu` - Start QEMU monitor
- `espIdf.buildFlashMonitor` - Build, flash, and monitor in sequence
- `espIdf.launchWSServerAndMonitor` - Launch WebSocket server and monitor

### Configuration & Menuconfig Commands

- `espIdf.menuconfig.start` - Start SDK Configuration Editor (menuconfig)
- `espIdf.createClassicMenuconfig` - Create classic menuconfig terminal
- `espIdf.saveDefSdkconfig` - Save default SDK configuration
- `espIdf.disposeConfserverProcess` - Dispose configuration server process
- `espIdf.selectConfTarget` - Select configuration target
- `espIdf.selectNotificationMode` - Select notification mode
- `espIdf.setTarget` - Set ESP-IDF target (chip)

### Project Management Commands

- `espIdf.createNewProject` - Create new ESP-IDF project
- `espIdf.importProject` - Import existing ESP-IDF project
- `espIdf.createNewComponent` - Create new ESP-IDF component
- `espIdf.createVsCodeFolder` - Create VS Code configuration folder
- `espIdf.createDevContainer` - Create development container configuration
- `espIdf.pickAWorkspaceFolder` - Select workspace folder
- `espIdf.getProjectName` - Get project name from build directory

### Component Management Commands

- `espIdf.addArduinoAsComponentToCurFolder` - Add Arduino as ESP-IDF component
- `espIdf.getEspAdf` - Get ESP-ADF (Audio Development Framework)
- `espIdf.getEspMdf` - Get ESP-MDF (Mesh Development Framework)
- `espIdf.getEspHomeKitSdk` - Get ESP HomeKit SDK
- `espIdf.getEspMatter` - Get ESP-Matter SDK
- `espIdf.getEspRainmaker` - Get ESP Rainmaker SDK
- `espIdf.setMatterDevicePath` - Set ESP-Matter device path
- `esp.component-manager.ui.show` - Show Component Manager UI

### Serial Port Commands

- `espIdf.selectPort` - Select serial port for flashing
- `espIdf.selectMonitorPort` - Select serial port for monitoring
- `espIdf.detectSerialPort` - Auto-detect serial port

### Debug & Tracing Commands

- `espIdf.debug` - Start debugging session
- `espIdf.apptrace` - Start/stop application tracing
- `espIdf.heaptrace` - Start/stop heap tracing
- `espIdf.apptrace.archive.refresh` - Refresh app trace archive
- `espIdf.apptrace.archive.showReport` - Show app trace archive report
- `espIdf.apptrace.customize` - Customize app trace configuration
- `espIdf.viewAsHex` - View debug variable as hexadecimal

### Partition Table Commands

- `espIdf.partition.table.refresh` - Refresh partition table view
- `espIdf.webview.partitionTableEditor` - Open partition table editor
- `espIdf.webview.nvsPartitionEditor` - Open NVS partition editor

### Size Analysis Commands

- `espIdf.size` - Analyze binary size

### Documentation & Search Commands

- `espIdf.searchInEspIdfDocs` - Search in ESP-IDF documentation
- `espIdf.openIdfDocument` - Open ESP-IDF document
- `espIdf.clearDocsSearchResult` - Clear documentation search results

### Setup & Welcome Commands

- `espIdf.setup.start` - Start ESP-IDF setup wizard
- `espIdf.welcome.start` - Show welcome panel
- `espIdf.newProject.start` - Start new project wizard

### Workspace & Configuration Commands

- `espIdf.selectCurrentIdfVersion` - Select ESP-IDF version
- `espIdf.clearSavedIdfSetups` - Clear saved IDF setups
- `espIdf.rmProjectConfStatusBar` - Remove project configuration status bar
- `espIdf.projectConfigurationEditor` - Open project configuration editor
- `espIdf.projectConf` - Select project configuration
- `espIdf.removeEspIdfSettings` - Remove ESP-IDF settings

### OpenOCD Commands

- `espIdf.openOCDCommand` - Start/stop OpenOCD server
- `espIdf.getOpenOcdConfigs` - Get OpenOCD configuration files
- `espIdf.selectOpenOcdConfigFiles` - Select OpenOCD configuration files
- `espIdf.getOpenOcdScriptValue` - Get OpenOCD script value
- `espIdf.OpenOcdAdapterStatusBar` - OpenOCD adapter status bar command

### QEMU Commands

- `espIdf.qemuCommand` - Start/stop QEMU emulator
- `espIdf.qemuDebug` - Start QEMU debugging session

### eFuse Commands

- `esp.efuse.summary` - Get eFuse summary for chip
- `espIdf.efuse.clearResults` - Clear eFuse results

### Unit Testing Commands

- `espIdf.unitTest.buildUnitTestApp` - Build unit test application
- `espIdf.unitTest.flashUnitTestApp` - Flash unit test application
- `espIdf.unitTest.buildFlashUnitTestApp` - Build and flash unit test application

### Coverage Commands

- `espIdf.genCoverage` - Generate code coverage report
- `espIdf.removeCoverage` - Remove coverage highlighting
- `espIdf.getCoverageReport` - Get coverage report

### Tools & Utilities Commands

- `espIdf.createIdfTerminal` - Create ESP-IDF terminal
- `espIdf.getToolchainGdb` - Get toolchain GDB path
- `espIdf.getToolchainGcc` - Get toolchain GCC path
- `espIdf.getExtensionPath` - Get extension installation path
- `espIdf.getIDFTarget` - Get current IDF target
- `espIdf.ninja.summary` - Get ninja build summary
- `espIdf.createSbom` - Create Software Bill of Materials (SBOM)
- `espIdf.setGcovConfig` - Set GCOV configuration
- `espIdf.setClangSettings` - Set Clang settings
- `espIdf.installPyReqs` - Install Python requirements
- `espIdf.installEspMatterPyReqs` - Install ESP-Matter Python requirements

### Rainmaker Commands

- `esp.rainmaker.backend.connect` - Connect to Rainmaker backend
- `esp.rainmaker.backend.logout` - Logout from Rainmaker backend
- `esp.rainmaker.backend.sync` - Sync with Rainmaker backend
- `esp.rainmaker.backend.add_node` - Add node to Rainmaker
- `esp.rainmaker.backend.remove_node` - Remove node from Rainmaker

### Error Hints & Troubleshooting Commands

- `espIdf.errorHints.clearAll` - Clear all error hints
- `espIdf.errorHints.clearBuildErrors` - Clear build error hints
- `espIdf.errorHints.clearOpenOCDErrors` - Clear OpenOCD error hints
- `espIdf.searchError` - Search for error hints
- `espIdf.doctorCommand` - Generate extension configuration report
- `espIdf.troubleshootPanel` - Open troubleshooting panel

### Hex View Commands

- `espIdf.hexView.deleteElement` - Delete hex view element
- `espIdf.hexView.copyValue` - Copy hex view value to clipboard
