.. _esp-idf-profile:

ESP-IDF Profile
===============

:link_to_translation:`zh_CN:[中文]`

The ESP-IDF extension for VS Code works best with specific companion extensions for full functionality. To simplify the setup process, we've created an ESP-IDF profile that bundles all necessary extensions and settings.

What is an ESP-IDF Profile?
---------------------------

An ESP-IDF profile is a collection of VS Code extensions, settings, and configurations specifically tailored for ESP-IDF development. Using this profile ensures that you have all the necessary tools for efficient ESP-IDF development without having to manually install and configure each extension.

Included Extensions
------------------

The ESP-IDF profile includes:

- **ESP-IDF Extension**: The main extension for ESP-IDF development
- **C/C++ Extension Pack**: A set of extensions for C++ development that includes:
  * C/C++: For IntelliSense, debugging, and code browsing
  * C/C++ Themes: Syntax highlighting and styling for C/C++
  * CMake Tools: For CMake project support

How to Import the ESP-IDF Profile
--------------------------------

1. Download the ESP-IDF profile from one of these sources:

   - `GitHub Gist <https://vscode.dev/editor/profile/github/b130f2ea4b7e1c07e08e459722ff0cb5>`_
   - `GitHub Repository <https://github.com/espressif/vscode-esp-idf-extension/blob/master/profiles/esp-idf.code-profile>`_
   - `Direct Download Link <https://raw.githubusercontent.com/espressif/vscode-esp-idf-extension/master/profiles/esp-idf.code-profile>`_

2. In VS Code:

   - Navigate to **File** > **Preferences** > **Profiles** > **Import Profile...**
   - Select the downloaded ``esp-idf.code-profile`` file
   - VS Code will import the profile with all necessary extensions and settings

3. Activate the profile:

   - After importing, VS Code will prompt you to activate the profile
   - Alternatively, go to **File** > **Preferences** > **Profiles** and select the "ESP-IDF" profile

Benefits of Using the ESP-IDF Profile
------------------------------------

- **Simplified Setup**: No need to manually install and configure multiple extensions
- **Consistent Environment**: Ensures all team members have the same clean development environment
- **Improved Performance**: Only the necessary extensions are loaded, reducing VS Code startup time and resource usage

Updating the Profile
------------------

The ESP-IDF profile will be periodically updated with new extensions and improved settings. To update your profile download the latest version from the links above and import it manually