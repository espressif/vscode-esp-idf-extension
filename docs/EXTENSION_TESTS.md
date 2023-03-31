There are 2 frameworks implemented in this Visual Studio Code extension to provide testing:

1. Unit testing implemented with the Visual Studio Code extension Testing API as described in [here](https://code.visualstudio.com/api/working-with-extensions/testing-extension).

2. End to end testing implemented using [RedHat-developer extension tester](https://github.com/redhat-developer/vscode-extension-tester) which allows to test for UI elements using Selenium web driver.

## Unit tests

| Unit test                                                                   | Test file                                  |
| --------------------------------------------------------------------------- | ------------------------------------------ |
| listAvailableDfuDevices mockdata test                                       | src/test/suite/dfu.test.ts                 |
| Download correct                                                            | src/test/suite/downloadManager.test.ts     |
| Download fail                                                               | src/test/suite/downloadManager.test.ts     |
| Validate file checksum                                                      | src/test/suite/downloadManager.test.ts     |
| Install zip                                                                 | src/test/suite/downloadManager.test.ts     |
| Install targz                                                               | src/test/suite/downloadManager.test.ts     |
| Get Packages List                                                           | src/test/suite/idfToolsManager.test.ts     |
| Obtain Url for current OS                                                   | src/test/suite/idfToolsManager.test.ts     |
| Verify installed version                                                    | src/test/suite/idfToolsManager.test.ts     |
| Verify all packages exists                                                  | src/test/suite/idfToolsManager.test.ts     |
| CSV2JSON mockdata test                                                      | src/test/suite/nvsPartitionTable.test.ts   |
| JSON2CSV mockdata test                                                      | src/test/suite/nvsPartitionTable.test.ts   |
| Row validation                                                              | src/test/suite/nvsPartitionTable.test.ts   |
| Key field empty validation                                                  | src/test/suite/nvsPartitionTable.test.ts   |
| Key field max character length validation                                   | src/test/suite/nvsPartitionTable.test.ts   |
| Type field empty validation                                                 | src/test/suite/nvsPartitionTable.test.ts   |
| Type field value namespace validation                                       | src/test/suite/nvsPartitionTable.test.ts   |
| Type field value file validation                                            | src/test/suite/nvsPartitionTable.test.ts   |
| Encoding field empty validation                                             | src/test/suite/nvsPartitionTable.test.ts   |
| Value field empty validation                                                | src/test/suite/nvsPartitionTable.test.ts   |
| Value field over 4000 bytes for string encoding                             | src/test/suite/nvsPartitionTable.test.ts   |
| Value field under 4000 bytes for string encoding                            | src/test/suite/nvsPartitionTable.test.ts   |
| Value field invalid number for numberTypes encoding                         | src/test/suite/nvsPartitionTable.test.ts   |
| Value field invalid numbers for {i}                                         | src/test/suite/nvsPartitionTable.test.ts   |
| Value field testing min and max number for \${i} encoding                   | src/test/suite/nvsPartitionTable.test.ts   |
| Value field invalid numbers for \${i}                                       | src/test/suite/nvsPartitionTable.test.ts   |
| CSV2JSON mockdata test                                                      | src/test/suite/partitionTable.test.ts      |
| Row validation                                                              | src/test/suite/nvsPartitionTable.test.ts   |
| Name field empty validation                                                 | src/test/suite/partitionTable.test.ts      |
| Name field too long validation                                              | src/test/suite/partitionTable.test.ts      |
| Type field empty validation                                                 | src/test/suite/partitionTable.test.ts      |
| Type field input string value bigger than 254 validation                    | src/test/suite/partitionTable.test.ts      |
| Type field input string value smaller than 0 validation                     | src/test/suite/partitionTable.test.ts      |
| Type field input string invalid                                             | src/test/suite/partitionTable.test.ts      |
| Type field input more than 2 hex numbers after 0x prefix                    | src/test/suite/partitionTable.test.ts      |
| Type field input is not a hex number                                        | src/test/suite/partitionTable.test.ts      |
| Type field input 0xFF is not valid                                          | src/test/suite/partitionTable.test.ts      |
| Subtype field empty validation                                              | src/test/suite/partitionTable.test.ts      |
| Subtype field for type app random string                                    | src/test/suite/partitionTable.test.ts      |
| Subtype field for type app valid value contained in a longer string         | src/test/suite/partitionTable.test.ts      |
| Subtype field for type app 0x21 should be invalid                           | src/test/suite/partitionTable.test.ts      |
| Subtype field for type app invalid hex number                               | src/test/suite/partitionTable.test.ts      |
| Subtype field for type data valid string value contained in a longer string | src/test/suite/partitionTable.test.ts      |
| Subtype field for type data valid hex value contained in a longer string    | src/test/suite/partitionTable.test.ts      |
| Subtype field for type data 0x10 should be invalid                          | src/test/suite/partitionTable.test.ts      |
| Subtype field for custom type valid hex value contained in a longer string  | src/test/suite/partitionTable.test.ts      |
| Subtype field for custom type random invalid string value                   | src/test/suite/partitionTable.test.ts      |
| Subtype field for custom 0xFF should be invalid                             | src/test/suite/partitionTable.test.ts      |
| Offset field empty validation                                               | src/test/suite/partitionTable.test.ts      |
| Offset field random invalid string input                                    | src/test/suite/partitionTable.test.ts      |
| Size field empty validation                                                 | src/test/suite/partitionTable.test.ts      |
| Size field wrong input validation                                           | src/test/suite/partitionTable.test.ts      |
| Size field decimal number ending with M or K validation                     | src/test/suite/partitionTable.test.ts      |
| Size field hex number with 0x validation                                    | src/test/suite/partitionTable.test.ts      |
| Get platform info                                                           | src/test/suite/PlatformInformation.test.ts |
| gcov executables based on idfTarget                                         | src/test/suite/testCoverage.test.ts        |
| replaceUserPath                                                             | src/test/suite/writeReport.test.ts         |
| should return supported features                                            | src/test/adapter.test.ts                   |
| System information                                                          | src/test/doctor.test.ts                    |
| Wrong access to ESP-IDF path                                                | src/test/doctor.test.ts                    |
| Wrong version of ESP-IDF                                                    | src/test/doctor.test.ts                    |
| Wrong access to Python path                                                 | src/test/doctor.test.ts                    |
| Wrong python                                                                | src/test/doctor.test.ts                    |
| Wrong pip                                                                   | src/test/doctor.test.ts                    |
| wrong extension py requirements                                             | src/test/doctor.test.ts                    |
| Wrong debug adapter py requirements                                         | src/test/doctor.test.ts                    |
| Wrong esp-idf py requirements                                               | src/test/doctor.test.ts                    |
| launch.json                                                                 | src/test/doctor.test.ts                    |
| c_cpp_properties.json                                                       | src/test/doctor.test.ts                    |
| Test configuration settings                                                 | src/test/doctor.test.ts                    |
| Good extension py requirements                                              | src/test/doctor.test.ts                    |
| Good debug adapter py requirements                                          | src/test/doctor.test.ts                    |
| Good esp-idf py requirements                                                | src/test/doctor.test.ts                    |
| Good configuration access                                                   | src/test/doctor.test.ts                    |
| Match git version                                                           | src/test/doctor.test.ts                    |
| Match ESP-IDF version                                                       | src/test/doctor.test.ts                    |
| Match python version                                                        | src/test/doctor.test.ts                    |
| Match pip version                                                           | src/test/doctor.test.ts                    |
| Match python packages                                                       | src/test/doctor.test.ts                    |
| Match written report                                                        | src/test/doctor.test.ts                    |
| OpenOCD esp config structure                                                | src/test/oocdBoards.test.ts                |
| OpenOCD Boards method                                                       | src/test/oocdBoards.test.ts                |
| Check default boards                                                        | src/test/oocdBoards.test.ts                |
| vscode folder creation                                                      | src/test/project.test.ts                   |
| Launch.json content                                                         | src/test/project.test.ts                   |
| cCppPropertiesJson.json content                                             | src/test/project.test.ts                   |
| Test project creation                                                       | src/test/project.test.ts                   |
| Update project name                                                         | src/test/project.test.ts                   |
| get templates projects                                                      | src/test/project.test.ts                   |
| get examples projects                                                       | src/test/project.test.ts                   |
| Set current settings in template                                            | src/test/project.test.ts                   |

## End to end testing

| End to end testing                         | Test file                              |
| ------------------------------------------ | -------------------------------------- |
| Find install options                       | src/ui-test/configure-test.ts          |
| Configure using Express                    | src/ui-test/configure-test.ts          |
| Configure using Advanced                   | src/ui-test/configure-test.ts          |
| Configure using existing setup             | src/ui-test/configure-test.ts          |
| Build bin is generated                     | src/ui-test/project-build-test.ts      |
| find Save button works                     | src/ui-test/project-menuconfig-test.ts |
| find compiler toolprefix                   | src/ui-test/project-menuconfig-test.ts |
| Check int default value                    | src/ui-test/project-menuconfig-test.ts |
| Check hex default value                    | src/ui-test/project-menuconfig-test.ts |
| Check bool default value                   | src/ui-test/project-menuconfig-test.ts |
| Check choice has options and default value | src/ui-test/project-menuconfig-test.ts |
| find the example                           | src/ui-test/project-test.ts            |
| Create a test component                    | src/ui-test/project-test.ts            |
