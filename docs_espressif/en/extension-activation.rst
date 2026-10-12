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
- ``onLanguageModelTool:espIdfCommands`` — VS Code loads the extension when a language-model integration (e.g., Copilot) invokes the ESP-IDF commands tool.
- ``contributes.mcpServerDefinitionProviders`` (``espIdf.mcpServers``) — VS Code can load the extension when Chat discovers MCP servers. The Espressif Documentation and ESP Component Registry servers are registered at this point unless ``idf.extensionActivationMode`` is ``never``.

If **none** of these triggers fire, VS Code will never load the extension and its ``activate()`` function will never run. This means:

.. important::

   The ``idf.extensionActivationMode`` setting has **no effect** unless VS Code loads the extension first. If none of the activation events listed above fire (no ``CMakeLists.txt`` in the workspace, no ESP-IDF command run, no sidebar view opened, no language-model tool invocation, no MCP server discovery), the extension will not activate — even if ``idf.extensionActivationMode`` is set to ``"always"``. After the extension loads, that setting is also skipped when no workspace folder is open, and when ``idf.currentSetup`` already points at a finished ESP-IDF install.

**Phase 2: Extension Decides Whether to Fully Initialize**

Once VS Code loads the extension (Phase 1), the extension's ``activate()`` function runs. It validates the ESP-IDF Installation Manager catalog and the selected setup before registering project commands. ``idf.extensionActivationMode`` is used only when a workspace folder is open and ``idf.currentSetup`` is empty.

.. list-table:: Two-Phase Summary
   :header-rows: 1

   * - Phase
     - Controlled By
     - What Happens
   * - **Phase 1** — Loading
     - VS Code platform (``activationEvents`` in ``package.json``)
     - VS Code decides whether to load and start the extension's code
   * - **Phase 2** — Initialization
     - Extension code (``eim_idf.json``, ``idf.currentSetup``, and ``idf.extensionActivationMode`` when that setup is empty)
     - Extension enters non-configured mode, configured mode with no workspace folder, or full configured mode

Setup Validation (Phase 2)
--------------------------

After the extension loads, it checks the ESP-IDF Installation Manager catalog before project commands are registered. Commands that do not need a workspace folder, including the Installation Manager, the welcome page, and the new-project wizard, are registered either way.

1. **``eim_idf.json`` must exist**

   The extension uses ``idf.eimIdfJsonPath`` when that file exists. If the setting is empty, or it points at a missing file while the platform default exists, the setting is cleared and the default file is used (``C:\\Espressif\\tools\\eim_idf.json`` on Windows, ``~/.espressif/tools/eim_idf.json`` elsewhere). If neither file exists, the status bar shows ``eim_idf.json not found``. Clicking it runs **ESP-IDF: Select eim_idf.json**.

2. **At least one finished ESP-IDF setup**

   ``eim_idf.json`` must contain an install whose status is ``finished``. Catalogs older than 3.0, and entries with no status, are treated as finished. If none qualify, the status bar shows ``No valid ESP-IDF setup found``. Clicking it opens the ESP-IDF Installation Manager. After the install finishes, run **ESP-IDF: Retry ESP-IDF Activation**.

3. **Workspace folder, then ``idf.currentSetup``**

   If no workspace folder is open, validation stops. The extension stays in configured mode without a workspace folder and does not read or write ``idf.currentSetup``. Opening a folder runs validation again.

   If a folder is open, the folder is the extension's stored workspace selection, or the first workspace folder when nothing is stored.

   - A ``idf.currentSetup`` path that matches a finished install continues into full configured mode.
   - A path that is missing from ``eim_idf.json``, or is not finished, shows ``Invalid ESP-IDF Setup``. Clicking the status bar runs **ESP-IDF: Select Current ESP-IDF Version**.
   - An empty ``idf.currentSetup`` runs the ``idf.extensionActivationMode`` check below. When that check allows activation, the first finished install is saved as ``idf.currentSetup`` and full configured mode starts. When the check declines, project commands are not registered and the non-configured status bar is not shown.

