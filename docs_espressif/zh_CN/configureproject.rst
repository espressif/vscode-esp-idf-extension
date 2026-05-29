.. _configure_your_project:

配置项目
========

:link_to_translation:`en:[English]`

前往菜单栏 ``查看`` > ``命令面板`` 并输入 ``ESP-IDF：设置乐鑫设备目标``，选择目标设备（如 esp32、esp32s2 等）。

如果使用的是已连接的 ESP-IDF 开发板，扩展会根据已连接的开发板自动选择 OpenOCD 配置。否则，可前往 ``查看`` > ``命令面板`` 并输入 ``ESP-IDF：选择 OpenOCD 开发板配置``，手动选择 OpenOCD 配置。

.. note::

    请查看 `根据目标芯片配置 OpenOCD <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_，为你的硬件选择合适的 OpenOCD 配置文件。

接下来请配置你的项目。前往菜单栏 ``查看`` > ``命令面板`` 并输入 ``ESP-IDF：SDK 配置编辑器``，开始调整 ESP-IDF 项目设置。

.. image:: ../../media/tutorials/basic_use/gui_menuconfig.png

完成更改后，点击 ``保存`` 并关闭此窗口。

接下来请 :ref:`构建项目 <build the project>`。

添加 ESP-IDF 组件
-----------------

`ESP 组件注册表 <https://components.espressif.com>`_ 汇集了可轻松加入项目的 ESP-IDF 组件。你可以在 Visual Studio Code 中浏览注册表、安装组件，并直接从组件示例创建新的 ESP-IDF 项目。

在 Visual Studio Code 中：

- 前往 ``查看`` > ``命令面板``。
- 输入 ``ESP-IDF: Show ESP Component Registry`` 并选择该命令，打开 ESP 组件注册表界面。

``ESP-IDF: Show ESP Component Registry`` 命令会打开一个界面，展示 `ESP 组件注册表 <https://components.espressif.com>`_。

.. image:: ../../media/tutorials/features/component-registry.png

你可以浏览各类 ESP 组件，并通过 ``Install`` 按钮将其安装到当前的 ESP-IDF 项目中。

.. image:: ../../media/tutorials/features/install-component.png

更多信息请参阅 `ESP 组件注册表文档 <https://docs.espressif.com/projects/idf-component-manager/zh_CN/latest/>`_。

使用其他 ESP 方案
-----------------

如果你在使用 ESP-Matter、ESP-RainMaker 等 ESP 方案，通常可以在 ESP 组件注册表中找到它们；既可以基于其示例创建项目，也可以将组件安装到当前的 ESP-IDF 项目中。

若要使用这些 ESP 方案的主线（main）分支，只需在项目的 ``.vscode/settings.json`` 中通过 VS Code 配置项 ``idf.customExtraVars`` 定义需要导出的环境变量。

例如，对于 `ESP-Matter <https://github.com/espressif/esp-matter>`_，需要将 ``ESP_MATTER_PATH`` 设置为本地 ESP-Matter 仓库路径：

.. code-block:: JSON

    {
        "idf.customExtraVars": {
            "ESP_MATTER_PATH": "/path/to/esp-matter"
        }
    }

也可以在 Visual Studio Code 的「设置」界面中完成：

- 前往 ``查看`` > ``命令面板``。
- 输入 ``Preferences: Open Settings (UI)`` 并选择该命令打开设置界面。选择 ``工作区`` 标签以编辑当前工作区（你的 ESP-IDF 项目）的设置，或选择 ``用户`` 标签以编辑所有 VS Code 实例的通用设置。
- 搜索 ``idf custom extra vars`` 或 ``idf.customExtraVars``。
- 点击 ``Add Item``，添加变量名（例如 ``ESP_MATTER_PATH``）及其值（例如 ``/path/to/esp-matter``）。

C 和 C++ 代码导航及语法高亮
---------------------------

.. note::

    若按 :ref:`配置项目 <configure_your_project>` 中的说明创建项目，C 和 C++ 代码导航会自动完成配置；相关命令会生成 ``{PROJECT_DIRECTORY_PATH}/.vscode/c_cpp_properties.json`` 文件。

若想使用代码导航和 C/C++ 语法高亮，可以安装 `微软 C/C++ 扩展 <https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools>`_、`LLVM clangd 扩展 <https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd>`_，或其他你偏好的扩展。

通常 C/C++ 语言扩展依赖位于项目构建目录中的 ``compile_commands.json`` 文件。可使用 ``ESP-IDF：运行 idf.py reconfigure 任务`` 生成该文件。

对于 `LLVM clangd 扩展 <https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd>`_，可使用 ``ESP-IDF: Configure project for ESP-Clang`` 配置该扩展的参数。
该命令会在已配置的 ESP-IDF 环境中查找 ``esp-clang``，并结合 ``idf.buildPath``（Windows 上为 ``idf.buildPathWin``）指定的构建目录，以及当前 ``IDF_TARGET`` 与已配置 ESP-IDF 环境中的 GCC 工具链路径，用于设置 clangd 的路径与参数。

配置结果示例如下：

.. code-block:: JSON

    {
        "clangd.path": "/Users/user/.espressif/tools/esp-clang/esp-18.1.2_20240912/esp-clang/bin/clangd",
        "clangd.arguments": [
            "--background-index",
            "--query-driver=/Users/user/.espressif/tools/xtensa-esp-elf/esp-14.2.0_20241119/xtensa-esp-elf/bin/xtensa-esp32-elf-gcc",
            "--compile-commands-dir=/path/to/esp-idf-project/build"
        ]
    }


对于 `微软 C/C++ 扩展 <https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools>`_，配置文件位于 ``{PROJECT_DIRECTORY_PATH}/.vscode/c_cpp_properties.json``。可通过 ``ESP-IDF: New Project`` 创建项目生成该文件，或在已有 ESP-IDF 项目中使用 ``ESP-IDF: Add VS Code Configuration Folder`` 命令生成。

文件结构示例如下：

.. code-block:: JSON

  {
    "configurations": [
      {
        "name": "ESP-IDF",
        "compilerPath": "/path/to/toolchain-gcc",
        "compileCommands": "${workspaceFolder}/build/compile_commands.json",
        "includePath": [
          "/path/to/esp-idf/components/**",
          "${workspaceFolder}/**"
        ],
        "browse": {
          "path": [
            "/path/to/esp-idf/components",
            "${workspaceFolder}"
          ]
        }
      }
    ]
  }

如果未配置 ``compile_commands.json``，微软 C/C++ 扩展会浏览所提供的 ESP-IDF 路径以解析代码导航。
