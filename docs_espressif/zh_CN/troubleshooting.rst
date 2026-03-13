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

通过 Snap 安装的 VS Code（Ubuntu）
------------------------------------

如果你通过 snap 安装了 VS Code（Ubuntu 的默认安装方式），运行 **ESP-IDF: Open Installation Manager** 命令时可能会遇到以下错误：

.. code-block:: text

    The terminal process "/usr/bin/bash" terminated with exit code: 127.

这是因为 snap 软件包在沙盒环境中运行，阻止 VS Code 通过其集成终端启动外部应用程序。

扩展会检测到这种情况并显示包含操作说明的通知。你有以下几种选择：

1.  **从系统终端手动运行 EIM**：扩展会显示 EIM 路径并提供 **复制 EIM 路径** 按钮。在 VS Code 之外打开终端应用程序（例如 GNOME Terminal、Konsole），然后粘贴复制的路径以启动 EIM。

    Linux 上的默认 EIM 路径为：

    .. code-block:: text

        ~/.espressif/eim_gui/eim

2.  **通过 .deb 安装包安装 VS Code** （推荐）：这将完全消除 snap 的沙盒限制。卸载 snap 版本，然后从 `code.visualstudio.com <https://code.visualstudio.com/Download>`_ 下载并安装官方 ``.deb`` 安装包：

    .. code-block:: bash

        sudo snap remove code
        # 然后安装从 https://code.visualstudio.com/Download 下载的 .deb 安装包

3.  **手动运行 EIM**：当检测到 snap 限制时，扩展会弹出一个模态对话框，包含 **复制 EIM 路径** 按钮（将路径复制到剪贴板，以便在系统终端中粘贴运行）和 **打开文档** 按钮以获取更多帮助。

如果遇到无法解决的问题，请在 `GitHub 仓库问题 <http://github.com/espressif/vscode-esp-idf-extension/issues>`_ 中搜索现有问题或点击 `此处 <https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose>`_ 创建新问题。
