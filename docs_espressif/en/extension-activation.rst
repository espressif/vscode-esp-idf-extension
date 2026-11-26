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
- ``onStartupFinished`` — VS Code loads the extension after startup finishes, including in workspaces without ``CMakeLists.txt`` and in windows with no workspace folder.
- ``onLanguageModelTool:espIdfCommands`` — VS Code loads the extension when a language-model integration (e.g., Copilot) invokes the ESP-IDF commands tool.
- ``contributes.mcpServerDefinitionProviders`` (``espIdf.mcpServers``) — VS Code can load the extension when Chat discovers MCP servers. The Espressif Documentation and ESP Component Registry servers are registered at this point unless ``idf.extensionActivationMode`` is ``never``.

.. important::

   ``onStartupFinished`` loads the enabled extension after startup regardless of the workspace contents. The ``idf.extensionActivationMode`` setting controls project initialization after loading; it does not prevent startup loading. A user or workspace value of ``never`` skips catalog validation and project initialization, including when no workspace folder is open, so a missing catalog does not show a warning, walkthrough, or warning status bar. Other activation-mode values are still skipped when no workspace folder is open, and when ``idf.currentSetup`` already points at a finished ESP-IDF install. Folder-level ``never`` is consulted only after a valid catalog when ``idf.currentSetup`` is empty. MCP provider registration is checked separately: ``idf.extensionActivationMode = never`` can still prevent MCP provider registration, even when no workspace folder is open.

**Phase 2: Extension Decides Whether to Fully Initialize**

Once VS Code loads the extension (Phase 1), the extension's ``activate()`` function runs. A user or workspace ``idf.extensionActivationMode`` of ``never`` selects skipped mode before catalog validation. Otherwise it validates the ESP-IDF Installation Manager catalog and the selected setup before registering project commands. Other activation-mode values are used only when a workspace folder is open and ``idf.currentSetup`` is empty.

.. list-table:: Two-Phase Summary
   :header-rows: 1

   * - Phase
     - Controlled By
     - What Happens
   * - **Phase 1** — Loading
     - VS Code platform (``activationEvents`` in ``package.json``)
     - VS Code decides whether to load and start the extension's code
   * - **Phase 2** — Initialization
     - Extension code (a user or workspace ``idf.extensionActivationMode`` of ``never`` is checked first, then ``idf.customExtraVars``, ``eim_idf.json``, ``idf.currentSetup``, and other activation-mode values when that setup is empty)
     - Extension enters non-configured mode, configured mode with no workspace folder, full configured mode, or configured mode from environment variables

Setup Validation (Phase 2)
--------------------------

After the extension loads, a user or workspace ``idf.extensionActivationMode`` of ``never`` selects skipped mode before any other check. There is no missing-catalog prompt, walkthrough, or activation status bar. Otherwise it checks ``idf.customExtraVars`` for the selected workspace folder before the ESP-IDF Installation Manager catalog. Commands that do not need a workspace folder, including the Installation Manager, the welcome page, and the new-project wizard, are registered either way.

1. **A valid ``idf.customExtraVars`` setup**

   .. note::

      This path is only for users who configure the extension with :ref:`Manual configuration of ESP-IDF and Tools in the ESP-IDF extension for VS Code <manual_idf_configuration>`. The ESP-IDF Installation Manager (EIM) is the preferred way to install an ESP-IDF setup.

   When a workspace folder is open, the folder is the extension's stored workspace selection, or the first workspace folder when nothing is stored. If that folder's ``idf.customExtraVars`` contains a non-empty ``IDF_PATH`` and that setup validates, the extension enters configured mode from environment variables. This does not read or write ``idf.currentSetup``, and it does not require ``eim_idf.json``. ``IDF_PATH`` is taken from ``idf.customExtraVars``. ``IDF_TOOLS_PATH``, ``PATH``, and ``IDF_PYTHON_ENV_PATH`` still use the existing environment-variable defaults. ``process.env.IDF_PATH`` alone does not select this path.

   If ``IDF_PATH`` is missing, or the setup does not validate, activation continues with the catalog checks below. An invalid custom setup is not a separate failure.

   The commands view and status bar match full configured mode. Changes to ``eim_idf.json`` do not leave this mode. Changing ``idf.customExtraVars`` runs validation again, including when the extension is already configured from the catalog or from environment variables. A custom setup that is no longer valid continues with the catalog checks. Changes to ``idf.currentSetup`` or ``idf.eimIdfJsonPath`` do not leave this mode.

