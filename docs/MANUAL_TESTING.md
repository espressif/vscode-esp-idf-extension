# Here is an example guide to perform extension tests to ensure functionality of the basic functionality of the extension.

This could be used for template to generate testing report for the Espressif IDF extension for Visual Studio Code.

**VSCode Extension Test Report Template**

*Extension Name: Espressif IDF*
*Extension Version: [Extension Version]*
*Test Date: [Test Date]*

---

**Test Summary:**

This test report outlines the verification of the functionality of the **Espressif IDF** for the specified target. The primary focus of this testing is to ensure the correct operation of the following commands across all targets:

1. Setup [successful/acceptable]
2. Build [successful/acceptable]
3. Flash [successful/acceptable]
4. Monitor [successful/acceptable]

---

**Test Environment:**

- **VSCode Version:** [VSCode Version]
- **Extension Version:** [Extension Version]
- **Operating System:** [Operating System]
- **ESP-IDF Version:** [ESP-IDF Version]
- **IDF Target:** [IDF_TARGET under test]
- **Custom extra paths:** Containing all IDF Tools Path for current environment

Press menu **View**, click on **Command Palette** and type **ESP-IDF: Doctor Command**. You can copy the Extension Configuration Settings section here.

---

**Test Cases:**

*Note: Each test case should outline the steps taken, expected results, and actual results.*

**Test Case 1: Setup Command**

*Steps:*
1. Press menu **View**, click on **Command Palette** and type **ESP-IDF: Configure ESP-IDF extension** and select it.
2. A Window will load with several options. You can select where to save the setup settings. Select **Express** option.
3. Select download server : Github or Espressif (for Chinese mirrors).
4. Select ESP-IDF version to download, based on desired test.
5. Enter the ESP-IDF container directory (IDF_PATH).
6. Enter the ESP-IDF Tools directory (IDF_TOOLS_PATH).
7. Press the **Install** button.

*Expected Results:*
- IDF Git download and install progress
- IDF Python download and install progress
- ESP-IDF Download and install progress
- IDF Tools download and install progress (OpenOCD, Xtensa, etc.)
- Python Virtual environment creation Python packages install

*Actual Results:*
- [Results observed for all IDF targets]

**Test Case 2: Build Command**

*Steps:*
1. Open ESP-IDF project to test. You can create one using the menu **View**, click on **Command Palette** and type **ESP-IDF: Show Examples projects**, choose the **Use current ESP-IDF** framework (or other framework to test). A Window will appear with a list of examples to choose from. Pick one of these examples and click on the **Create project using example <name>** and choose where to create this new project. 
2. Press menu **View**, click on **Command Palette** and type **ESP-IDF: Set Espressif device target** and choose the **IDF_TARGET** for this testing report (esp32, esp32 S2 , etc.).
3. Press menu **View**, click on **Command Palette** and type **ESP-IDF: Build your project** and select it.

> **NOTE**: Each IDF_TARGET has to be built

*Expected Results:*
- The build process should complete without errors. Binaries are generated in the **build** subdirectory. There should be 2 tasks in the terminal window: **ESP-IDF Build** and **ESP-IDF Size**. The IDF Size task can be enable or disable with `idf.enableSizeTaskAfterBuildTask` configuration setting.

*Actual Results:*
- [Results observed]

**Test Case 3: Flash Command**

*Dependency*: Depends on Test Case 2

*Steps:*
1. Press menu **View**, click on **Command Palette** and type **ESP-IDF: Select port to use** and select it.
2. Choose the serial port to connect and the workspace folder where to save the `idf.port` configuration setting.
3. Press menu **View**, click on **Command Palette** and type **ESP-IDF: Flash your project** and select it.
4. Select the flash method UART. Flashing should begin after. 
> **NOTE:** JTAG and DFU flash test results could be added here or added in a separated test case.

*Expected Results:*
- The flashing process should complete without errors and the output is shown in the **ESP-IDF Flash** task terminal output.

*Actual Results:*
- [Results observed for all IDF targets]

**Test Case 4: Monitor Command**

*Dependency*: Depends on Test Case 2 and Test Case 3

*Steps:*
1. Press menu **View**, click on **Command Palette** and type **ESP-IDF: Select port to use** and select it.
2. Choose the serial port to connect and the workspace folder where to save the `idf.port` configuration setting.
3. Press menu **View**, click on **Command Palette** and type **ESP-IDF: Monitor your device** and select it.
4. ESP-IDF Monitor should begin after.

*Expected Results:*
- The monitor should display the expected output from the device for the given test project.

*Actual Results:*
- [Results observed for all IDF targets]

---

**Conclusion:**

The Espressif IDF extension for Visual Studio Code was tested for its commands (Build, Flash, Monitor, Setup) across the specified targets (esp32, esp32s2, esp32s3, esp32c3). The test results indicate whether each command works as expected for each target. The extension demonstrated [successful/acceptable] performance during testing, with only [mention any issues or limitations, if applicable]. It is recommended to address any identified issues before releasing the extension.

---

**Tester:**

Name: [Your Name]
Date: [Test Date]

**Approved By:**

Name: [Approver's Name]
Date: [Approval Date]

---

*Please note that this is a general template and should be adjusted according to your specific requirements, test environment and user configuration.*