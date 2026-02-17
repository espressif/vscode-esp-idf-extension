.. _extension-activation:

Extension Activation
====================

This document explains how the ESP-IDF extension decides whether to activate when you open a workspace in Visual Studio Code.

Overview
--------

The extension uses a smart activation system that respects your explicit configuration while providing sensible defaults. This system was designed to solve issue `#1756 <https://github.com/espressif/vscode-esp-idf-extension/issues/1756>`_ where users with custom CMake setups couldn't activate the extension.

Activation Priority Hierarchy
------------------------------

The extension follows a strict priority hierarchy when deciding whether to activate:

1. **Workspace/Global Setting = true**
   
   - **Action**: Activate immediately
   - **Skips**: All other checks (CMake detection, folder checks)
   - **Use case**: Force-enable the extension for custom project layouts
   - **Setting location**: User Settings or Workspace Settings

2. **Workspace/Global Setting = false**
   
   - **Action**: Do NOT activate, exit immediately
   - **Overrides**: All folder-level settings
   - **No prompt shown**: Respects your explicit choice
   - **Use case**: Explicitly disable extension in specific workspaces

3. **ANY Folder Setting = true**
   
   - **Action**: Activate immediately ("true wins" strategy)
   - **Order independent**: Checks all folders, not just the first
   - **Use case**: Multi-root workspace with at least one ESP-IDF project
   - **Setting location**: Folder Settings in ``.vscode/settings.json``

4. **ALL Folder Settings = false**
   
   - **Action**: Do NOT activate, exit immediately
   - **No prompt shown**: Respects explicit configuration
   - **Use case**: Multi-root workspace explicitly excluding ESP-IDF

5. **All Settings Unset** (Default Behavior)
   
   - **Action**: Fallback to automatic CMakeLists.txt detection
   - **Detection**: Searches for ``include($ENV{IDF_PATH}/tools/cmake/project.cmake)``
   - **If not found**: Prompts with "Activate Anyway" dialog
   - **Use case**: Standard ESP-IDF projects (backward compatible)

Configuration Setting
---------------------

The setting that controls extension activation is:

.. code-block:: json

   {
     "espIdf.isEspIdfProject": true  // or false, or leave unset
   }

**Setting Scope:**

- **User (Global)**: ``~/.config/Code/User/settings.json`` (Linux/macOS) or ``%APPDATA%\Code\User\settings.json`` (Windows)
- **Workspace**: ``.vscode/settings.json`` in workspace root
- **Folder**: ``.vscode/settings.json`` in specific folder (multi-root workspaces)

**Default Value:** ``false`` (but unset = use automatic detection)

Usage Examples
--------------

Force Enable for Custom Projects
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you have a custom CMake setup that doesn't use the standard ESP-IDF ``project.cmake`` include:

**Workspace Settings** (``.vscode/settings.json``):

.. code-block:: json

   {
     "espIdf.isEspIdfProject": true
   }

This will activate the extension regardless of your CMakeLists.txt content.

Disable Extension in Specific Workspace
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you want to prevent the extension from activating in a non-ESP-IDF workspace:

**Workspace Settings** (``.vscode/settings.json``):

.. code-block:: json

   {
     "espIdf.isEspIdfProject": false
   }

The extension will not activate, and no prompt will be shown.

Multi-Root Workspace with Mixed Projects
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For a workspace with both ESP-IDF and non-ESP-IDF projects:

**Workspace File** (``my-workspace.code-workspace``):

.. code-block:: json

   {
     "folders": [
       {
         "path": "esp32-firmware",
         "settings": {
           "espIdf.isEspIdfProject": true
         }
       },
       {
         "path": "documentation",
         "settings": {
           "espIdf.isEspIdfProject": false
         }
       },
       {
         "path": "web-interface"
         // No setting - will not affect activation
       }
     ]
   }

In this example, the extension will activate because the ``esp32-firmware`` folder has ``true`` set (Priority #3: "true wins").

Standard ESP-IDF Project (No Configuration Needed)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For standard ESP-IDF projects with the typical CMakeLists.txt structure:

**CMakeLists.txt** (project root):

.. code-block:: cmake

   cmake_minimum_required(VERSION 3.16)
   include($ENV{IDF_PATH}/tools/cmake/project.cmake)
   project(my-project)

No setting needed—the extension will automatically detect this as an ESP-IDF project (Priority #5).

Performance Optimizations
--------------------------

The activation logic is designed for optimal performance:

1. **Early Exit on Global False**: If workspace/global setting is ``false``, the extension exits immediately without checking folders or reading files.

2. **Early Exit on Any True**: When any folder has ``true``, the extension stops checking remaining folders.

3. **Skip CMake Detection**: If any explicit ``true`` is found, CMake file detection is entirely skipped.

4. **Lazy File Reading**: CMakeLists.txt files are only read when all settings are unset.

Common Activation Issues
------------------------

Extension Not Activating
~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**: ESP-IDF commands not available, no extension features working.

**Possible causes**:

1. **Explicit false setting**: Check if ``espIdf.isEspIdfProject`` is set to ``false`` in User, Workspace, or Folder settings.

   **Solution**: Set it to ``true`` or remove the setting.

2. **Non-standard CMakeLists.txt**: Your project doesn't include the standard ESP-IDF project.cmake line.

   **Solution**: Add ``"espIdf.isEspIdfProject": true`` to workspace settings.

3. **Prompt dismissed**: You dismissed the "Activate Anyway" dialog.

   **Solution**: Reload the window (``Ctrl+Shift+P`` → "Developer: Reload Window") and choose "Activate Anyway" when prompted.

Extension Activating in Wrong Workspace
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**: ESP-IDF extension activated in a non-ESP-IDF project.

**Solution**: Add ``"espIdf.isEspIdfProject": false`` to workspace settings to explicitly disable it.

Multi-Root Workspace Issues
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**: Extension not activating even though one folder is an ESP-IDF project.

**Possible cause**: A workspace-level ``false`` setting is overriding folder settings.

**Solution**: Remove the workspace-level ``espIdf.isEspIdfProject`` setting and use folder-level settings instead.

Technical Details
-----------------

Why "True Wins" Strategy?
~~~~~~~~~~~~~~~~~~~~~~~~~~

In multi-root workspaces, if any folder needs the ESP-IDF extension, the extension must activate globally (VSCode extensions activate per workspace, not per folder). The "true wins" strategy ensures:

- One ESP-IDF project folder can activate the extension for all folders
- Documentation or utility folders can coexist without blocking activation
- Better user experience in mixed-project workspaces

Backward Compatibility
~~~~~~~~~~~~~~~~~~~~~~

The activation system maintains full backward compatibility:

- Projects without the setting use the original CMakeLists.txt detection
- The "Activate Anyway" prompt still appears for non-standard projects
- Standard ESP-IDF projects work without any configuration changes

See Also
--------

- :ref:`Troubleshooting <troubleshooting-section>`
- :ref:`Settings <settings>`
- :ref:`FAQs <faqs-section>`
- `GitHub Issue #1756 <https://github.com/espressif/vscode-esp-idf-extension/issues/1756>`_
