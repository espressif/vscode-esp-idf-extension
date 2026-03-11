.. _extension-activation:

Extension Activation
====================

This document explains how the ESP-IDF extension decides whether to activate when you open a workspace in Visual Studio Code.

How VS Code Extension Activation Works
---------------------------------------

Extension activation in VS Code is a **two-phase process**. Understanding both phases is essential to avoid confusion when the extension does not activate as expected.

**Phase 1: VS Code Decides Whether to Load the Extension**

Before the extension's own code can run, VS Code itself must decide to load it. This decision is based on **activation events** declared in the extension's ``package.json``. The ESP-IDF extension registers the following activation triggers:

- ``workspaceContains:**/CMakeLists.txt`` — VS Code loads the extension automatically when any ``CMakeLists.txt`` file exists anywhere in the workspace.
- ``onCommand:espIdf.*`` — VS Code loads the extension when you run any ESP-IDF command from the Command Palette (e.g., *ESP-IDF: Build your Project*, *ESP-IDF: Flash your Project*).
- ``onView:idfPartitionExplorer``, ``onView:espRainmaker``, etc. — VS Code loads the extension when you open one of its registered sidebar views.

If **none** of these triggers fire, VS Code will never load the extension and its ``activate()`` function will never run. This means:

.. important::

   The ``idf.extensionActivationMode`` setting has **no effect** unless VS Code loads the extension first. If your workspace does not contain any ``CMakeLists.txt`` file and you have not run an ESP-IDF command, the extension will not activate — even if ``idf.extensionActivationMode`` is set to ``"always"``.

**Phase 2: Extension Decides Whether to Fully Initialize**

Once VS Code loads the extension (Phase 1), the extension's ``activate()`` function runs. At this point, the extension reads the ``idf.extensionActivationMode`` setting and applies the priority hierarchy described in the next section to decide whether to proceed with full initialization or exit early.

.. list-table:: Two-Phase Summary
   :header-rows: 1

   * - Phase
     - Controlled By
     - What Happens
   * - **Phase 1** — Loading
     - VS Code platform (``activationEvents`` in ``package.json``)
     - VS Code decides whether to load and start the extension's code
   * - **Phase 2** — Initialization
     - Extension code (``idf.extensionActivationMode`` setting)
     - Extension decides whether to fully initialize or exit early

Activation Mode Priority Hierarchy (Phase 2)
----------------------------------------------

Once the extension is loaded by VS Code, it follows a strict priority hierarchy when deciding whether to fully initialize:

1. **Workspace/Global Setting = "always"**

   - **Action**: Initialize immediately
   - **Skips**: All other checks (CMake detection, folder checks)
   - **Use case**: Force-enable the extension for custom project layouts
   - **Setting location**: User Settings or Workspace Settings

2. **Workspace/Global Setting = "never"**

   - **Action**: Do NOT initialize, exit immediately
   - **Overrides**: All folder-level settings
   - **No prompt shown**: Respects your explicit choice
   - **Use case**: Explicitly disable extension in specific workspaces

3. **ANY Folder Setting = "always"**

   - **Action**: Initialize immediately ("true wins" strategy)
   - **Order independent**: Checks all folders, not just the first
   - **Use case**: Multi-root workspace with at least one ESP-IDF project
   - **Setting location**: Folder Settings in ``.vscode/settings.json``

4. **ALL Folder Settings = "never"**

   - **Action**: Do NOT initialize, exit immediately
   - **No prompt shown**: Respects explicit configuration
   - **Use case**: Multi-root workspace explicitly excluding ESP-IDF

5. **All Settings = "detect"** (Default Behavior)

   - **Action**: Fallback to automatic CMakeLists.txt content detection
   - **Detection**: Searches for ``include($ENV{IDF_PATH}/tools/cmake/project.cmake)``
   - **If not found**: Prompts with "Activate Anyway" dialog
   - **Use case**: Standard ESP-IDF projects (backward compatible)

Configuration Setting
---------------------

The setting that controls extension initialization (Phase 2) is:

