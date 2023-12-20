There are 2 frameworks implemented in this Visual Studio Code extension to provide testing:

1. Unit Testing implemented with the Visual Studio Code extension Testing API as described in [here](https://code.visualstudio.com/api/working-with-extensions/testing-extension).

2. End to End Testing implemented using [RedHat-developer extension tester](https://github.com/redhat-developer/vscode-extension-tester) which allows to test for UI elements using Selenium web driver.

## Unit Tests

| Unit Test                                                                   | Test File                                  |
| --------------------------------------------------------------------------- | ------------------------------------------ |
| listAvailableDfuDevices mockdata test                                       | src/test/suite/dfu.test.ts                 |
| Download Correct                                                            | src/test/suite/downloadManager.test.ts     |
| Download Fail                                                               | src/test/suite/downloadManager.test.ts     |
| Validate File Checksum                                                      | src/test/suite/downloadManager.test.ts     |
| Install Zip                                                                 | src/test/suite/downloadManager.test.ts     |
| Install Targz                                                               | src/test/suite/downloadManager.test.ts     |
| Get Packages List                                                           | src/test/suite/idfToolsManager.test.ts     |
| Obtain Url for Current OS                                                   | src/test/suite/idfToolsManager.test.ts     |
| Verify Installed Version                                                    | src/test/suite/idfToolsManager.test.ts     |
| Verify All Packages Exists                                                  | src/test/suite/idfToolsManager.test.ts     |
| CSV2JSON Mockdata Test                                                      | src/test/suite/nvsPartitionTable.test.ts   |
| JSON2CSV Mockdata Test                                                      | src/test/suite/nvsPartitionTable.test.ts   |
| Row validation                                                              | src/test/suite/nvsPartitionTable.test.ts   |
| Key Field Empty Validation                                                  | src/test/suite/nvsPartitionTable.test.ts   |
| Key Field Max Character Length Validation                                   | src/test/suite/nvsPartitionTable.test.ts   |
| Type Field Empty Validation                                                 | src/test/suite/nvsPartitionTable.test.ts   |
| Type Field Value Namespace Validation                                       | src/test/suite/nvsPartitionTable.test.ts   |
| Type Field Value File Validation                                            | src/test/suite/nvsPartitionTable.test.ts   |
| Encoding Field Empty Validation                                             | src/test/suite/nvsPartitionTable.test.ts   |
| Value Field Empty Validation                                                | src/test/suite/nvsPartitionTable.test.ts   |
| Value Field Over 4000 Bytes for String Encoding                             | src/test/suite/nvsPartitionTable.test.ts   |
| Value Field Under 4000 Bytes for String Encoding                            | src/test/suite/nvsPartitionTable.test.ts   |
| Value Field Invalid Number for numberTypes Encoding                         | src/test/suite/nvsPartitionTable.test.ts   |
| Value Field Invalid Numbers for {i}                                         | src/test/suite/nvsPartitionTable.test.ts   |
| Value Field Testing Min and Max Number for \${i} Encoding                   | src/test/suite/nvsPartitionTable.test.ts   |
| Value Field Invalid Numbers for \${i}                                       | src/test/suite/nvsPartitionTable.test.ts   |
| CSV2JSON Mockdata Test                                                      | src/test/suite/partitionTable.test.ts      |
| Row Validation                                                              | src/test/suite/nvsPartitionTable.test.ts   |
| Name Field Empty Validation                                                 | src/test/suite/partitionTable.test.ts      |
| Name Field Too Long Validation                                              | src/test/suite/partitionTable.test.ts      |
| Type Field Empty Validation                                                 | src/test/suite/partitionTable.test.ts      |
| Type Field Input String Value Bigger Than 254 Validation                    | src/test/suite/partitionTable.test.ts      |
| Type Field Input String Value Smaller Than 0 Validation                     | src/test/suite/partitionTable.test.ts      |
| Type Field Input String Invalid                                             | src/test/suite/partitionTable.test.ts      |
| Type Field Input More Than 2 Hex Numbers After 0x Prefix                    | src/test/suite/partitionTable.test.ts      |
| Type Field Input is Not a Hex Number                                        | src/test/suite/partitionTable.test.ts      |
| Type Field Input 0xFF is Not Valid                                          | src/test/suite/partitionTable.test.ts      |
| Subtype Field Empty Validation                                              | src/test/suite/partitionTable.test.ts      |
| Subtype Field for Type App Random String                                    | src/test/suite/partitionTable.test.ts      |
| Subtype Field for Type App Valid Value Contained in a Longer String         | src/test/suite/partitionTable.test.ts      |
| Subtype Field for Type App 0x21 Should Be Invalid                           | src/test/suite/partitionTable.test.ts      |
| Subtype Field for Type App Invalid Hex Number                               | src/test/suite/partitionTable.test.ts      |
| Subtype Field for Type Data Valid String Value Contained in a Longer String | src/test/suite/partitionTable.test.ts      |
| Subtype Field for Type Data Valid Hex Value Contained in a Longer String    | src/test/suite/partitionTable.test.ts      |
| Subtype Field for Type Data 0x10 Should Be Invalid                          | src/test/suite/partitionTable.test.ts      |
| Subtype Field for Custom Type Valid Hex Value Contained in a Longer String  | src/test/suite/partitionTable.test.ts      |
| Subtype Field for Custom Type Random Invalid String Value                   | src/test/suite/partitionTable.test.ts      |
| Subtype Field for Custom 0xFF Should Be Invalid                             | src/test/suite/partitionTable.test.ts      |
| Offset Field Empty Validation                                               | src/test/suite/partitionTable.test.ts      |
| Offset Field Random Invalid String Input                                    | src/test/suite/partitionTable.test.ts      |
| Size Field Empty Validation                                                 | src/test/suite/partitionTable.test.ts      |
| Size Field Wrong Input Validation                                           | src/test/suite/partitionTable.test.ts      |
| Size Field Decimal Number Ending with M or K Validation                     | src/test/suite/partitionTable.test.ts      |
| Size Field Hex Number with 0x Validation                                    | src/test/suite/partitionTable.test.ts      |
| Get Platform Info                                                           | src/test/suite/PlatformInformation.test.ts |
| Gcov Executables Based on idfTarget                                         | src/test/suite/testCoverage.test.ts        |
| replaceUserPath                                                             | src/test/suite/writeReport.test.ts         |
| Should Return Supported Features                                            | src/test/adapter.test.ts                   |
| System Information                                                          | src/test/doctor.test.ts                    |
| Wrong Access to ESP-IDF Path                                                | src/test/doctor.test.ts                    |
| Wrong Cersion of ESP-IDF                                                    | src/test/doctor.test.ts                    |
| Wrong Access to Python Path                                                 | src/test/doctor.test.ts                    |
| Wrong Python                                                                | src/test/doctor.test.ts                    |
| Wrong Pip                                                                   | src/test/doctor.test.ts                    |
| wrong Extension Py Requirements                                             | src/test/doctor.test.ts                    |
| Wrong Debug Adapter Py Requirements                                         | src/test/doctor.test.ts                    |
| Wrong ESP-IDF Py Requirements                                               | src/test/doctor.test.ts                    |
| launch.json                                                                 | src/test/doctor.test.ts                    |
| c_cpp_properties.json                                                       | src/test/doctor.test.ts                    |
| Test Configuration Settings                                                 | src/test/doctor.test.ts                    |
| Good Extension Py Requirements                                              | src/test/doctor.test.ts                    |
| Good Debug Adapter Py Requirements                                          | src/test/doctor.test.ts                    |
| Good ESP-IDF Py Requirements                                                | src/test/doctor.test.ts                    |
| Good Configuration Access                                                   | src/test/doctor.test.ts                    |
| Match Git Version                                                           | src/test/doctor.test.ts                    |
| Match ESP-IDF Version                                                       | src/test/doctor.test.ts                    |
| Match Python Version                                                        | src/test/doctor.test.ts                    |
| Match Pip Version                                                           | src/test/doctor.test.ts                    |
| Match Python Packages                                                       | src/test/doctor.test.ts                    |
| Match Written Report                                                        | src/test/doctor.test.ts                    |
| OpenOCD ESP Config Structure                                                | src/test/oocdBoards.test.ts                |
| OpenOCD Boards Method                                                       | src/test/oocdBoards.test.ts                |
| Check Default Boards                                                        | src/test/oocdBoards.test.ts                |
| .vscode Folder Creation                                                     | src/test/project.test.ts                   |
| Launch.json Content                                                         | src/test/project.test.ts                   |
| cCppPropertiesJson.json Content                                             | src/test/project.test.ts                   |
| Test Project Creation                                                       | src/test/project.test.ts                   |
| Update Project Name                                                         | src/test/project.test.ts                   |
| Get Templates Projects                                                      | src/test/project.test.ts                   |
| Get Examples Projects                                                       | src/test/project.test.ts                   |
| Set Current Settings in Template                                            | src/test/project.test.ts                   |

## End-to-End Testing

| End to End Testing                         | Test File                              |
| ------------------------------------------ | -------------------------------------- |
| Find Install Options                       | src/ui-test/configure-test.ts          |
| Configure Using Express                    | src/ui-test/configure-test.ts          |
| Configure Using Advanced                   | src/ui-test/configure-test.ts          |
| Configure Using Existing Setup             | src/ui-test/configure-test.ts          |
| Build Bin is Generated                     | src/ui-test/project-build-test.ts      |
| Find Save Button Works                     | src/ui-test/project-menuconfig-test.ts |
| Find Compiler Toolprefix                   | src/ui-test/project-menuconfig-test.ts |
| Check Int Default Value                    | src/ui-test/project-menuconfig-test.ts |
| Check Hex Default Value                    | src/ui-test/project-menuconfig-test.ts |
| Check Bool Default Value                   | src/ui-test/project-menuconfig-test.ts |
| Check Choice Has Options and Default Value | src/ui-test/project-menuconfig-test.ts |
| Find The Example                           | src/ui-test/project-test.ts            |
| Create a Test Component                    | src/ui-test/project-test.ts            |
