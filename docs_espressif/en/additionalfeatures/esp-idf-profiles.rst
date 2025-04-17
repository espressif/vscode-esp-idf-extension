.. _esp-idf-profiles:

ESP-IDF VS Code Profiles
========================

:link_to_translation:`zh_CN:[中文]`

The ESP-IDF extension for VS Code works best with specific companion extensions for full C/C++ language support (like IntelliSense, code navigation, debugging) and CMake integration. To simplify the setup process, we provide official VS Code profiles that bundle recommended extensions and settings.

What is a VS Code Profile?
--------------------------

A VS Code profile (`.code-profile`) is a collection of extensions, settings, UI state, and keyboard shortcuts. Using an official ESP-IDF profile ensures that you have a curated set of tools optimized for ESP-IDF development without needing to manually install and configure each component.

Available ESP-IDF Profiles
--------------------------

We offer two primary profiles tailored to different C/C++ language server preferences:

**1. Default Profile (`ESP-IDF`)**

* **C/C++ Tooling**: Uses the **Microsoft C/C++ Extension Pack** (`ms-vscode.cpptools-extension-pack`). This includes the `ms-vscode.cpptools` extension, which provides IntelliSense, debugging, and code Browse features widely used in VS Code for C/C++ development.
* **Included Key Extensions**:
    * `espressif.esp-idf-extension` (ESP-IDF)
    * `ms-vscode.cpptools-extension-pack` (C/C++ Extension Pack)
    * `ms-vscode.cmake-tools` (CMake Tools)
* **Recommendation**: This profile is recommended for most users and provides a comprehensive C/C++ development experience based on Microsoft's standard tooling. The internal profile name in VS Code is **`ESP-IDF`**.

**2. Clangd Profile (`ESP-IDF (clangd)`)**

* **C/C++ Tooling**: Uses **`clangd`** (`llvm-vs-code-extensions.vscode-clangd`) as the C/C++ language server. `clangd` is part of the LLVM project and provides features like code completion, diagnostics, and navigation based on the Clang compiler infrastructure.
* **Included Key Extensions**:
    * `espressif.esp-idf-extension` (ESP-IDF)
    * `llvm-vs-code-extensions.vscode-clangd` (clangd)
    * `ms-vscode.cmake-tools` (CMake Tools)
* **Recommendation**: This profile is suitable for users who specifically prefer or require `clangd` for their C/C++ language support, potentially due to project requirements, specific `clangd` features, or personal preference for LLVM-based tooling. The internal profile name in VS Code is **`ESP-IDF (clangd)`**.

How to Import an ESP-IDF Profile
--------------------------------

1.  Choose the profile that best suits your C/C++ tooling preference and download its `.code-profile` file from one of the following sources:

    * **Default Profile (`ESP-IDF`)**: (Uses Microsoft C/C++ Tools)
        * `Default Profile GitHub Repository <https://github.com/espressif/vscode-esp-idf-extension/blob/master/profiles/esp-idf.code-profile>`_
        * `Defualt Profile Direct Download Link <https://raw.githubusercontent.com/espressif/vscode-esp-idf-extension/master/profiles/esp-idf.code-profile>`_

    * **Clangd Profile (`ESP-IDF (clangd)`)**: (Uses clangd)
        * `Clangd Profile GitHub Repository <https://github.com/espressif/vscode-esp-idf-extension/blob/master/profiles/esp-idf-clangd.code-profile>`_
        * `Clangd Profile Download Link <https://raw.githubusercontent.com/espressif/vscode-esp-idf-extension/master/profiles/esp-idf-clangd.code-profile>`_

2.  In VS Code:
    * Navigate to **File** > **Preferences** > **Profiles** > **Import Profile...**
    * Select the downloaded `.code-profile` file (e.g., `esp-idf.code-profile` or `esp-idf-clangd.code-profile`).
    * Review the extensions and settings included in the preview and click **Import Profile**.

3.  Activate the profile:
    * After importing, VS Code may prompt you to switch to the new profile.
    * Alternatively, go to **File** > **Preferences** > **Profiles** and select the profile you imported (either **`ESP-IDF`** or **`ESP-IDF (clangd)`**). The profile will be active for the current workspace.

Benefits of Using an ESP-IDF Profile
------------------------------------

- **Simplified Setup**: Avoids manual installation and configuration of multiple extensions.
- **Optimized Environment**: Ensures you have a curated set of tools known to work well with the ESP-IDF extension.
- **Consistency**: Useful for teams to maintain a consistent development environment.
- **Improved Performance**: Can potentially reduce VS Code resource usage by only enabling the necessary extensions within the profile context.

Updating the Profile
--------------------

The ESP-IDF profiles may be periodically updated. To get the latest version, download the desired profile again from the links above and re-import it using the same steps. VS Code will allow you to overwrite the existing profile.