.. code-block:: json

   {
     "idf.extensionActivationMode": "detect"
   }

**Possible values:**

- ``"detect"`` (default) — Auto-detect by inspecting ``CMakeLists.txt`` content.
- ``"always"`` — Skip detection and initialize immediately.
- ``"never"`` — Never initialize, even if an ESP-IDF project is detected.

**Setting Scope:**

- **User (Global)**:

  - Linux: ``~/.config/Code/User/settings.json``
  - macOS: ``~/Library/Application Support/Code/User/settings.json``
  - Windows: ``%APPDATA%\Code\User\settings.json``

- **Workspace**: ``.vscode/settings.json`` in workspace root
- **Folder**: ``.vscode/settings.json`` in specific folder (multi-root workspaces)

Usage Examples
--------------

Force Enable for Custom Projects
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you have a custom CMake setup that doesn't use the standard ESP-IDF ``project.cmake`` include:

**Workspace Settings** (``.vscode/settings.json``):

.. code-block:: json

   {
     "idf.extensionActivationMode": "always"
   }

This will initialize the extension regardless of your CMakeLists.txt content.

.. note::

   This only works if your workspace contains at least one ``CMakeLists.txt`` file (which triggers Phase 1 loading), or if you first run an ESP-IDF command from the Command Palette.

Disable Extension in Specific Workspace
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you want to prevent the extension from initializing in a non-ESP-IDF workspace:

**Workspace Settings** (``.vscode/settings.json``):

.. code-block:: json

   {
     "idf.extensionActivationMode": "never"
   }

The extension will not initialize, and no prompt will be shown.

Multi-Root Workspace with Mixed Projects
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For a workspace with both ESP-IDF and non-ESP-IDF projects:

**Workspace File** (``my-workspace.code-workspace``):

.. code-block:: json

   {
     "folders": [
       { "path": "esp32-firmware" },
       { "path": "documentation" },
       { "path": "web-interface" }
     ]
   }

