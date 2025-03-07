.. _installation:

安装 ESP-IDF 和相关工具
=======================

:link_to_translation:`en:[English]`

下载 Visual Studio Code (VS Code) 后，需要在 VS Code 中安装 ESP-IDF 扩展。

- 前往菜单栏 ``查看`` > ``扩展``，也可以在 Windows/Linux 系统中使用快捷键 :kbd:`Ctrl+Shift+X`，或在 macOS 系统中使用快捷键 :kbd:`Shift+⌘+X`。

- 从扩展列表中搜索 `ESP-IDF <https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension>`_。

1.  安装 ESP-IDF 扩展。

    - 前往菜单栏 ``查看`` > ``命令面板``。

    - 输入 ``ESP-IDF: 配置 ESP-IDF 扩展``，选中该命令以启动设置向导。用户界面将显示加载通知，随后出现设置向导。

    .. note::

        ESP-IDF 5.0 以下的版本不支持在配置路径中添加空格。

    .. image:: ../../media/tutorials/setup/select-mode.png

2.  点击 ``Express`` 并选择下载服务器：

    - ``Espressif``：推荐中国用户使用乐鑫下载服务器，下载速度更快。
    - ``Github``：使用 GitHub 上的下载链接。

3.  选择要下载的 ESP-IDF 版本，或使用 ``Find ESP-IDF in your system`` 选项搜索现有的 ESP-IDF 目录。

    .. image:: ../../media/tutorials/setup/select-esp-idf.png

    选择保存 ESP-IDF 工具的位置 (``IDF_TOOLS_PATH``)，默认情况下在 Windows 系统中为 ``%USERPROFILE%\.espressif``，在macOS/Linux 系统中为 ``$HOME\.espressif``。

    .. note::

        确保 ``IDF_TOOLS_PATH`` 中没有空格，避免出现构建问题。此外，要注意 ``IDF_TOOLS_PATH`` 与 ``IDF_PATH`` 不能在相同目录下。

    .. note::

        macOS/Linux 用户需要选择用于创建 ESP-IDF Python 虚拟环境的 Python 可执行文件。

4.  点击 ``Install`` 开始下载和安装 ESP-IDF 和 ESP-IDF 工具。

5.  用户界面中将显示设置的进度：

    - ESP-IDF 下载进度
    - ESP-IDF 工具下载和安装进度
    - Python 虚拟环境创建进度及 ESP-IDF Python 依赖包安装进度

    .. image:: ../../media/tutorials/setup/install-status.png

6.  若一切安装正确，页面将显示所有设置已完成配置的消息。

    .. image:: ../../media/tutorials/setup/install-complete.png

    .. note::

        扩展会提示 Linux 用户使用 sudo 权限，在 ``/etc/udev/rules.d`` 中添加 OpenOCD 规则。

7.  接下来请 :ref:`创建 ESP-IDF 项目 <create_an_esp-idf_project>`。

    .. warning::

        如果在安装过程中遇到问题，请查看 :ref:`故障排除 <troubleshooting-section>`。


卸载 ESP-IDF VS Code 扩展
-------------------------

可以参照以下操作步骤，卸载 ESP-IDF VS Code 扩展：

1.  打开命令面板（快捷键为 F1），输入 ``ESP-IDF：清除已保存的 ESP-IDF 设置``，选择该命令以移除所有 ESP-IDF 设置。

2.  前往菜单栏 ``查看`` > ``扩展``，也可以在 Windows/Linux 系统中使用快捷键 :kbd:`Ctrl+Shift+X`，或在 macOS 系统中使用快捷键 :kbd:`Shift+⌘+X`。

3.  搜索 `ESP-IDF` 并点击 ``Uninstall`` 按钮。

4.  确保删除以下文件夹：

    - 前往 `${VSCODE_EXTENSION_DIR}` 并删除 ESP-IDF 插件文件夹。

    - 扩展存储在 `${VSCODE_EXTENSION_DIR}`：

      - **Windows**：``%USERPROFILE%/.vscode/extensions/espressif.esp-idf-extension-VERSION/``
      - **macOS/Linux**：``$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/``

    .. note::

        请将 `VERSION` 替换为已安装的 ESP-IDF 扩展的实际版本号。
