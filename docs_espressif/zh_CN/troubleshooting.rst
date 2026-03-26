.. _troubleshooting-section:

故障排除
========

:link_to_translation:`en:[English]`

.. note::

    * 将 ``idf.openOcdDebugLevel`` 等级配置为 4 及以上，从而在 OpenOCD 服务器输出中启用调试日志。
    * 在 ``<project-directory>/.vscode/launch.json`` 文件中，将 ``logLevel`` 等级设置为 3 及以上，从而显示更多调试适配器的输出信息。

在 Visual Studio Code 中，前往菜单栏 ``查看`` > ``输出``，在下拉框中选择 ``ESP-IDF``，该输出窗口会提供有关 ESP-IDF 扩展活动的有用信息。

在 Visual Studio Code 中，前往菜单栏 ``查看`` > ``命令面板``，选择 ``ESP-IDF：诊断命令`` 以生成环境配置报告。该报告将自动复制到剪贴板上以便粘贴。

可以从以下位置获取并查看日志文件：

- **Windows**：``%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION\esp_idf_vsc_ext.log``
- **macOS/Linux**：``$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/esp_idf_vsc_ext.log``

在 Visual Studio Code 中，前往菜单栏 ``帮助`` > ``切换开发人员工具``，在 Console 选项卡中复制与此扩展相关的错误。

Visual Studio Code 支持不同级别的设置，如：**全局（用户设置）**、**工作区** 和 **工作区文件夹**，请确保正确设置项目。运行 ``ESP-IDF：诊断命令`` 可以查看当前使用的设置。

查看 `OpenOCD 故障排除 FAQ <https://github.com/espressif/openocd-esp32/wiki/Troubleshooting-FAQ>`_，获取有关 OpenOCD 输出、应用程序跟踪、调试等相关的问题。

.. note::

    在 Windows 系统中克隆 ESP-IDF 时，如果收到类似 "unable to create symlink" 的错误，可以尝试启用 **Developer Mode**。

EIM 启动模式（GUI 与 CLI）
-----------------------------

运行 **ESP-IDF: Open ESP-IDF Installation Manager** 命令时，扩展会提示你选择：

-  **图形界面 (GUI)** -- 打开 EIM 图形应用程序。
-  **命令行 (终端)** -- 在 VS Code 集成终端中以 CLI 模式运行 EIM。

你也可以使用专用命令跳过提示：

-  **ESP-IDF: Open ESP-IDF Installation Manager (GUI)** -- 始终以 GUI 模式启动。
-  **ESP-IDF: Open ESP-IDF Installation Manager (Terminal)** -- 始终以 CLI 模式启动。

你的选择会保存到 ``idf.eimExecutableArgs`` 设置中。

远程和无头环境
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

在远程环境（SSH、WSL、Dev Containers、Codespaces）和基于浏览器的 VS Code 中，无法显示 GUI。扩展会在这些情况下自动强制使用 CLI（wizard）模式 -- 不会显示提示。

对于基于 Linux 的远程用户，扩展在首次启动 ``eim wizard`` 时，还会将 EIM 可执行文件所在目录追加到用户的 shell PATH 中。这样在之后的新终端里，无需复制完整二进制路径即可直接运行 ``eim``。

重新打开一个终端后，你可以参考 `EIM CLI 命令文档 <https://docs.espressif.com/projects/idf-im-ui/en/latest/cli_commands.html>`_，自行运行 ``eim list``、``eim run`` 等命令。

通过 Snap 安装的 VS Code（Ubuntu）
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

如果你通过 snap 安装了 VS Code（Ubuntu 的默认安装方式），由于沙盒限制，EIM GUI 无法启动。你可能会看到以下错误：

.. code-block:: text

    The terminal process "/usr/bin/bash" terminated with exit code: 127.

当检测到 snap 时，扩展会显示一个模态对话框，提供两个选项：

1.  **在终端中运行 EIM** -- 直接在 VS Code 集成终端中以 CLI 模式启动 EIM。

2.  **复制 EIM 路径** -- 将 EIM 二进制文件路径复制到剪贴板，以便你从系统终端（例如 GNOME Terminal、Konsole）手动运行 GUI。

    Linux 上的默认 EIM 路径为：

    .. code-block:: text

        ~/.espressif/eim_gui/eim

或者，你可以 **通过 .deb 安装包安装 VS Code** （推荐），以完全消除 snap 的沙盒限制：

.. code-block:: bash

    sudo snap remove code
    # Then install the .deb package downloaded from https://code.visualstudio.com/Download

你也可以直接使用 **ESP-IDF: Open ESP-IDF Installation Manager (Terminal)** 命令跳过模态对话框，直接以 CLI 模式启动 EIM。

如果遇到无法解决的问题，请在 `GitHub 仓库问题 <http://github.com/espressif/vscode-esp-idf-extension/issues>`_ 中搜索现有问题或点击 `此处 <https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose>`_ 创建新问题。