2. **``eim_idf.json`` must exist**

   The extension uses ``idf.eimIdfJsonPath`` when that file exists. If the setting is empty, or it points at a missing file, the setting is left unchanged and the platform default is used when that file exists (``C:\\Espressif\\tools\\eim_idf.json`` on Windows, ``~/.espressif/tools/eim_idf.json`` elsewhere). A missing custom path is logged once. If neither file exists, the status bar shows ``eim_idf.json not found``. Clicking it runs **ESP-IDF: Select eim_idf.json**.

3. **At least one finished ESP-IDF setup**

   ``eim_idf.json`` must contain an install whose status is ``finished``. Catalogs older than 3.0, and entries with no status, are treated as finished. If none qualify, the status bar shows ``No valid ESP-IDF setup found``. Clicking it opens the ESP-IDF Installation Manager. After the install finishes, run **ESP-IDF: Retry ESP-IDF Activation**.

4. **Workspace folder, then ``idf.currentSetup``**

   If no workspace folder is open, validation stops. The extension stays in configured mode without a workspace folder and does not read or write ``idf.currentSetup``. Opening a folder runs validation again.

   If a folder is open, the folder is the extension's stored workspace selection, or the first workspace folder when nothing is stored.

   - A ``idf.currentSetup`` path that matches a finished install continues into full configured mode.
   - A path that is missing from ``eim_idf.json``, or is not finished, shows ``Invalid ESP-IDF Setup``. Clicking the status bar runs **ESP-IDF: Select Current ESP-IDF Version**.
   - An empty ``idf.currentSetup`` runs the ``idf.extensionActivationMode`` check below. When that check allows activation, the first finished install is saved as ``idf.currentSetup`` and full configured mode starts. When the check declines because the mode is ``never``, project commands are not registered and no activation status bar is shown. When no standard project is detected, the status bar shows a plain ``No ESP-IDF project detected`` item, without warning styling. Clicking it, or running **ESP-IDF: Activate ESP-IDF**, saves the first finished install and starts full configured mode without changing ``idf.extensionActivationMode``.

**ESP-IDF: Retry ESP-IDF Activation** runs these checks again, starting with ``idf.customExtraVars``. While the extension is still outside full configured mode, they also run again when ``idf.eimIdfJsonPath``, ``idf.currentSetup``, or ``idf.extensionActivationMode`` changes, and when a workspace folder is added. Changing ``idf.customExtraVars`` runs them again even after the extension is fully configured, from the catalog or from environment variables. After the extension is fully configured from the catalog, changes to the ``eim_idf.json`` file itself are handled by the watcher described in `Watching eim_idf.json`_. A folder configured from ``idf.customExtraVars`` ignores those catalog changes.

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

In non-configured mode, when activation was skipped, and when no project was detected, the list also includes **ESP-IDF: Select Current ESP-IDF Version** when a workspace folder is open.

When no project was detected, the list also includes **ESP-IDF: Activate ESP-IDF**. **ESP-IDF: Retry ESP-IDF Activation** runs detection again and does not opt in.

Full configured mode, including configuration from ``idf.customExtraVars``, shows the project command list and the Advanced category with checkboxes.

When a catalog change leaves configured mode, the view switches to the shorter list. Project commands that were already registered stay registered, but the Command Palette and their keybindings hide until the extension is configured again. A later successful retry restores the full list.

Watching eim_idf.json
---------------------

After the first validation, the extension watches the resolved catalog file. That file is ``idf.eimIdfJsonPath`` when the file exists. Otherwise it is ``C:\\Espressif\\tools\\eim_idf.json`` on Windows, or ``~/.espressif/tools/eim_idf.json`` elsewhere, including when that file is not on disk yet. The file is outside the workspace. Create, change, and delete events for one edit are handled once. Events are ignored while activation is already running.

