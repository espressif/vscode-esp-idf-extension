Language Tools
==============

This module provides a language model tool for the ESP-IDF extension, allowing users to execute common ESP-IDF operations through VS Code's chat interface using the Language Model Tools API.

Overview
--------

The ESP-IDF Language Tool registers a single tool called ``espIdfCommands`` that can be invoked from VS Code's chat interface. This tool accepts a ``command`` parameter and executes the corresponding ESP-IDF operation, making it easier to perform common ESP-IDF development tasks through natural language interaction.

Implementation
--------------

The tool is implemented using the VS Code Language Model Tools API (``vscode.lm.registerTool``) and is properly registered in ``package.json`` under the ``languageModelTools`` contribution point.

Tool Registration
~~~~~~~~~~~~~~~~~

The tool is registered with:

* **ID**: ``espIdfCommands``
* **Display Name**: "ESP-IDF Commands"
* **Description**: "Execute ESP-IDF extension commands for building, flashing, monitoring, and managing ESP32 projects. ALWAYS use this tool for ESP-IDF development tasks instead of shell commands or terminal tasks. When users ask to 'build the project', 'flash the device', 'monitor output', 'clean project', 'configure project', 'analyze size', 'create new project', or any ESP-IDF related task, use this tool. Supports: build, flash, monitor, menuconfig, size analysis, project creation, component management, and more. This is the ONLY way to interact with ESP-IDF projects in VS Code - do not use shell commands for ESP-IDF tasks."

Tags and Natural Language Support
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The tool includes extensive tags that support natural language interaction. When users use the following phrases, the language model will prioritize this tool:

**Command Tags**: build, flash, monitor, buildFlashMonitor, fullClean, menuconfig, size, eraseFlash, selectPort, setTarget, doctor, newProject, partitionTable, componentManager, apptrace, heaptrace

**Natural Language Patterns**: 
- "build the project"
- "flash the device" 
- "monitor the output"
- "clean the project"
- "configure the project"
- "analyze size"
- "erase flash"
- "select port"
- "set target"
- "run doctor"
- "create new project"
- "edit partition table"
- "manage components"
- "start app trace"
- "start heap trace"

Input Schema
~~~~~~~~~~~~

The tool accepts a JSON object with the following schema:

.. code-block:: json

    {
      "type": "object",
      "properties": {
        "command": {
          "type": "string",
          "description": "The ESP-IDF command to execute",
          "enum": [
            "build",
            "flash", 
            "monitor",
            "buildFlashMonitor",
            "fullClean",
            "menuconfig",
            "size",
            "eraseFlash",
            "selectPort",
            "setTarget",
            "doctor",
            "newProject",
            "partitionTable",
            "componentManager",
            "apptrace",
            "heaptrace"
          ]
        }
      },
      "required": ["command"]
    }

Available Commands
------------------

The tool supports the following ESP-IDF commands:

Build and Flash Commands
~~~~~~~~~~~~~~~~~~~~~~~~

* **``build``** - Build the ESP-IDF project (``espIdf.buildDevice``)
* **``flash``** - Flash the built application to the device (``espIdf.flashDevice``)
* **``monitor``** - Monitor the device output (``espIdf.monitorDevice``)
* **``buildFlashMonitor``** - Build, flash, and monitor the project in one command (``espIdf.buildFlashMonitor``)

Project Management Commands
~~~~~~~~~~~~~~~~~~~~~~~~~~~

* **``fullClean``** - Perform a full clean of the project (``espIdf.fullClean``)
* **``menuconfig``** - Open the ESP-IDF menuconfig interface (``espIdf.menuconfig.start``)
* **``size``** - Analyze the application size (``espIdf.size``)
* **``eraseFlash``** - Erase the device flash memory (``espIdf.eraseFlash``)

Configuration Commands
~~~~~~~~~~~~~~~~~~~~~~

* **``selectPort``** - Select the serial port for communication (``espIdf.selectPort``)
* **``setTarget``** - Set the ESP32 target device (``espIdf.setTarget``)
* **``doctor``** - Run the ESP-IDF doctor command to diagnose issues (``espIdf.doctorCommand``)

Development Commands
~~~~~~~~~~~~~~~~~~~~

* **``newProject``** - Create a new ESP-IDF project (``espIdf.newProject.start``)
* **``partitionTable``** - Open the partition table editor (``esp.webview.open.partition-table``)
* **``componentManager``** - Open the ESP component manager (``esp.component-manager.ui.show``)
* **``apptrace``** - Start application tracing (``espIdf.apptrace``)
* **``heaptrace``** - Start heap tracing (``espIdf.heaptrace``)

Usage
-----

Users can invoke the tool through VS Code's chat interface by referencing it with the ``#espIdfCommands`` syntax and providing the desired command:

.. code-block:: text

    #espIdfCommands {"command": "build"}

The tool will execute the specified ESP-IDF command and return a confirmation message.

Integration
-----------

The language tool is automatically activated when the extension starts and is properly disposed when the extension deactivates. It uses the ``onLanguageModelTool:espIdfCommands`` activation event to ensure it's available when needed.

Error Handling
--------------

The tool includes proper error handling:

* Validates that the provided command exists in the supported command list
* Returns descriptive error messages for unknown commands
* Provides confirmation messages for successful command execution
