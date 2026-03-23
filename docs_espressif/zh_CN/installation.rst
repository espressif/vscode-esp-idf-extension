.. _installation:

安装 ESP-IDF 和相关工具
=======================

:link_to_translation:`en:[English]`

安装 Visual Studio Code (VS Code) 后，需要安装 ESP-IDF 的 VS Code 扩展。

- 前往 ``查看`` > ``扩展``，或使用快捷键 :kbd:`Ctrl+Shift+X` (Windows/Linux) 或 :kbd:`Shift+⌘+X` (macOS)。

- 在扩展列表中搜索 `ESP-IDF <https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension>`_。

1.  安装 ESP-IDF 扩展。

    - 前往 ``查看`` > ``命令面板``。

    - 输入 ``ESP-IDF: Open ESP-IDF Installation Manager``，下载并运行 ESP-IDF 安装管理器以安装 ESP-IDF 框架。将先出现加载提示，随后启动安装程序。

    .. note::

        对于 ESP-IDF 5.0 以下版本，配置路径中不支持包含空格。

2.  或者，您可以从以下链接下载 ESP-IDF 安装管理器：`ESP-IDF 安装管理器 <https://dl.espressif.com/dl/eim/index.html>`_，并在以下选项中选择：

    - ``Download``：使用乐鑫下载服务器，在中国大陆下载速度更快。
    - ``GitHub``：使用 GitHub 发布链接。

3.  使用 ESP-IDF 安装管理器安装 ESP-IDF 及工具。如需帮助，可参阅 `ESP-IDF 安装管理器文档 <https://docs.espressif.com/projects/idf-im-ui/zh_CN/latest/general_info.html>`_。
    .. note::

        在 SSH、WSL、Dev Containers、Codespaces 或基于浏览器的 VS Code 等远程或无头环境中，扩展会运行 ``eim wizard``，而不是启动 GUI。首次在 Linux 环境中启动该向导时，扩展还会将 EIM 可执行文件所在目录添加到远程用户的 shell PATH 中，以便后续可在新的终端里直接运行 ``eim``。可用命令请参考 `EIM CLI 命令文档 <https://docs.espressif.com/projects/idf-im-ui/en/latest/cli_commands.html>`_。

4. 通过读取 EIM 的 **eim_idf.json** 文件，使用 ESP-IDF 安装管理器安装的所有 ESP-IDF 版本都会被 ESP-IDF VS Code 扩展自动识别。

    .. note::

        **eim_idf.json** 默认路径为：Windows 下 ``C:\Espressif\tools\eim_idf.json``，macOS/Linux 下 ``$HOME/.espressif/tools/eim_idf.json``。
        若 **eim_idf.json** 不在默认位置，可在 Visual Studio Code 中通过 ``Preferences: Open Settings (UI)`` 命令，使用扩展配置项 ``idf.eimIdfJsonPath`` 指定 EIM **eim_idf.json** 的路径。

5. 在 Visual Studio Code 中，前往 ``查看`` > ``命令面板``，输入 ``select current esp-idf version``，在列表中选择 **ESP-IDF: Select Current ESP-IDF Version**。

   将显示可用的 ESP-IDF 配置列表，选择要用于当前 ESP-IDF 项目的配置。

   - 所选配置将保存为 **idf.currentSetup**（包含所选 ESP-IDF 路径），扩展会为当前 ESP-IDF 项目配置所需的环境变量，并保存为工作区文件夹状态。

   - 可通过运行 **ESP-IDF: Doctor Command** 检查配置：前往 ``查看`` > ``命令面板``，输入 ``doctor command``，在列表中选择 **ESP-IDF: Doctor Command**。

6.  下一步请 :ref:`创建 ESP-IDF 项目 <create_an_esp-idf_project>`。

    .. warning::

        若在安装过程中遇到问题，请查看 :ref:`故障排除 <troubleshooting-section>` 章节。

在 VS Code 的 ESP-IDF 扩展中手动配置 ESP-IDF 与工具
---------------------------------------------------

.. note::

     若通过环境变量配置了扩展，扩展将优先使用这些环境变量，而不会使用在 ``idf.currentSetup`` 中选定的 ESP-IDF 配置。因此，若要使用在扩展中选定的 ESP-IDF 配置，请清除相关环境变量。