- **Non-configured, skipped, and no project detected**: run **ESP-IDF: Retry ESP-IDF Activation**.
- **Configured**: stay configured when ``idf.currentSetup`` still matches a finished install. If the file is missing, unreadable, or that setup is gone or not finished, hide the configured status bar items and show the non-configured status bar (``Invalid ESP-IDF Setup``, or ``eim_idf.json not found`` / ``No valid ESP-IDF setup found`` when that is the real failure). Switch the commands view to the shorter list. Already registered project commands stay registered. A later successful activation shows the configured status bar items again.
- **Configured from environment variables**: catalog changes are ignored. The extension stays on the ``idf.customExtraVars`` setup.
- **No workspace folder**: stay in that mode when at least one finished install remains. Otherwise show the non-configured status bar for a missing catalog (``eim_idf.json not found``) or no finished setup (``No valid ESP-IDF setup found``).

Changing ``idf.eimIdfJsonPath`` retargets the watcher. A custom path that points at a missing file is left unchanged and logged once; the platform default path is watched when that file exists. If the watcher is already on that default path, it stays there. If neither file exists, the extension still watches the platform default path. The watch is attached to the nearest existing ancestor and uses only that ancestor's next missing child, so it is not recursive. When that child appears, the watcher moves one level down until it is watching the file in its own directory. Creation runs **ESP-IDF: Retry ESP-IDF Activation** while the extension is non-configured, skipped, or no project was detected. After the watched path changes, the same reactions run immediately.

Activation Mode Priority Hierarchy (Phase 2)
----------------------------------------------

A user or workspace value of ``never`` is applied before catalog validation, with or without a workspace folder, and does not save ``idf.currentSetup`` or register project commands. Other values of ``idf.extensionActivationMode`` run only when a workspace folder is open, ``idf.customExtraVars`` did not select a valid ESP-IDF setup, and ``idf.currentSetup`` is empty. A result that allows activation saves the first finished ESP-IDF install and registers project commands. A result that declines does not. The check follows this priority:

1. **Workspace/Global Setting = "always"**

   - **Action**: Save the first finished ESP-IDF install and fully initialize
   - **Skips**: CMake detection and the status bar activation offer
   - **Use case**: Force-enable the extension for custom project layouts
   - **Setting location**: User Settings or Workspace Settings

2. **Workspace/Global Setting = "never"**

   - **Action**: Skip catalog validation. Do not save ``idf.currentSetup`` and do not register project commands. No missing-catalog prompt, walkthrough, or activation status bar
   - **Overrides**: All folder-level settings, including when ``idf.currentSetup`` already points at a finished install
   - **No status bar offer**: Respects your explicit choice
   - **Use case**: Explicitly disable the extension in specific workspaces, including windows with no ESP-IDF project
   - This still applies when VS Code loads the extension via MCP discovery with no workspace open; MCP servers are also not registered. Servers are withdrawn when mode is ``"never"`` or the extension deactivates; they are not a user ``mcp.json`` entry.

3. **ANY Folder Setting = "always"**

   - **Action**: Save the first finished ESP-IDF install and fully initialize ("true wins" strategy)
   - **Order independent**: Checks all folders, not just the first
   - **Use case**: Multi-root workspace with at least one ESP-IDF project
   - **Setting location**: Folder Settings in ``.vscode/settings.json``

4. **ALL Folder Settings = "never"**

   - **Action**: Do not save ``idf.currentSetup`` and do not register project commands
   - **No status bar offer**: Respects explicit configuration
   - **Use case**: Multi-root workspace explicitly excluding ESP-IDF

5. **Otherwise** (Default Behavior — CMake Detection)

   - **Condition**: No workspace/global override (i.e., ``"detect"``), no folder set to ``"always"``, and not all folders set to ``"never"`` — this includes mixed per-folder states such as some ``"detect"`` and some ``"never"``
   - **Action**: Fallback to automatic CMakeLists.txt content detection
   - **Detection**: Searches for ``include($ENV{IDF_PATH}/tools/cmake/project.cmake)``
   - **If not found**: The status bar shows a plain ``No ESP-IDF project detected`` item, without warning styling. Clicking it runs **ESP-IDF: Activate ESP-IDF**, which saves the first finished install without changing ``idf.extensionActivationMode``
   - **Use case**: Standard ESP-IDF projects (backward compatible)

Configuration Setting
---------------------

A user or workspace value of ``never`` is checked before catalog validation. Other values are used when a workspace folder is open and ``idf.currentSetup`` is empty:

.. code-block:: json

   {
     "idf.extensionActivationMode": "detect"
   }

**Possible values:**

