## Telemetry

We collects telemetry data, from vscode extension which is used to help understand how to improve the extension. For example, this usage data helps to debug issues, such as slow start-up times, and to prioritize new features.

While we appreciate the insights this data provides, we also know that not everyone wants to send usage data and you can disable telemetry as described in disable telemetry reporting.

### Disable telemetry reporting

If you like to opt-out of telemetry collection you can disable `idf.telemetry` settings to `false`.

Settings can be located inside **File > Preferences > Settings** (macOS: **Code > Preferences > Settings**), there you can search `idf.telemetry` and deselect the option.

> Please note change to this settings requires a restart of VSCode

All outbound telemetry goes through `Telemetry.sendEvent` and `Telemetry.sendException` in `src/common/telemetry.ts`. Sending is gated by `idf.telemetry` and is skipped in development (`VSCODE_EXTENSION_MODE`).

### Usage events

When telemetry is enabled, these named events are sent (`Telemetry.sendEvent`):

| Event                    | Source                                  | When                                                                        | Properties / measurements                                                                                                                                                                                                                                                         |
| ------------------------ | --------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `command`                | `src/common/registerCommand.ts`         | After every `registerIDFCommand` callback finishes, including failures      | `commandName`; `timeSpent` (ms). Getter helpers used by tasks and the UI are not sent: `espIdf.getToolchainGcc`, `espIdf.getToolchainGdb`, `espIdf.getExtensionPath`, `espIdf.getIDFTarget`, `espIdf.getOpenOcdConfigs`, `espIdf.getOpenOcdScriptValue`, `espIdf.getProjectName`. |
| `UserReport`             | `src/common/userNotificationManager.ts` | User clicks **Report** on an error toast                                    | `message` (notification string)                                                                                                                                                                                                                                                   |
| `UserTroubleshootReport` | `src/support/troubleshootPanel.ts`      | After a troubleshoot / doctor report is generated (success and catch paths) | `submitted`, `os`. The doctor text, form fields, and paths stay on the machine (clipboard / `report.txt`).                                                                                                                                                                        |

### Exception telemetry

Process and command failures are sent as exceptions. The only path to `Telemetry.sendException` is `Logger.error` / `Logger.errorNotify`. Duplicate exceptions are dropped using a fingerprint in `Telemetry.sendException`.