**Folder-level settings** (each folder's ``.vscode/settings.json``):

``esp32-firmware/.vscode/settings.json``:

.. code-block:: json

   {
     "idf.extensionActivationMode": "always"
   }

``documentation/.vscode/settings.json``:

.. code-block:: json

   {
     "idf.extensionActivationMode": "never"
   }

In this example, the extension will initialize because the ``esp32-firmware`` folder has ``"always"`` set (Priority #3: "true wins").

Standard ESP-IDF Project (No Configuration Needed)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

For standard ESP-IDF projects with the typical CMakeLists.txt structure:

**CMakeLists.txt** (project root):

.. code-block:: cmake

   cmake_minimum_required(VERSION 3.16)
   include($ENV{IDF_PATH}/tools/cmake/project.cmake)
   project(my-project)

No setting needed — VS Code automatically loads the extension because ``CMakeLists.txt`` exists (Phase 1), and the extension detects the ESP-IDF project include (Phase 2, Priority #5).

Workspace Without CMakeLists.txt
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If your workspace does **not** contain any ``CMakeLists.txt`` file (e.g., a documentation-only workspace where you want ESP-IDF tooling available):

1. Setting ``"idf.extensionActivationMode": "always"`` alone is **not enough** — VS Code will not load the extension because no activation trigger fires.
2. To activate the extension, manually run any ESP-IDF command from the Command Palette (``Ctrl+Shift+P`` → type ``ESP-IDF``). This triggers Phase 1 loading via the ``onCommand`` activation event, and the ``"always"`` setting ensures Phase 2 initialization proceeds.

Common Activation Issues
------------------------

Extension Not Activating
~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**: ESP-IDF commands not available, no extension features working.

**Possible causes**:

1. **No activation trigger** (Phase 1): The workspace contains no ``CMakeLists.txt`` file and no ESP-IDF command has been run.

   **Solution**: Run any ESP-IDF command from the Command Palette to trigger loading, or create a ``CMakeLists.txt`` file. If you want automatic activation in the future, set ``"idf.extensionActivationMode": "always"`` so that once loaded, it always initializes.

2. **Explicit "never" setting** (Phase 2): The extension is loaded but ``idf.extensionActivationMode`` is set to ``"never"`` in User, Workspace, or Folder settings.

   **Solution**: Set it to ``"always"`` or ``"detect"``.

3. **Non-standard CMakeLists.txt** (Phase 2): Your project has a ``CMakeLists.txt`` but it doesn't include the standard ESP-IDF ``project.cmake`` line.

   **Solution**: Add ``"idf.extensionActivationMode": "always"`` to workspace settings.

4. **Prompt dismissed** (Phase 2): You dismissed the "Activate Anyway" dialog.

   **Solution**: Reload the window (``Ctrl+Shift+P`` → "Developer: Reload Window") and choose "Activate Anyway" when prompted.

Extension Activating in Wrong Workspace
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**: ESP-IDF extension activated in a non-ESP-IDF project.

**Why this happens**: The workspace contains a ``CMakeLists.txt`` file (perhaps for a non-ESP-IDF C/C++ project), which triggers Phase 1 loading. The extension then either detects an ESP-IDF include or prompts the user.

**Solution**: Add ``"idf.extensionActivationMode": "never"`` to workspace settings to explicitly disable Phase 2 initialization.

Multi-Root Workspace Issues
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**: Extension not activating even though one folder is an ESP-IDF project.

**Possible cause**: A workspace-level ``"never"`` setting is overriding folder settings.

**Solution**: Remove the workspace-level ``idf.extensionActivationMode`` setting and use folder-level settings instead.

Technical Details
-----------------

Phase 1: Activation Events
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The extension's ``package.json`` declares the following activation events:

- **workspaceContains:\*\*/CMakeLists.txt**: Fires when any folder in the workspace contains a ``CMakeLists.txt`` file at any depth. This is the most common automatic trigger.
- **onCommand:espIdf.\***: Each ESP-IDF command is registered as an activation trigger. Running any command from the Command Palette will load the extension.
- **onView:\***: Opening ESP-IDF sidebar panels (App Tracer, Partition Explorer, Rainmaker, Components) triggers loading.

These events are defined by the `VS Code Extension API <https://code.visualstudio.com/api/references/activation-events>`_ and cannot be changed via user settings. The only way to prevent Phase 1 loading is to disable the extension entirely in VS Code's Extensions view.

Why "True Wins" Strategy?
~~~~~~~~~~~~~~~~~~~~~~~~~~

In multi-root workspaces, if any folder needs the ESP-IDF extension, the extension must activate globally (VS Code extensions activate per workspace, not per folder). The "true wins" strategy ensures:

- One ESP-IDF project folder can activate the extension for all folders
- Documentation or utility folders can coexist without blocking activation
- Better user experience in mixed-project workspaces

Backward Compatibility
~~~~~~~~~~~~~~~~~~~~~~

The activation system maintains full backward compatibility:

- Projects without the setting use the original CMakeLists.txt detection
- The "Activate Anyway" prompt still appears for non-standard projects
- Standard ESP-IDF projects work without any configuration changes

Performance Optimizations
~~~~~~~~~~~~~~~~~~~~~~~~~~

The Phase 2 logic is designed for optimal performance:

1. **Early Exit on Global Never**: If workspace/global setting is ``"never"``, the extension exits immediately without checking folders or reading files.
2. **Early Exit on Any Always**: When any folder has ``"always"``, the extension stops checking remaining folders.
3. **Skip CMake Detection**: If any explicit ``"always"`` is found, CMake file detection is entirely skipped.
4. **Lazy File Reading**: CMakeLists.txt files are only read when all settings are ``"detect"``.

See Also
--------

- :ref:`Troubleshooting <troubleshooting-section>`
- :ref:`Settings <settings>`
- :ref:`FAQs <faqs-section>`
- `VS Code Activation Events Documentation <https://code.visualstudio.com/api/references/activation-events>`_
- `GitHub Issue #1756 <https://github.com/espressif/vscode-esp-idf-extension/issues/1756>`_
