# Onboarding ESP-IDF Extension

When you start ESP-IDF extension, the onboarding window can help you set up ESP-IDF, ESP-IDF Tools and their Python requirements.


## Prerequisites

Install [ESP-IDF Prerequisites](https://docs.espressif.com/projects/esp-idf/en/latest/get-started/index.html#step-1-install-prerequisites) for your operating system.

For this extension you also need [Python](https://www.python.org/download) and [Git](https://www.python.org/downloads).

## How to install correctly this extension

1. Press **START** on the onboarding window and check that git is installed. Also select the Python executable to use in this extension. The python executable is saved in **idf.pythonBinPath** or **idf.pythonBinPathWin** for Windows users.

2. Go to **Configure ESP-IDF** to download ESP-IDF or select existing ESP-IDF folder in your system. In this window you can select the version you wish to download and the path to install it or you can select ESP-IDF directory, which will be validated.

3. Go to **Configure ESP-IDF Tools** will allow you to download required ESP-IDF Tools or manually set them. 
    1. If you are downloading them, choose the directory where to install it (DEFAULT:**$HOME\.espressif** for Linux/MacOS users or **%USER_PROFILE%\.espressif** for Windows users) which will saved as **idf.customExtraPaths**. After installing the ESP-IDF Tools, a virtual environment will be created for ESP-IDF in the previous specified directory and the python executable will be replaced with this one.
4. After you download the ESP-IDF Tools these tools will be set **idf.customExtraPaths** and **idf.customExtraVars** (such as OPENOCD_SCRIPTS) so you can verify each tool version the python requirements.
    If you choose to skip the tools download, you need to manually set **idf.customExtraPaths** by typing all required tools executable location separated by ; (Windows users) or : (Linux/MacOS users). For example if OpenOCD is in \Users\myName\.espressif\tools\openocd\version\openocd-esp32\bin\openocd and XtensaEsp32 is in \Users\myName\.espressif\tools\xtensa\version\xtensa-esp32\bin\xtensa-esp32-gcc you need to set **\Users\myName\.espressif\tools\openocd\version\openocd-esp32\bin:\Users\myName\.espressif\tools\xtensa\version\xtensa-esp32\bin** for Linux/MacOS users. The list of required **idf.customExtraVars** will be shown and they should be filled for the extension to work properly.
5. After verifying tools and required python packages, the extension has been configured correctly. An option to open **ESP-IDF: Show examples** is shown.

## Notes

Consider that installing ESP-IDF Python Requirements (In Step 2) will fail if your **idf.pythonBinPathWin** is set to a Python virtual environment executable.

Make sure the selected directory for ESP-IDF Tools is empty before installing tools to avoid installation errors.

If you try to download ESP-IDF in a directory where a folder esp-idf already exists an error will be shown. Please delete this esp-idf folder or choose another destination directory.