您可以手动配置 VS Code 的 ESP-IDF 扩展，使其使用已有的 ESP-IDF 环境，方法是在 Visual Studio Code 设置中为扩展设置所需环境变量。配置扩展需要提供 ESP-IDF 路径 (IDF_PATH)、要追加到 PATH 的 ESP-IDF 工具集或 ESP-IDF 工具路径 (IDF_TOOLS_PATH)，以及 Python 环境路径 (IDF_PYTHON_ENV_PATH)。

例如，若 ESP-IDF 安装在 ``/home/user/esp-idf``，工具位于 ``/home/user/.espressif/``，Python 虚拟环境位于 ``/home/user/.espressif/python_env/idf6.1_py3.13_env``，可按如下方式配置扩展：

1. 打开命令面板（快捷键 F1），输入 ``Preferences: Open Settings (JSON)`` 并选择该命令。
2. 在 settings.json 中加入以下配置，并将路径替换为您实际的 ESP-IDF 与工具路径：

   .. code-block:: json

      {
        "idf.customExtraVars": {
          "IDF_PATH": "/home/user/esp-idf",
          "IDF_TOOLS_PATH": "/home/user/.espressif",
          "IDF_PYTHON_ENV_PATH": "/home/user/.espressif/python_env/idf6.1_py3.13_env"
        }
      }
3. 或者，也可使用 PATH（Windows 下为 Path）列出要追加到 PATH 的工具路径：

   .. code-block:: json

      {
        "idf.customExtraVars": {
          "IDF_PATH": "/home/user/esp-idf",
          "PATH": "/home/user/.espressif/tools/xtensa-esp-elf-gdb/16.3_20250913/xtensa-esp-elf-gdb/bin:/home/user/.espressif/tools/riscv32-esp-elf-gdb/16.3_20250913/riscv32-esp-elf-gdb/bin:/home/user/.espressif/tools/xtensa-esp-elf/esp-15.2.0_20251204/xtensa-esp-elf/bin:/home/user/.espressif/tools/riscv32-esp-elf/esp-15.2.0_20251204/riscv32-esp-elf/bin:/home/user/.espressif/tools/esp32ulp-elf/2.38_20240113/esp32ulp-elf/bin:/home/user/.espressif/tools/cmake/4.0.3/CMake.app/Contents/bin:/home/user/.espressif/tools/openocd-esp32/v0.12.0-esp32-20260304/openocd-esp32/bin:/home/user/.espressif/tools/ninja/1.12.1:/home/user/.espressif/tools/esp-rom-elfs/20241011",
          "IDF_PYTHON_ENV_PATH": "/home/user/.espressif/python_env/idf6.1_py3.13_env"
        }
      }

若您使用的是 ESP-IDF 安装管理器 (EIM) 出现之前安装的 ESP-IDF，可使用以下命令从您的 ESP-IDF 环境获取这些环境变量：

.. code-block:: bash

   source /home/user/esp-idf/export.sh
   python /home/user/esp-idf/tools/idf_tools.py export --format key-value

若您通过 ESP-IDF 安装管理器安装了 ESP-IDF，可使用 ESP-IDF 激活脚本获取所需环境变量：

.. code-block:: bash

   ./home/user/.espressif/tools/activate_idf_v6.0.sh -e

卸载 ESP-IDF VS Code 扩展
-------------------------

卸载 ESP-IDF VS Code 扩展可按以下步骤操作：

1.  打开命令面板（快捷键 F1），输入 ``ESP-IDF: Remove ESP-IDF Settings``，选择该命令以移除所有 ESP-IDF 设置。

2.  前往 ``查看`` > ``扩展``，或使用快捷键 :kbd:`Ctrl+Shift+X` (Windows/Linux) 或 :kbd:`Shift+⌘+X` (macOS)。

3.  搜索 `ESP-IDF` 并点击 ``Uninstall`` 按钮。

4.  删除以下文件夹：

    - 进入 `${VSCODE_EXTENSION_DIR}` 并删除 ESP-IDF 插件文件夹。

    - `${VSCODE_EXTENSION_DIR}` 即扩展所在位置：

      - **Windows**：``%USERPROFILE%/.vscode/extensions/espressif.esp-idf-extension-VERSION/``
      - **macOS/Linux**：``$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/``

    .. note::

        请将 `VERSION` 替换为已安装的 ESP-IDF 扩展的实际版本号。
