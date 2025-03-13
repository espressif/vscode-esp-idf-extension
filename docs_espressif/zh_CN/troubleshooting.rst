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

如果遇到无法解决的问题，请在 `GitHub 仓库问题 <http://github.com/espressif/vscode-esp-idf-extension/issues>`_ 中搜索现有问题或点击 `此处 <https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose>`_ 创建新问题。