**ESP-IDF: Retry ESP-IDF Activation** runs these checks again. While the extension is still outside full configured mode, they also run again when ``idf.eimIdfJsonPath``, ``idf.currentSetup``, or ``idf.extensionActivationMode`` changes, and when a workspace folder is added. After the extension is fully configured, changes to the ``eim_idf.json`` file itself are handled by the watcher described in `Watching eim_idf.json`_.

ESP-IDF Commands View
---------------------

The ESP-IDF Commands view is created when the extension loads and refreshes when the activation mode changes.

Before full configured mode, the view is a flat list. It has no Advanced category and no status-bar checkboxes. The list is:

- **ESP-IDF: Open ESP-IDF Installation Manager**
- **ESP-IDF: New Project**
- **ESP-IDF: Create New Empty Project**
- **ESP-IDF: Doctor Command**
- **ESP-IDF: Welcome**
- **ESP-IDF: Open Get Started Walkthrough**
- **ESP-IDF: Retry ESP-IDF Activation**

In non-configured mode, and when activation was skipped, the list also includes **ESP-IDF: Select Current ESP-IDF Version** when a workspace folder is open.

Full configured mode shows the project command list and the Advanced category with checkboxes.

When a catalog change leaves configured mode, the view switches to the shorter list. Project commands that were already registered stay available from the Command Palette. A later successful retry restores the full list.

Watching eim_idf.json
---------------------

After the first validation, the extension watches the resolved catalog file. That file is ``idf.eimIdfJsonPath`` when the file exists. Otherwise it is ``C:\\Espressif\\tools\\eim_idf.json`` on Windows, or ``~/.espressif/tools/eim_idf.json`` elsewhere. The file is outside the workspace. Create, change, and delete events for one edit are handled once. Events are ignored while activation is already running.

- **Non-configured and skipped**: run **ESP-IDF: Retry ESP-IDF Activation**.
- **Configured**: stay configured when ``idf.currentSetup`` still matches a finished install. If the file is missing, unreadable, or that setup is gone or not finished, show the existing status bar (``Invalid ESP-IDF Setup``, or ``eim_idf.json not found`` / ``No valid ESP-IDF setup found`` when that is the real failure) and switch the commands view to the shorter list. Already registered project commands stay registered.
- **No workspace folder**: stay in that mode when at least one finished install remains. Otherwise show the non-configured status bar for a missing catalog (``eim_idf.json not found``) or no finished setup (``No valid ESP-IDF setup found``).

Changing ``idf.eimIdfJsonPath`` retargets the watcher. A custom path that points at a missing file is cleared, and the default file is watched when it exists. If the watcher is already on that default path, it stays there. If neither file exists, watching stops. After the watched path changes, the same reactions run immediately.

Activation Mode Priority Hierarchy (Phase 2)
----------------------------------------------

``idf.extensionActivationMode`` runs only when a workspace folder is open and ``idf.currentSetup`` is empty. A result that allows activation saves the first finished ESP-IDF install and registers project commands. A result that declines does not. The check follows this priority:

1. **Workspace/Global Setting = "always"**

   - **Action**: Save the first finished ESP-IDF install and fully initialize
   - **Skips**: CMake detection and the "Activate Anyway" prompt
   - **Use case**: Force-enable the extension for custom project layouts
   - **Setting location**: User Settings or Workspace Settings

2. **Workspace/Global Setting = "never"**

   - **Action**: Do not save ``idf.currentSetup`` and do not register project commands
   - **Overrides**: All folder-level settings
   - **No prompt shown**: Respects your explicit choice
   - **Use case**: Explicitly disable extension in specific workspaces
   - This still applies when VS Code loads the extension via MCP discovery with no workspace open; MCP servers are also not registered. Servers are withdrawn when mode is ``"never"`` or the extension deactivates; they are not a user ``mcp.json`` entry.

3. **ANY Folder Setting = "always"**

   - **Action**: Save the first finished ESP-IDF install and fully initialize ("true wins" strategy)
   - **Order independent**: Checks all folders, not just the first
   - **Use case**: Multi-root workspace with at least one ESP-IDF project
   - **Setting location**: Folder Settings in ``.vscode/settings.json``

4. **ALL Folder Settings = "never"**

   - **Action**: Do not save ``idf.currentSetup`` and do not register project commands
   - **No prompt shown**: Respects explicit configuration
   - **Use case**: Multi-root workspace explicitly excluding ESP-IDF

