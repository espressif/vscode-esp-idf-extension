.. _installation:

安装 ESP-IDF 和相关工具
=======================

:link_to_translation:`en:[English]`

安装 Visual Studio Code (VS Code) 后，需要安装 ESP-IDF 的 VS Code 扩展。

- 前往 ``查看`` > ``扩展``，或使用快捷键 :kbd:`Ctrl+Shift+X` (Windows/Linux) 或 :kbd:`Shift+Cmd+X` (macOS)。

- 在扩展列表中搜索 `ESP-IDF <https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension>`_。

1.  安装 ESP-IDF 扩展。

    - 前往 ``查看`` > ``命令面板``。

    - 输入 ``ESP-IDF: Open ESP-IDF Install Manager``，通过该命令下载并运行 ESP-IDF 安装管理器以安装 ESP-IDF 框架。将先出现加载提示，随后启动安装程序。

    .. note::

        对于 ESP-IDF 5.0 以下版本，配置路径中不支持包含空格。

2.  你也可以通过以下链接在提供的选项中选择并下载 ESP-IDF 安装管理器：`ESP-IDF 安装管理器 <https://dl.espressif.com/dl/eim/index.html>`_：

    - ``Download``：使用乐鑫下载服务器，在中国大陆下载速度更快。
    - ``Github``：使用 GitHub 发布链接。

3.  使用 ESP-IDF 安装管理器安装 ESP-IDF 及工具。如需帮助，可参阅 `ESP-IDF 安装管理器文档 <https://docs.espressif.com/projects/idf-im-ui/en/latest/general_info.html>`_。

4.  在 Visual Studio Code 中，前往 ``查看`` > ``命令面板``，输入 ``select current esp-idf version``，在列表中选择 ``ESP-IDF: Select Current ESP-IDF Version``。

   将显示可用的 ESP-IDF 配置列表，选择要用于当前 ESP-IDF 项目的配置。

   - 所选配置将保存为 ``idf.currentSetup``（包含所选 ESP-IDF 路径），扩展会为当前 ESP-IDF 项目配置所需的环境变量，并保存为工作区文件夹状态。

   - 可通过运行 ``ESP-IDF: Doctor Command`` 检查配置：前往 ``查看`` > ``命令面板``，输入 ``doctor command``，在列表中选择 ``ESP-IDF: ESP-IDF: Doctor Command``。

5.  下一步请 :ref:`创建 ESP-IDF 项目 <create_an_esp-idf_project>`。

    .. warning::

        若在安装过程中遇到问题，请查看 :ref:`故障排除 <troubleshooting-section>` 章节。


卸载 ESP-IDF VS Code 扩展
-------------------------

卸载 ESP-IDF VS Code 扩展可按以下步骤操作：

1.  打开命令面板（快捷键 F1），输入 ``ESP-IDF: Remove ESP-IDF Settings``，选择该命令以移除所有 ESP-IDF 设置。

2.  前往 ``查看`` > ``扩展``，或使用快捷键 :kbd:`Ctrl+Shift+X` (Windows/Linux) 或 :kbd:`Shift+Cmd+X` (macOS)。

3.  搜索 ``ESP-IDF`` 并点击 ``Uninstall`` 按钮。

4.  删除以下文件夹：

    - 进入 `${VSCODE_EXTENSION_DIR}` 并删除 ESP-IDF 插件文件夹。

    - `${VSCODE_EXTENSION_DIR}` 即扩展所在位置：

      - **Windows**：``%USERPROFILE%/.vscode/extensions/espressif.esp-idf-extension-VERSION/``
      - **macOS/Linux**：``$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/``

    .. note::

        请将 `VERSION` 替换为已安装的 ESP-IDF 扩展的实际版本号。
