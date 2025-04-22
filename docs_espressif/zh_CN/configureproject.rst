.. _configure_your_project:

配置项目
========

:link_to_translation:`en:[English]`

前往菜单栏 ``查看`` > ``命令面板`` 并输入 ``ESP-IDF：设置乐鑫设备目标``，选择目标设备（如 esp32, esp32s2 等）。

前往菜单栏 ``查看`` > ``命令面板`` 并输入 ``ESP-IDF：选择 OpenOCD 开发板配置``，选择扩展中 OpenOCD 服务器的配置文件。

.. note::

    请查看 `根据目标芯片配置 OpenOCD <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_，为你的硬件选择合适的 OpenOCD 配置文件。

接下来请配置你的项目。前往菜单栏 ``查看`` > ``命令面板`` 并输入 ``ESP-IDF：SDK 配置编辑器``，开始调整 ESP-IDF 项目设置。

.. image:: ../../media/tutorials/basic_use/gui_menuconfig.png

完成更改后，点击 ``保存`` 并关闭此窗口。

接下来请 :ref:`构建项目 <build the project>`。

C 和 C++ 代码导航及语法高亮
---------------------------

.. note::

    只要按照 :ref:`配置项目 <configure_your_project>` 中的描述创建项目，就无需额外配置 C 和 C++ 代码导航，因为 :ref:`配置项目 <configure_your_project>` 中提到的命令将自动生成 ``{PROJECT_DIRECTORY_PATH}/.vscode/c_cpp_properties.json`` 文件。

若想使用代码导航和 C/C++ 语法高亮，可以下载 `微软 C/C++ 扩展 <https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools>`_、`LLVM clangd 扩展 <https://marketplace.visualstudio.com/items?itemName=llvm-vs-code-extensions.vscode-clangd>`_ 或其他偏好的扩展。

C/C++ 语言扩展通常都依赖于 ``compile_commands.json`` 文件，该文件位于项目的构建目录中，可以使用 ``ESP-IDF：运行 idf.py reconfigure 任务`` 命令来生成。

LLVM CLangd 扩展只需要用到 ``compile_commands.json`` 文件；而 Microsoft C/C++ 扩展的配置文件位于 ``{PROJECT_DIRECTORY_PATH}/.vscode/c_cpp_properties.json``，可以使用 ``ESP-IDF：新建项目``、``ESP-IDF：展示示例项目`` 命令或在现有的 ESP-IDF 项目中使用 ``ESP-IDF：添加 .vscode 配置文件夹`` 命令来生成该文件。

配置文件的格式如下：

.. code-block:: JSON

    {
        "configurations": [
            {
                "name": "ESP-IDF",
                "compilerPath": "/path/to/toolchain-gcc",
                "compileCommands": "${workspaceFolder}/build/compile_commands.json",
                "includePath": [
                    "/path/to/esp-idf/components/**",
                    "${workspaceFolder}/"
                ],
                "browse": {
                    "path": [
                        "/path/to/esp-idf/components/**",
                        "${workspaceFolder}"
                    ]
                }
            }
        ]
    }

如果未定义 ``compile_commands.json`` 文件，Microsoft C/C++ 扩展将浏览所提供的 ESP-IDF 路径以实现代码导航。