- ``"detect"`` (default) — Auto-detect by inspecting ``CMakeLists.txt`` content. When no standard project is found, a plain status bar item offers activation.
- ``"always"`` — Skip CMake detection, save the first finished ESP-IDF install, and register project commands.
- ``"never"`` — When set in user or workspace settings, skip catalog validation and do not register project commands. A folder-level ``never`` does not save an empty ``idf.currentSetup`` and does not register project commands after a valid catalog, even if an ESP-IDF project is detected.

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

   ``onStartupFinished`` loads the extension even without a ``CMakeLists.txt`` file. Full initialization still requires a valid catalog and a workspace folder, as described in Setup Validation (Phase 2).

Disable Extension in Specific Workspace
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you want to prevent the extension from initializing in a non-ESP-IDF workspace:

**Workspace Settings** (``.vscode/settings.json``):

.. code-block:: json

   {
     "idf.extensionActivationMode": "never"
   }

The extension will not initialize, and the activation status bar is not shown.

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

1. VS Code loads the extension after startup through ``onStartupFinished``.
2. Set ``"idf.extensionActivationMode": "always"`` to allow project initialization when ``idf.currentSetup`` is empty. A valid catalog with a finished ESP-IDF install is still required.

Common Activation Issues
------------------------

Extension Not Activating
~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**: ESP-IDF commands not available, no extension features working.

**Possible causes**:

1. **Extension disabled or startup still in progress** (Phase 1): The enabled extension loads through ``onStartupFinished`` even without a ``CMakeLists.txt`` file.

   **Solution**: Enable the extension in VS Code's Extensions view and let startup finish. If it still fails to load, check the extension host logs.

2. **Explicit "never" setting** (Phase 2): User or workspace ``idf.extensionActivationMode`` is ``"never"``. Catalog validation is skipped, so a missing ``eim_idf.json`` does not show a warning. Project commands are not registered, even when ``idf.currentSetup`` already points at a finished install. A folder-level ``never`` applies only when every folder is ``never``, the catalog is valid, and ``idf.currentSetup`` is empty.

   **Solution**: Set the user or workspace value to ``"always"`` or ``"detect"``, or run **ESP-IDF: Retry ESP-IDF Activation** after changing the setting.

3. **Non-standard CMakeLists.txt** (Phase 2): Your project has a ``CMakeLists.txt`` but it doesn't include the standard ESP-IDF ``project.cmake`` line.

   **Solution**: Add ``"idf.extensionActivationMode": "always"`` to workspace settings.

4. **No standard project detected** (Phase 2): ``idf.currentSetup`` is empty, activation mode is ``detect``, and no root ``CMakeLists.txt`` includes the ESP-IDF ``project.cmake`` line. The status bar shows a plain ``No ESP-IDF project detected`` item, without warning styling.

   **Solution**: Click the status bar item, or run **ESP-IDF: Activate ESP-IDF**. That saves the first finished install as ``idf.currentSetup``. You can also set ``"idf.extensionActivationMode": "always"``.

Extension Activating in Wrong Workspace
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**: ESP-IDF extension activated in a non-ESP-IDF project.

**Why this happens**: ``onStartupFinished`` loads the extension in every window where it is enabled. A ``CMakeLists.txt`` file can trigger loading earlier. Project initialization then depends on setup validation. When a catalog is valid and ``idf.currentSetup`` is empty, a workspace that is not an ESP-IDF project shows a plain ``No ESP-IDF project detected`` status item.

**Solution**: Add ``"idf.extensionActivationMode": "never"`` to user or workspace settings to skip catalog validation and Phase 2 initialization in that window.

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

- **workspaceContains:\*\*/CMakeLists.txt**: Fires when any folder in the workspace contains a ``CMakeLists.txt`` file at any depth.
- **onStartupFinished**: Loads the enabled extension after startup, regardless of workspace contents or whether a workspace folder is open.
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
- Non-standard projects keep a status bar action, **ESP-IDF: Activate ESP-IDF**, until you activate or set the mode to ``never``
- Standard ESP-IDF projects work without any configuration changes

Performance Optimizations
~~~~~~~~~~~~~~~~~~~~~~~~~~

The Phase 2 logic is designed for optimal performance:

1. **Early Exit on Global Never**: If the user or workspace setting is ``"never"``, validation returns immediately without reading the catalog, checking folders, or reading files. Folder-level ``never`` still runs only when a workspace folder is open, the catalog is valid, and ``idf.currentSetup`` is empty.
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
