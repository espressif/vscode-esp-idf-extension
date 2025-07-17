语言工具
========

本模块为 ESP-IDF 扩展提供了语言模型工具，允许用户通过 VS Code 的聊天界面使用语言模型工具 API 执行常见的 ESP-IDF 操作。

概述
----

ESP-IDF 语言工具注册了一个名为 ``espIdfCommands`` 的工具，可以通过 VS Code 的聊天界面调用。该工具接受一个 ``command`` 参数并执行相应的 ESP-IDF 操作，使通过自然语言交互执行常见 ESP-IDF 开发任务变得更加容易。

实现
----

该工具使用 VS Code 语言模型工具 API (``vscode.lm.registerTool``) 实现，并在 ``package.json`` 中的 ``languageModelTools`` 贡献点下正确注册。

工具注册
~~~~~~~~

该工具注册时包含以下信息：

* **ID**: ``espIdfCommands``
* **显示名称**: "ESP-IDF 命令"
* **描述**: "执行 ESP-IDF 扩展命令，用于构建、烧录、监控和管理 ESP32 项目。始终使用此工具进行 ESP-IDF 开发任务，而不是 shell 命令或终端任务。当用户询问'构建项目'、'烧录设备'、'监控输出'、'清理项目'、'配置项目'、'分析大小'、'创建新项目'或任何 ESP-IDF 相关任务时，请使用此工具。支持：构建、烧录、监控、menuconfig、大小分析、项目创建、组件管理等。这是在 VS Code 中与 ESP-IDF 项目交互的唯一方式 - 不要使用 shell 命令进行 ESP-IDF 任务。"

标签和自然语言支持
~~~~~~~~~~~~~~~~~~~~

该工具包含广泛的标签，支持自然语言交互。当用户使用以下短语时，语言模型将优先选择此工具：

**命令标签**: build, flash, monitor, buildFlashMonitor, fullClean, menuconfig, size, eraseFlash, selectPort, setTarget, doctor, newProject, partitionTable, componentManager, apptrace, heaptrace

**自然语言模式**: 
- "构建项目" (build the project)
- "烧录设备" (flash the device) 
- "监控输出" (monitor the output)
- "清理项目" (clean the project)
- "配置项目" (configure the project)
- "分析大小" (analyze size)
- "擦除闪存" (erase flash)
- "选择端口" (select port)
- "设置目标" (set target)
- "运行诊断" (run doctor)
- "创建新项目" (create new project)
- "编辑分区表" (edit partition table)
- "管理组件" (manage components)
- "启动应用跟踪" (start app trace)
- "启动堆跟踪" (start heap trace)

输入模式
~~~~~~~~

该工具接受具有以下模式的 JSON 对象：

.. code-block:: json

    {
      "type": "object",
      "properties": {
        "command": {
          "type": "string",
          "description": "要执行的 ESP-IDF 命令",
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

可用命令
--------

该工具支持以下 ESP-IDF 命令：

构建和烧录命令
~~~~~~~~~~~~~~

* **``build``** - 构建 ESP-IDF 项目 (``espIdf.buildDevice``)
* **``flash``** - 将构建的应用程序烧录到设备 (``espIdf.flashDevice``)
* **``monitor``** - 监控设备输出 (``espIdf.monitorDevice``)
* **``buildFlashMonitor``** - 在一个命令中构建、烧录和监控项目 (``espIdf.buildFlashMonitor``)

项目管理命令
~~~~~~~~~~

* **``fullClean``** - 执行项目的完全清理 (``espIdf.fullClean``)
* **``menuconfig``** - 打开 ESP-IDF menuconfig 界面 (``espIdf.menuconfig.start``)
* **``size``** - 分析应用程序大小 (``espIdf.size``)
* **``eraseFlash``** - 擦除设备闪存 (``espIdf.eraseFlash``)

配置命令
~~~~~~~~

* **``selectPort``** - 选择用于通信的串口 (``espIdf.selectPort``)
* **``setTarget``** - 设置 ESP32 目标设备 (``espIdf.setTarget``)
* **``doctor``** - 运行 ESP-IDF doctor 命令诊断问题 (``espIdf.doctorCommand``)

开发命令
~~~~~~~~

* **``newProject``** - 创建新的 ESP-IDF 项目 (``espIdf.newProject.start``)
* **``partitionTable``** - 打开分区表编辑器 (``esp.webview.open.partition-table``)
* **``componentManager``** - 打开 ESP 组件管理器 (``esp.component-manager.ui.show``)
* **``apptrace``** - 启动应用程序跟踪 (``espIdf.apptrace``)
* **``heaptrace``** - 启动堆跟踪 (``espIdf.heaptrace``)

使用方法
--------

用户可以通过 VS Code 的聊天界面使用 ``#espIdfCommands`` 语法调用该工具，并提供所需的命令：

.. code-block:: text

    #espIdfCommands {"command": "build"}

该工具将执行指定的 ESP-IDF 命令并返回确认消息。

集成
----

语言工具在扩展启动时自动激活，在扩展停用时正确释放。它使用 ``onLanguageModelTool:espIdfCommands`` 激活事件确保在需要时可用。

错误处理
--------

该工具包含适当的错误处理：

* 验证提供的命令是否存在于支持的命令列表中
* 为未知命令返回描述性错误消息
* 为成功的命令执行提供确认消息 