| Funnel                                | Source                        | When                                                                              | Notes                                                                                                                                                                              |
| ------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Logger.error` / `Logger.errorNotify` | `src/common/logger.ts`        | Any call that does not pass `sendTelemetry: false` (5th argument; default `true`) | Sets `capturedBy` to `Logger`. Other `Logger.error` call sites that still send all use this funnel.                                                                                |
| `handleError`                         | `src/common/error/handler.ts` | Command failures from `registerIDFCommand`                                        | Category `handleError ${commandId}`; metadata includes `command`. Known errors with Warning or Info severity are not sent as exceptions.                                           |
| `utils.spawn`                         | `src/utils.ts`                | Non-zero process exit                                                             | Category `src utils spawn`; metadata from `processInvocationMetadata`. Honors `sendToTelemetry` (default `true`).                                                                  |
| `utils.execChildProcess`              | `src/utils.ts`                | Spawn `error`, or stderr that is not an OpenOCD banner / warning                  | Categories `utils execChildProcess` and `utils execChildProcess stderr`. Always sends (no opt-out flag). OpenOCD version banners and warning-only stderr are not logged as errors. |

#### Exception properties

Custom properties include:

- `category` — call-site identifier (for example `src utils spawn` or `handleError espIdf.buildDevice`)
- `command` — VS Code command id when handled through `handleError`, or the sanitized executable name for wrapper spawn/exec failures
- `processCommand` — sanitized executable basename (`python`, `ninja`, `cmake`)
- `args` — sanitized argument list (path tokens reduced to basename, serial ports after `-p` / `--port` redacted, truncated)
- `script` — first `*.py` argument basename when present (`idf.py`, `esptool.py`)
- `taskName` — ESP-IDF task name for task failures (`ESP-IDF Build`, `ESP-IDF Flash`)
- `knownErrorCode` — `KnownError.code` when the logged error is a KnownError (`TaskFailedWithOutput`, `MISSING_DEPENDENCY`); omitted for plain `Error`s such as spawn/exec failures
- `givenMessage`, `errorMessage`, `errorStack`, `capturedBy`

Captured build or flash output is never sent. It stays in the local
`esp_idf_vsc_ext.log` file, while error messages replace long values with a size
marker (for example `"stdout": "[27431 chars]"`). Before leaving the machine,
`givenMessage`, `errorMessage` and `errorStack` are truncated (1000 and 4000
characters) and home-directory paths are replaced with `~` so user names are not
reported.

This inventory is manual. Update it when adding `Logger.error` / `Logger.errorNotify` or changing `sendTelemetry`. Duplicate calls that share the same file and `category` are listed once. `src/common/logger.ts` is omitted (`errorNotify` wraps `error`).

#### Call sites that send exceptions

| File                                              | Category                                                                       | API                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------- |
| `src/build/validation.ts`                         | `build saveBeforeBuild`                                                        | error                                              |
| `src/cmake/cmakeEditorPanel.ts`                   | `CmakeListsEditorPanel loadCMakeListSchema`                                    | errorNotify                                        |
| `src/common/PreCheck.ts`                          | `common PreCheck minIdfVersionCheck`                                           | error                                              |
| `src/common/PreCheck.ts`                          | `src utils espIdfVersionValidator`                                             | error                                              |
| `src/common/PreCheck.ts`                          | `src utils openOCDVersionValidator`                                            | error                                              |
| `src/common/activation.ts`                        | `activate checkCMakeContent`                                                   | error                                              |
| `src/common/activation.ts`                        | `activate checkExtensionActivationModeSetting`                                 | error                                              |
| `src/common/error/handler.ts`                     | `handleError ${commandId}`                                                     | error / errorNotify                                |
| `src/common/prepareEnv.ts`                        | `expandEnvVariablesForIdfSetup OPENOCD_SCRIPTS`                                | error                                              |
| `src/common/prepareEnv.ts`                        | `expandEnvVariablesForIdfSetup ProjectConfiguration.CURRENT_IDF_CONFIGURATION` | errorNotify                                        |
| `src/common/prepareEnv.ts`                        | `expandEnvVariablesForIdfSetup idf.customExtraVars`                            | errorNotify                                        |
| `src/component-manager/utils.ts`                  | `Component manager addDependency`                                              | error                                              |
| `src/component-manager/utils.ts`                  | `Component manager createProject`                                              | error                                              |
| `src/configuration/migrateWinSettings.ts`         | `migrateWinSettings`                                                           | error                                              |
| `src/debugAdapter/debugConfProvider.ts`           | `CDTDebugConfigurationProvider resolveDebugConfiguration`                      | error                                              |
| `src/efuse/manager.ts`                            | `readSummary`                                                                  | error                                              |
| `src/eim/downloadInstall.ts`                      | `checkEimExists`                                                               | error                                              |
| `src/eim/downloadInstall.ts`                      | `ensureEimPathInUserShell`                                                     | error                                              |
| `src/eim/getExistingSetups.ts`                    | `getEimIdfJson`                                                                | error                                              |
| `src/eim/pythonManager.ts`                        | `getEnvVarsFromIdfTools`                                                       | errorNotify                                        |
| `src/eim/pythonManager.ts`                        | `pythonManager getUnixPythonList`                                              | errorNotify                                        |
| `src/eim/verifySetup.ts`                          | `verifySetup isIdfSetupValid`                                                  | error                                              |
| `src/espIdf/arduino/addArduinoComponent.ts`       | `addArduinoComponent cloneArduinoInComponentsFolder`                           | errorNotify                                        |
| `src/espIdf/communications/ws/index.ts`           | `WSServer start`                                                               | errorNotify                                        |
| `src/espIdf/core-dump/esp-core-dump-py-tool.ts`   | `ESPCoreDumpPyTool generateCoreELFFile`                                        | error                                              |
| `src/espIdf/hints/openocdhint.ts`                 | `OpenOCDErrorMonitor setHintsData`                                             | error                                              |
| `src/espIdf/hints/utils.ts`                       | `getOpenOcdHintsYmlPath`                                                       | error                                              |
| `src/espIdf/nvs/partitionTable/panel.ts`          | `NVSPartitionTable generateNvsPartition`                                       | errorNotify                                        |
| `src/espIdf/nvs/partitionTable/panel.ts`          | `NVSPartitionTable generateNvsPartition pythonBinPath`                         | errorNotify                                        |
| `src/espIdf/nvs/partitionTable/panel.ts`          | `NVSPartitionTable generateNvsPartition, IDF_PATH`                             | errorNotify                                        |
| `src/espIdf/nvs/partitionTable/panel.ts`          | `NVSPartitionTable generateNvsPartition, toolsPath`                            | errorNotify                                        |
| `src/espIdf/openOcd/boardConfiguration.ts`        | `boardConfiguration getBoards`                                                 | error                                              |
| `src/espIdf/openOcd/boardConfiguration.ts`        | `boardConfiguration getOpenOcdScripts`                                         | error                                              |
| `src/espIdf/setTarget/DevkitsCommand.ts`          | `DevkitsCommand`                                                               | error                                              |
| `src/espIdf/unitTest/adapter.ts`                  | `unitTest runHandler configureUnityApp`                                        | error                                              |
| `src/espIdf/unitTest/configure.ts`                | `configureUnityApp`                                                            | error                                              |
| `src/flash/transports/jtag/flashTclClient.ts`     | `jtagFlash onError`                                                            | error                                              |
| `src/flash/verify/canFlash.ts`                    | `flashCmd verifyCanFlash getProjectElfFilePath`                                | error                                              |
| `src/flash/verify/canFlash.ts`                    | `verifyCanFlash selectPort`                                                    | error                                              |
| `src/flash/verify/flashEncryption.ts`             | `verifyFlashEncryption !ESP.FlashType.UART`                                    | errorNotify                                        |
| `src/flash/verify/flashEncryption.ts`             | `verifyFlashEncryption !valueEncryptionEnabled`                                | errorNotify                                        |
| `src/flash/verify/flashEncryption.ts`             | `verifyFlashEncryption checkFlashEncryption`                                   | errorNotify                                        |
| `src/flash/verify/flashEncryption.ts`             | `verifyFlashEncryption missing encryption key`                                 | error                                              |
| `src/flash/verify/flashEncryption.ts`             | `verifyFlashEncryption readSummary`                                            | errorNotify                                        |
| `src/newProject/newProjectInit.ts`                | `getNewProjectArgs getSerialPort`                                              | error                                              |
| `src/newProject/newProjectPanel.ts`               | `NewProjectPanel createProject`                                                | errorNotify                                        |
| `src/project-conf/ProjectConfigurationManager.ts` | `ProjectConfigurationManager createProjectConfiguration`                       | errorNotify                                        |
| `src/project-conf/ProjectConfigurationManager.ts` | `ProjectConfigurationManager handleConfigFileChange`                           | errorNotify                                        |
| `src/project-conf/ProjectConfigurationManager.ts` | `ProjectConfigurationManager handleConfigFileCreate`                           | errorNotify                                        |
| `src/project-conf/ProjectConfigurationManager.ts` | `ProjectConfigurationManager handleLegacyMigrationDialog`                      | errorNotify                                        |
| `src/project-conf/ProjectConfigurationManager.ts` | `ProjectConfigurationManager initialize`                                       | errorNotify                                        |
| `src/project-conf/ProjectConfigurationManager.ts` | `ProjectConfigurationManager performMigration`                                 | errorNotify                                        |
| `src/project-conf/ProjectConfigurationManager.ts` | `ProjectConfigurationManager selectProjectConfiguration`                       | errorNotify                                        |
| `src/project-conf/presetsWriter.ts`               | `readPresetsDocument project-conf`                                             | error                                              |
| `src/project-conf/presetsWriter.ts`               | `updateCurrentProjectConfiguration project-conf`                               | errorNotify                                        |
| `src/rainmaker/client/index.ts`                   | `RainmakerAPIClient throwUnknownError`                                         | error                                              |
| `src/rainmaker/index.ts`                          | `extension rainmaker Uri handler`                                              | errorNotify                                        |
| `src/rainmaker/oauth/index.ts`                    | `RainmakerOAuthManager openExternalOAuthURL`                                   | errorNotify                                        |
| `src/support/index.ts`                            | `extension DoctorCommand`                                                      | error                                              |
| `src/support/troubleshootPanel.ts`                | `TroubleshootingPanel createTroubleshootingReport`                             | error                                              |
| `src/uninstall.ts`                                | `extension removeEspIdfSettings`                                               | error                                              |
| `src/utils.ts`                                    | `robustMove`                                                                   | error                                              |
| `src/utils.ts`                                    | `src utils spawn`                                                              | error (gated by `sendToTelemetry`, default `true`) |
| `src/utils.ts`                                    | `utils checkGitExists`                                                         | errorNotify                                        |
| `src/utils.ts`                                    | `utils execChildProcess`                                                       | error                                              |
| `src/utils.ts`                                    | `utils execChildProcess stderr`                                                | error                                              |
| `src/utils.ts`                                    | `utils getToolchainPath`                                                       | errorNotify                                        |

### Log-only (not sent)

Expected local state is logged to `esp_idf_vsc_ext.log` only (`Logger.error` 5th argument `false`).

| File                                                    | Category                                                   | API                 |
| ------------------------------------------------------- | ---------------------------------------------------------- | ------------------- |
| `src/changelog-viewer.ts`                               | `showChangeLogAndUpdateVersion`                            | errorNotify         |
| `src/clang/checkClangExtension.ts`                      | `checkAndPromptForClangdExtension`                         | error               |
| `src/clang/checkClangExtension.ts`                      | `checkClangExtension restartClangdLanguageServer`          | error               |
| `src/clang/index.ts`                                    | `clang index configureClangSettings`                       | error               |
| `src/clang/index.ts`                                    | `clang index createClangdFile`                             | error               |
| `src/cmake/srcsWatcher.ts`                              | `updateSrcsInCmakeLists`                                   | error               |
| `src/common/activation.ts`                              | `checkAndNotifyMissingCompileCommands`                     | error               |
| `src/common/configurationChange.ts`                     | `refreshUnitTestController`                                | error               |
| `src/common/customNotifications.ts`                     | `showNotificationWithMultipleActions`                      | error               |
| `src/common/error/openTaskFailedChat.ts`                | `openTaskFailedOutputInAiChat`                             | error               |
| `src/common/store.ts`                                   | `getSelectedWorkspaceFolder`                               | errorNotify         |
| `src/configuration/workspace.ts`                        | `workspaceConfig getProjectDescriptionJson`                | error               |
| `src/configuration/workspace.ts`                        | `workspaceConfig getSdkconfigPath`                         | error               |
| `src/coverage/coverageService.ts`                       | `coverageService generateCoverageForEditors`               | error               |
| `src/coverage/coverageService.ts`                       | `coverageService previewReport`                            | errorNotify         |
| `src/coverage/gcdaPaths.ts`                             | `gcdaPaths getGcovData`                                    | error               |
| `src/debugAdapter/imageViewPanel.ts`                    | `ImageViewPanel correctEndianness`                         | error               |
| `src/debugAdapter/imageViewPanel.ts`                    | `ImageViewPanel extractDataAddressFromCFile`               | error               |
| `src/debugAdapter/imageViewPanel.ts`                    | `ImageViewPanel extractDataArrayFromCFile`                 | error               |
| `src/debugAdapter/imageViewPanel.ts`                    | `ImageViewPanel loadDefaultConfigs`                        | error               |
| `src/debugAdapter/imageViewPanel.ts`                    | `ImageViewPanel loadImageFromFile`                         | error               |
| `src/debugAdapter/imageViewPanel.ts`                    | `ImageViewPanel loadUserConfigs`                           | error               |
| `src/debugAdapter/imageViewPanel.ts`                    | `ImageViewPanel parseArrayContent`                         | error               |
| `src/debugAdapter/imageViewPanel.ts`                    | `ImageViewPanel parseImageDataFromCFile`                   | error               |
| `src/debugAdapter/svd/peripheralTreeView.ts`            | `peripheralTreeView debugSessionStarted`                   | error               |
| `src/debugAdapter/svd/peripheralTreeView.ts`            | `peripheralTreeView debugSessionStarted alreadyInTreeView` | errorNotify         |
| `src/eim/loadSettings.ts`                               | `loadSettings getEnvVariablesFromActivationScript`         | error               |
| `src/espIdf/documentation/getDocsVersion.ts`            | `getDocsVersion`                                           | error               |
| `src/espIdf/documentation/getDocsVersion.ts`            | `getDocsVersion downloadFile`                              | error               |
| `src/espIdf/documentation/getDocsVersion.ts`            | `getDocsVersion getDocsLocaleLang`                         | error               |
| `src/espIdf/documentation/getDocsVersion.ts`            | `getDocsVersion getDocsUrl`                                | error               |
| `src/espIdf/hints/openocdhint.ts`                       | `analyzeErrors`                                            | error               |
| `src/espIdf/hints/openocdhint.ts`                       | `showErrorHint`                                            | error               |
| `src/espIdf/hints/provider.ts`                          | `ErrorHintProvider searchError`                            | error / errorNotify |
| `src/espIdf/hints/provider.ts`                          | `ErrorHintProvider showOpenOCDErrorHint`                   | error               |
| `src/espIdf/idfComponent/treeDataProvider.ts`           | `IDFTreeDataProvider getComponentsInProject`               | errorNotify         |
| `src/espIdf/menuconfig/confserver/confServerProcess.ts` | `ConfserverProcess printError`                             | error               |
| `src/espIdf/menuconfig/panel/panel.ts`                  | `MenuconfigPanel Unrecognized command`                     | error               |
| `src/espIdf/monitor/getMonitorBaudRate.ts`              | `src utils getMonitorBaudRate`                             | error               |
| `src/espIdf/monitor/terminal.ts`                        | `IDFMonitor.dispose`                                       | error               |
| `src/espIdf/nvs/partitionTable/panel.ts`                | `NVSPartitionTable getCSVFromFile`                         | errorNotify         |
| `src/espIdf/nvs/partitionTable/panel.ts`                | `NVSPartitionTable showErrorMessage`                       | errorNotify         |
| `src/espIdf/nvs/partitionTable/panel.ts`                | `NVSPartitionTable writeCSVDataToFile`                     | errorNotify         |
| `src/espIdf/openOcd/adapterSerial.ts`                   | `clearAdapterSerial`                                       | error               |
| `src/espIdf/openOcd/adapterSerial.ts`                   | `getStoredAdapterSerial`                                   | error               |
| `src/espIdf/openOcd/adapterSerial.ts`                   | `storeAdapterSerial`                                       | error               |
| `src/espIdf/openOcd/openOcdManager.ts`                  | `OpenOCDManager close`                                     | error               |
| `src/espIdf/openOcd/openOcdManager.ts`                  | `OpenOCDManager stderr`                                    | error               |
| `src/espIdf/partition-table/panel.ts`                   | `PartitionTableEditorPanel showErrorMessage`               | errorNotify         |
| `src/espIdf/partition-table/panel.ts`                   | `PartitionTableEditorPanel writeCSVDataToFile`             | errorNotify         |
| `src/espIdf/serial/serialPort.ts`                       | `serialPort detectDefaultPort`                             | error               |
| `src/espIdf/size/idfSizePanel.ts`                       | `IDFSizePanel unrecognized command`                        | error               |
| `src/espIdf/tracing/appTracePanel.ts`                   | `AppTracePanel`                                            | error               |
| `src/espIdf/tracing/appTracePanel.ts`                   | `AppTracePanel unrecognized command`                       | error               |
| `src/espIdf/unitTest/unityRunner/serialCapture.ts`      | `UnitySerialCapture connect`                               | error               |
| `src/espIdf/unitTest/unityRunner/serialCapture.ts`      | `UnitySerialCapture hardReset`                             | error               |
| `src/espIdf/unitTest/unityRunner/serialCapture.ts`      | `UnitySerialCapture listPorts`                             | error               |
| `src/espIdf/unitTest/unityRunner/serialCapture.ts`      | `UnitySerialCapture port error`                            | error               |
| `src/idfToolsManager.ts`                                | `IdfToolsManager checkBinariesVersion`                     | error               |
| `src/langTools/index.ts`                                | `langToolsInvoke`                                          | error               |
| `src/rainmaker/view/index.ts`                           | `ESPRainMakerTreeDataProvider getChildren`                 | errorNotify         |
| `src/statusBar/index.ts`                                | `createCmdsStatusBarItems`                                 | error               |
| `src/taskManager/outputCapturePseudoTerminal.ts`        | `OutputCapturingPseudoterminal writeEpilogue`              | error               |
| `src/utils.ts`                                          | `src utils canAccessFile`                                  | error               |
| `src/welcome/welcomeInit.ts`                            | `loadDeveloperPortalArticles`                              | error               |

`spawn({ sendToTelemetry: false })` (not a `Logger.error` call) is used in `src/espIdf/serial/serialPort.ts` and `src/eim/downloadInstall.ts` (`isEimGuiCapable`).