5. **Otherwise** (Default Behavior — CMake Detection)

   - **Condition**: No workspace/global override (i.e., ``"detect"``), no folder set to ``"always"``, and not all folders set to ``"never"`` — this includes mixed per-folder states such as some ``"detect"`` and some ``"never"``
   - **Action**: Fallback to automatic CMakeLists.txt content detection
   - **Detection**: Searches for ``include($ENV{IDF_PATH}/tools/cmake/project.cmake)``
   - **If not found**: Prompts with "Activate Anyway" dialog
   - **Use case**: Standard ESP-IDF projects (backward compatible)

Configuration Setting
---------------------

The setting used when a workspace folder is open and ``idf.currentSetup`` is empty:

.. code-block:: json

   {
     "idf.extensionActivationMode": "detect"
   }

**Possible values:**

- ``"detect"`` (default) — Auto-detect by inspecting ``CMakeLists.txt`` content.
- ``"always"`` — Skip CMake detection, save the first finished ESP-IDF install, and register project commands.
- ``"never"`` — Do not save an empty ``idf.currentSetup`` and do not register project commands, even if an ESP-IDF project is detected.

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

   This only works if at least one Phase 1 activation event fires — for example, a ``CMakeLists.txt`` file exists in the workspace, you run an ESP-IDF command from the Command Palette, or you open an ESP-IDF sidebar view.

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

1. **No activation trigger** (Phase 1): No declared activation event has fired — the workspace contains no ``CMakeLists.txt`` file, no ESP-IDF command has been run, no sidebar view has been opened, etc.

   **Solution**: Run any ESP-IDF command from the Command Palette to trigger loading, or create a ``CMakeLists.txt`` file. If you want automatic activation in the future, set ``"idf.extensionActivationMode": "always"`` so that once loaded, it always initializes.

2. **Explicit "never" setting** (Phase 2): A workspace folder is open, ``idf.currentSetup`` is empty, and ``idf.extensionActivationMode`` is ``"never"``. Project commands are not registered. If ``idf.currentSetup`` already points at a finished install, this setting is not consulted.

   **Solution**: Set it to ``"always"`` or ``"detect"``, or run **ESP-IDF: Retry ESP-IDF Activation** after changing the setting. You can also select an ESP-IDF version so ``idf.currentSetup`` is no longer empty.

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
- **onLanguageModelTool:espIdfCommands**: Fires when a language-model integration (e.g., Copilot) invokes the ESP-IDF commands tool, enabling AI-assisted workflows.

These events are defined by the `VS Code Extension API <https://code.visualstudio.com/api/references/activation-events>`_ and cannot be changed via user settings. The only way to prevent Phase 1 loading is to disable the extension entirely in VS Code's Extensions view.

The extension also declares ``contributes.mcpServerDefinitionProviders`` (``espIdf.mcpServers``). This is a contribution point, not an ``activationEvents`` entry. VS Code can still load the extension when Chat discovers the contributed MCP servers. The servers are withdrawn when ``idf.extensionActivationMode`` is ``"never"`` or the extension deactivates; they are not stored in a user ``mcp.json`` file.

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

1. **Early Exit on Global Never**: If workspace/global setting is ``"never"``, the project check returns immediately without checking folders or reading files. This check runs only when a workspace folder is open and ``idf.currentSetup`` is empty.
2. **Early Exit on Any Always**: When any folder has ``"always"``, the extension stops checking remaining folders.
3. **Skip CMake Detection**: If any explicit ``"always"`` is found, CMake file detection is entirely skipped.
4. **Lazy File Reading**: CMakeLists.txt files are only read when the detection fallback is reached (no explicit ``"always"`` or all-``"never"`` overrides).

See Also
--------

- :ref:`Troubleshooting <troubleshooting-section>`
- :ref:`Settings <settings>`
- :ref:`FAQs <faqs-section>`
- `VS Code Activation Events Documentation <https://code.visualstudio.com/api/references/activation-events>`_
- `GitHub Issue #1756 <https://github.com/espressif/vscode-esp-idf-extension/issues/1756>`_
