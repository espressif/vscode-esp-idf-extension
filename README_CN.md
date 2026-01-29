<a href="https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension">
  <img src="./media/espressif_icon.png" alt="espressif logo" title="Espressif" align="right" height="60" />
</a>

# 适用于 VS Code 的 ESP-IDF 扩展

[英文](./README.md)

[![乐鑫文档](https://img.shields.io/badge/文档中心-red)](https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/)
[![故障排除](https://img.shields.io/badge/故障排除-red)](./README_CN.md#故障排除)
![版本](https://img.shields.io/github/package-json/v/espressif/vscode-esp-idf-extension)
[![发布](https://img.shields.io/badge/Github-发布-blue)](https://github.com/espressif/vscode-esp-idf-extension/releases)
[![论坛](https://img.shields.io/badge/论坛-esp32.com-blue)](https://esp32.com/viewforum.php?f=40)

基于乐鑫芯片，可通过乐鑫物联网开发框架 [(ESP-IDF)](https://github.com/espressif/esp-idf) 来开发、构建、烧录、监控、调试项目，详情请参见[文档中心](https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/index.html)。

<a href="https://nightly.link/espressif/vscode-esp-idf-extension/workflows/ci/master/esp-idf-extension.vsix.zip">**最新的 master 安装包**</a>适用于 Visual Studio Code。请下载此 VSIX 文件，按 <kbd>F1</kbd> 或点击 VS Code 菜单栏中的`查看` -> `命令面板`，输入`从 VSIX 安装`，选择下载好的 `.vsix` 文件来安装此扩展。

此扩展的操作指南可参考[乐鑫文档](https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/index.html)。

# 使用指南

## 安装

1. 下载并安装 [Visual Studio Code](https://code.visualstudio.com/)。

2. 在操作系统中安装 ESP-IDF 所需的软件包：

- 适用于 [MacOS 和 Linux](https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/get-started/linux-macos-setup.html) 的软件包。
- Windows 系统无需额外安装软件包。

3. 打开 VS Code，点击左侧活动栏中的扩展图标，或使用**查看：显示扩展**命令（快捷键：<kbd>⇧</kbd><kbd>⌘</kbd><kbd>X</kbd> 或 <kbd>Ctrl+Shift+X</kbd>）。

4. 搜索 [ESP-IDF 扩展](https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension)。

5. 安装上述扩展。安装成功后，![Espressif 图标](./media/readme/espressifIcon.png) 会出现在 VS Code 左侧活动栏中。点击该图标，可以看到该扩展提供的基本命令列表。

<p>
  <img src="./media/readme/commandsList.png" alt="命令列表">
</p>

6. 从命令列表中选择 **配置 ESP-IDF 扩展** 或按 <kbd>F1</kbd> 输入 `Configure ESP-IDF Extension`，然后选择 **ESP-IDF：配置 ESP-IDF 扩展** 选项。
   > **注意：** 对于 ESP-IDF 5.0 之前的版本，配置路径中不可出现空格。

<p>
  <img src="./media/readme/setup.png" alt="选择 ESP-IDF" width="950">
</p>

7. 选择 **Express** 并选择下载服务器：

- Espressif：该服务器链接在中国的下载速度更快。
- Github：使用 Github 发布链接。

8. 选择要下载的 ESP-IDF 版本，或选择 `Find ESP-IDF in your system` 选项以查找现有的 ESP-IDF 目录。

9. 选择 ESP-IDF 工具的存放位置（即 `IDF_TOOLS_PATH`），默认情况下在 MacOS/Linux 系统中是 `$HOME\.espressif`，Windows 系统中是 `%USERPROFILE%\.espressif`。

10. 如果使用 MacOS/Linux 操作系统，请选择系统 Python 可执行文件来在 ESP-IDF 工具内创建 ESP-IDF 虚拟环境，并安装 ESP-IDF Python 包。

    > **注意：** Windows 用户不需要选择 Python 可执行文件，因为此设置过程会自动安装所需文件。

11. 确保 `IDF_TOOLS_PATH` 中不包含空格，避免构建过程中出现问题，且 `IDF_TOOLS_PATH` 与 `IDF_PATH` 不能相同。

12. 此时应出现安装界面，显示设置进度状态，包括 ESP-IDF 下载进度、ESP-IDF 工具的下载和安装进度，以及 Python 虚拟环境的创建过程。

13. 如果一切正常，将收到所有设置已配置完成的消息，此时可开始使用扩展。

如有问题，请参阅[故障排除](#Troubleshooting)部分。

##  在 VS Code 中使用 ESP-IDF 扩展

ESP-IDF 扩展在 VS Code 底部蓝色窗口的状态栏中提供了一系列命令图标，将鼠标悬停在图标上时，会看到可执行的命令。

<p>
  <img src="./media/readme/statusBar.png" alt="状态栏">
</p>

以下步骤展示了这些图标的常见用例：

1. 按 <kbd>F1</kbd> 并输入 **ESP-IDF：新建项目**，从 ESP-IDF 示例创建新项目。选择 ESP-IDF 并选择示例以创建新项目。

2. 创建好新项目并在 VS Code 中打开后，点击状态栏图标 ![串口](./media/readme/serialport.png) 设置设备的串口。也可以按 <kbd>F1</kbd> 输入 **ESP-IDF：选择要使用的端口**，选择设备连接的串口。

3. 点击状态栏图标 ![IDF 目标](./media/readme/target.png) 选择使用的芯片设备（如 esp32、esp32s2 等），或按 <kbd>F1</kbd> 输入 **ESP-IDF：设置乐鑫设备目标** 命令。

4. 接下来，通过点击状态栏图标 ![sdkconfig 编辑器](./media/readme/sdkconfig.png) 或按 <kbd>F1</kbd> 输入 **ESP-IDF：SDK 配置编辑器** 命令（快捷键：<kbd>CTRL</kbd> <kbd>E</kbd> <kbd>G</kbd>），修改 ESP-IDF 项目设置。完成所有更改后，点击 `Save` 并关闭此窗口。可以在菜单栏中的`查看` -> `输出`中选择下拉列表里的 `ESP-IDF` 来查看输出信息。

5. （可选）**ESP-IDF：运行 idf.py reconfigure 任务** 命令生成 `compile_commands.json` 文件，以便启用语言支持。也可以按照 [C/C++ 配置](https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/configureproject.html#c-and-c-code-navigation-and-syntax-highlight) 文档中的说明来配置 `.vscode/c_cpp_properties.json`。

6. 请自行对代码进行必要修改。完成项目后，点击状态栏图标 ![构建](./media/readme/build.png) 或按 <kbd>F1</kbd> 输入 **ESP-IDF：构建项目** 来构建项目。

7. 点击状态栏图标 ![烧录](./media/readme/flash.png) 或按 <kbd>F1</kbd> 输入 **ESP-IDF：烧录项目**，依据使用的接口类型，在命令面板中选择 `UART`、`DFU` 或 `JTAG`，将应用程序烧录到设备上。

8. 点击状态栏图标 ![烧录方式](./media/readme/flashmethod.png) 或按 <kbd>F1</kbd> 输入 **ESP-IDF：选择烧录方式**，从 `UART`、`DFU` 或 `JTAG` 中选择想要更改的烧录方式。也可以直接使用命令 **ESP-IDF：通过 UART 接口烧录项目**、**通过 JTAG 接口烧录项目** 或 **ESP-IDF：通过 DFU 接口烧录项目**。

9. 点击状态栏图标 ![监视器](./media/readme/monitor.png) 或按 <kbd>F1</kbd> 输入 **ESP-IDF：监视设备** 启动监视器，在 VS Code 终端中记录设备活动。

10. 根据 ESP-IDF 文档中的要求来配置驱动程序，详情请参考[配置 JTAG 接口](https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/jtag-debugging/configure-ft2232h-jtag.html)。

11. 在调试设备之前，如果您使用的是已连接的 ESP-IDF 开发板，OpenOCD 配置将根据您连接的开发板自动选择，包括 USB 位置（如果可用）（需要 OpenOCD 版本 v0.12.0-esp32-20240821 或更高）。否则，您可以按 <kbd>F1</kbd> 输入 **ESP-IDF：选择 OpenOCD 开发板配置** 手动选择设备的 OpenOCD 开发板配置文件。点击状态栏图标 ![openocd](./media/readme/openocd.png) 或按 <kbd>F1</kbd> 输入 **ESP-IDF：OpenOCD 管理器** 命令来测试连接。可以在菜单栏中的`查看` -> `输出`里选择下拉列表中的 `ESP-IDF` 来查看输出信息。

    > **注意：** 可以使用 **ESP-IDF：OpenOCD 管理器** 命令或者点击 VS Code 状态栏中的 `OpenOCD Server (Running | Stopped)` 按钮来启动或停止 OpenOCD。

12. 如果您想启动调试会话，只需按 <kbd>F5</kbd>（确保项目已构建、烧录，并且 OpenOCD 正确连接以便调试器正常工作）。调试会话的输出可在菜单栏中选择`查看` -> `调试控制台`进行查看。

如有问题，请参阅[故障排除](#Troubleshooting)部分。

# 拓展阅读

所有的教程、命令和功能都收录在[适用于 VS Code 的 ESP-IDF 扩展文档中心](https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/)。

## 所有可用命令

按 <kbd>F1</kbd> 或点击菜单栏中的`查看` -> `命令面板`，输入 **ESP-IDF** 即可查看 ESP-IDF 扩展所支持的所有命令。

<table>
    <thead>
        <tr>
            <th>类别</th>
            <th>命令</th>
            <th>描述</th>
            <th>快捷键（Mac）</th>
            <th>快捷键（Windows/Linux）</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td rowspan=6 align="center">设置</td>
			<td>添加 Docker 容器配置</td>
            <td>将 <strong>.devcontainer</strong> 文件添加到当前打开的项目目录中，从而能借助 <a href="https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers">Dev Containers</a> 扩展
			在 Docker 容器中使用 ESP-IDF 项目。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>添加 VS Code 配置文件夹</td>
            <td>将 <strong>.vscode</strong> 文件添加到当前打开的项目目录中。这些文件包括 launch.json（用于调试）、settings.json 和 c_cpp_properties.json（用于语法高亮）。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>配置 ESP-IDF 扩展</td>
            <td>打开一个带有安装向导的窗口，可以安装 ESP-IDF、IDF 工具和 Python 虚拟环境。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>选择输出和通知模式</td>
            <td>此扩展会在输出窗口 <strong>ESP-IDF</strong> 中显示通知和输出。此命令可设置是否只显示通知、只显示输出、两者都显示或都不显示。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>选择配置存储位置</td>
            <td>VS Code 中的设置可存储在三处：用户设置（全局设置）、工作区（.code-workspace 文件）或工作区文件夹（.vscode/settings.json）。
            更多信息请参见<a href="https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/additionalfeatures/multiple-projects.html">处理多个项目</a>。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>选择工作区文件夹</td>
            <td>在使用包含多个工作区文件夹的 VS Code 工作区时，此命令会让此扩展的命令应用于指定文件夹。
            更多信息请参见<a href="https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/additionalfeatures/multiple-projects.html">处理多个项目</a>。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=10 align="center">基础命令</td>
            <td>设置乐鑫设备目标</td>
            <td>该命令为当前项目设置目标 (IDF_TARGET)，效果等同于 <strong>idf.py set-target</strong>。例如，若想使用 ESP32 或 ESP32-C3，则需执行此命令。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>SDK 配置编辑器</td>
            <td>启动 UI，进行 ESP-IDF 项目设置。该命令效果等同于 <strong>idf.py menuconfig</strong>。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>G</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>G</kbd></td>
        </tr>
        <tr>
            <td>构建项目</td>
            <td>使用 <strong>CMake</strong> 和 <strong>Ninja-build</strong> 来构建项目，具体说明请参见 <a href="https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#cmake">ESP-IDF 构建系统直接使用 CMake</a>。若想修改构建任务的行为，可以在配置 Cmake 时使用 <strong>idf.cmakeCompilerArgs</strong> 命令，或在配置 Ninja 时使用 <strong>idf.ninjaArgs</strong> 命令。例如，可以使用 <strong>[-j N]</strong> 来设置并行作业数，其中 N 是并行作业的数量。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>B</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>B</kbd></td>
        </tr>
        <tr>
            <td>二进制文件大小分析</td>
            <td>启动 UI 以显示 ESP-IDF 项目的二进制文件大小信息。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>S</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>S</kbd></td>
        </tr>
        <tr>
            <td>选择要使用的端口</td>
            <td>选择用于 ESP-IDF 任务（如烧录或监视设备）的串口。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>P</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>P</kbd></td>
        </tr>
        <tr>
            <td>烧录项目</td>
            <td>将当前项目生成的二进制文件烧录至目标设备。此命令将根据 <strong>idf.flashType</strong> 使用 UART、DFU 或 JTAG 接口。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>F</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>F</kbd></td>
        </tr>
        <tr>
            <td>监视设备</td>
            <td>此命令将执行 <strong>idf.py monitor</strong>，与乐鑫设备进行串行通信。
            详情请参见 <a href="https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/tools/idf-monitor.html?highlight=monitor">IDF 监视器</a>。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>M</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>M</kbd></td>
        </tr>
        <tr>
            <td>打开 ESP-IDF 终端</td>
            <td>启动一个配置了 ESP-IDF 扩展设置的终端窗口，效果类似于 ESP-IDF CLI 的 export.sh 脚本。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>T</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>T</kbd></td>
        </tr>
        <tr>
            <td>选择 OpenOCD 开发板配置</td>
            <td>选择与使用的乐鑫设备目标相匹配的 OpenOCD 配置文件。例如，可以选择 DevKitC 或 ESP-Wrover-Kit。使用 JTAG 接口进行烧录或对设备进行调试时，此步骤必不可缺。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>构建、烧录项目并监视设备</td>
            <td>此命令可用于构建项目、将二进制程序写入设备，并启动监视终端，效果类似于 <strong>idf.py build flash monitor</strong>。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>D</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>D</kbd></td>
        </tr>
        <tr>
            <td rowspan=4 align="center">创建项目</td>
            <td>创建新 ESP-IDF 组件</td>
            <td>在当前目录下，基于 ESP-IDF 组件模板创建新组件。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>创建新的空项目</td>
            <td>询问新项目名称，选择创建项目的目录，并显示通知以打开新创建的项目。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>导入 ESP-IDF 项目</td>
            <td>导入现有的 ESP-IDF 项目，在新位置添加 .vscode 和 .devcontainer 文件，同时可以重命名项目。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>新建项目</td>
            <td>启动 UI，通过 ESP-IDF 项目创建向导，使用 ESP-IDF 中的示例模板和扩展中配置的其他框架。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>N</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>N</kbd></td>
        </tr>
        <tr>
            <td rowspan=7 align="center">烧录</td>
            <td>选择烧录方式</td>
            <td>选择用于 <strong>烧录项目</strong> 命令的烧录方法，可选择 DFU、JTAG 或 UART 接口。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>烧录项目</td>
            <td>将当前项目生成的二进制文件烧录至目标设备。此命令将根据 <strong>idf.flashType</strong> 使用 UART、DFU 或 JTAG 接口。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>F</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>F</kbd></td>
        </tr>
        <tr>
            <td>通过 DFU 接口烧录项目</td>
            <td>通过 DFU，将当前 ESP-IDF 项目的二进制文件写入 flash 芯片，此方案仅适用于 ESP32-S2 和 ESP32-S3。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>通过 UART 接口烧录项目</td>
            <td>通过 esptool.py，将当前 ESP-IDF 项目的二进制文件写入 flash 芯片。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>通过 JTAG 接口烧录项目</td>
            <td>通过 OpenOCD JTAG，将当前 ESP-IDF 项目的二进制文件写入 flash 芯片。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>加密并烧录项目</td>
            <td>执行项目烧录，同时为需要加密的分区添加 <strong>--encrypt</strong>。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>擦除设备 flash 数据</td>
            <td>执行 <strong>esptool.py erase_flash</strong> 命令，擦除 flash，将芯片重置为 0xFF 字节。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>R</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>R</kbd></td>
        </tr>
        <tr>
            <td rowspan=4 align="center">代码覆盖率</td>
            <td>添加编辑器覆盖率</td>
            <td>解析项目的 <a href="https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/app_trace.html#gcov">GCOV 代码覆盖率</a>文件，
            并在源代码文件中用彩色高亮代码覆盖行。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>配置 SDKConfig 文件以启用代码覆盖率</td>
            <td>在项目的 SDKConfig 文件中设置必要的值，启用代码覆盖率分析。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>生成 HTML 格式的代码覆盖率报告</td>
            <td>解析项目的 <a href="https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/app_trace.html#gcov">GCOV 代码覆盖率</a>文件，生成 HTML 格式的覆盖率报告。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>移除编辑器覆盖率</td>
            <td>移除因<strong>添加编辑器覆盖率</strong>命令而产生的彩色高亮代码行。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=2 align="center">可集成软件框架</td>
            <td>安装 ESP-ADF</td>
            <td>在所选目录中克隆 ESP-ADF，并配置 <strong>idf.espAdfPath</strong>（Windows 系统中为 <strong>idf.espAdfPathWin</strong>）。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>添加 Arduino ESP32 为 ESP-IDF 组件</td>
            <td>将 <a href="https://github.com/espressif/arduino-esp32">Arduino-ESP32</a>
            添加为当前目录中的 ESP-IDF 组件（<strong>${CURRENT_DIRECTORY}/components/arduino</strong>）。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=2 align="center">eFuse</td>
            <td>获取 eFuse 摘要</td>
            <td>从当前连接到串口的芯片中获取 eFuse 列表及其对应的数值，并在 <a href="https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/additionalfeatures/efuse.html">ESP Explorer EFUSEEXPLORER</a> 中显示。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>清除 eFuse 摘要</td>
            <td>从 <a href="https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/additionalfeatures/efuse.html">ESP Explorer EFUSEEXPLORER</a> 中清除 eFuse 摘要树。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=3 align="center">QEMU</td>
            <td>启动 QEMU 服务器</td>
            <td>如 <a href="https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/additionalfeatures/qemu.html">QEMU 文档</a>中所述，此命令将使用项目的 Dockerfile 和二进制文件执行 ESP32 QEMU。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>启动 QEMU 调试会话</td>
            <td>如 <a href="https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/additionalfeatures/qemu.html">QEMU 文档</a>中所述，此命令将使用项目的 Dockerfile 和二进制文件启动 ESP32 QEMU 的调试会话。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>监视 QEMU 设备</td>
            <td>如 <a href="https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/additionalfeatures/qemu.html">QEMU 文档</a>中所述，此命令将启动终端，通过使用项目的 Dockerfile 和二进制文件来监视 ESP32 QEMU。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=3 align="center">监视</td>
            <td>监视设备</td>
            <td>该命令将执行 <strong>idf.py monitor</strong>，启动计算机与乐鑫设备之间的串行通信。
            详情请参阅 <a href="https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/tools/idf-monitor.html?highlight=monitor">IDF 监视器</a>。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>M</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>M</kbd></td>
        </tr>
        <tr>
            <td>启动 IDF 监视器以支持 Core Dump 模式/GDB Stub 模式</td>
            <td>启动支持 WebSocket 的 ESP-IDF 监控器。如果紧急处理程序已经配置为 gdbstub 或核心转储，监控器将启动芯片的事后调试会话。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>监视 QEMU 设备</td>
            <td>如 <a href="https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/additionalfeatures/qemu.html">QEMU 文档</a>中所述，此命令将启动终端，通过使用项目的 Dockerfile 和二进制文件来监视 ESP32 QEMU。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=3 align="center">编辑器</td>
            <td>NVS 分区编辑器</td>
            <td>启动 UI，创建 <a href="https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-reference/storage/nvs_flash.html">ESP-IDF 非易失性存储库</a> 的 CSV 文件。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>分区表编辑器</td>
            <td>启动 UI，如 <a href="https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/partition-tables.html">ESP-IDF 分区表</a> 中所述，管理自定义分区表。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>SDK 配置编辑器</td>
            <td>启动 UI，进行 ESP-IDF 项目设置。该命令效果等同于 <strong>idf.py menuconfig</strong>。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>G</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>G</kbd></td>
        </tr>
        <tr>
            <td rowspan=3 align="center">单元测试</td>
            <td>单元测试：构建单元测试应用程序</td>
            <td>复制当前项目中的单元测试应用程序，构建当前项目。更多信息请参阅 <a href="https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/additionalfeatures/unit-testing.html">单元测试文档</a>。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>单元测试：烧录单元测试应用程序</td>
            <td>将单元测试应用程序烧录到连接的设备上。更多信息请参阅 <a href="https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/additionalfeatures/unit-testing.html">单元测试文档</a>。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>单元测试：构建并烧录单元测试应用程序</td>
            <td>复制当前项目中的单元测试应用程序，构建当前项目并将单元测试应用程序烧录到连接的设备上。更多信息请参阅 <a href="https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/additionalfeatures/unit-testing.html">单元测试文档</a>。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=12 align="center">脚本和工具</td>
            <td>运行 idf.py reconfigure 任务</td>
            <td>此命令将执行 <strong>idf.py reconfigure</strong>（CMake 配置任务），能够帮助生成 compile_commands.json 文件以支持 C/C++ 语言特性。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>擦除设备 flash 数据</td>
            <td>执行 <strong>esptool.py erase_flash</strong> 命令，擦除 flash，将芯片重置为 0xFF 字节。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>R</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>R</kbd></td>
        </tr>
        <tr>
            <td>清理当前 SDK 配置编辑器服务器进程</td>
            <td>若先前执行过 <strong>SDK 配置编辑器</strong>命令，则后台将保留缓存进程，以便下次更快打开编辑器。此命令将清理此类缓存进程。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>诊断命令</td>
            <td>诊断扩展设置及扩展日志，提供故障排除报告。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>故障排除表单</td>
            <td>启动 UI，以便用户发送故障排除报告，报告中需包含重现问题的步骤。同时系统将诊断扩展设置及扩展日志，并将信息发送到遥测后端。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>运行 ESP-IDF-SBOM 漏洞检查</td>
            <td>为使用乐鑫物联网开发框架 (ESP-IDF) 生成的应用程序创建软件包数据交换 (SPDX) 格式的软件物料清单 (SBOM) 文件。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>保存默认 SDKCONFIG 文件 (save-defconfig)</td>
            <td>使用当前项目的 sdkconfig 文件，生成 sdkconfig.defaults 文件。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>显示 Ninja 构建摘要</td>
            <td>运行 Chromium ninja-build-summary.py。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>在文档中搜索…</td>
            <td>从源代码文件中选择文本，并在 ESP-IDF 文档中进行搜索，搜索结果将显示在 VS Code ESP-IDF 资源管理器选项卡中。</td>
            <td><kbd>⌘</kbd> <kbd>I</kbd> <kbd>Q</kbd></td>
            <td><kbd>Ctrl</kbd> <kbd>E</kbd> <kbd>Q</kbd></td>
        </tr>
        <tr>
            <td>搜索错误提示</td>
            <td>输入文本，在 ESP-IDF 提示库中搜索匹配的错误。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>从 LVGL C 文件加载图像</td>
            <td>从包含 lv_image_dsc_t 结构的 LVGL C 文件中加载并显示图像。此命令允许您在不需要调试会话的情况下查看 LVGL 图像。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>打开图像查看器</td>
            <td>打开图像查看器面板，用于显示来自调试变量或 LVGL C 文件的图像。此面板提供查看和分析各种格式图像数据的工具。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td rowspan=2 align="center"> 清理</td>
            <td>清除 ESP-IDF 搜索结果</td>
            <td>清除资源管理器<strong>文档搜索结果</strong>选项卡中的所有搜索结果。</td>
            <td></td>
            <td></td>
        </tr>
        <tr>
            <td>清除已保存的 ESP-IDF 设置</td>
            <td>清除扩展中保留的现有 ESP-IDF 设置。</td>
            <td></td>
            <td></td>
        </tr>
    </tbody>
</table>

## 针对 tasks.json 和 launch.json 的命令

扩展中实现了一些实用工具命令，可以在 `tasks.json` 和 `launch.json` 文件中按照如下方式使用：

```json
"miDebuggerPath": "${command:espIdf.getToolchainGdb}"
```

- `espIdf.getExtensionPath`：获取已安装位置的绝对路径。
- `espIdf.getOpenOcdScriptValue`：返回从 ESP-IDF 工具路径、`idf.customExtraVars` 或系统 OPENOCD_SCRIPTS 环境变量中计算出的 OPENOCD_SCRIPTS 的值。
- `espIdf.getOpenOcdConfig`：以字符串形式返回 openOCD 配置文件。例如 `-f interface/ftdi/esp32_devkitj_v1.cfg -f board/esp32-wrover.cfg`。
- `espIdf.getProjectName`：从当前工作区文件夹的 `build/project_description.json` 文件中提取项目名称。
- `espIdf.getToolchainGcc`：根据 sdkconfig 或 `idf.customExtraVars`[“IDF_TARGET”] 文件中指定的 IDF_TARGET，该命令将返回相应 GCC 工具链的绝对路径。
- `espIdf.getToolchainGdb`：根据 sdkconfig 或 `idf.customExtraVars`[“IDF_TARGET”] 文件中指定的 IDF_TARGET，该命令将返回相应 GDB 工具链的绝对路径。
- `espIdf.getIDFTarget`: 根据 sdkconfig 或 `idf.customExtraVars`[“IDF_TARGET”] 该命令将返回相应 IDF_TARGET。

在[调试](https://docs.espressif.com/projects/vscode-esp-idf-extension/zh_CN/latest/debugproject.html)文档中查看示例。

## tasks.json 模板任务

使用 **ESP-IDF：新建项目** 命令创建项目时，会包含 tasks.json 模板。按 <kbd>F1</kbd> 并输入 `Tasks: Run task`，选择执行以下任一任务：

1. `Build` - 构建项目
2. `Set Target to esp32` - 选择 ESP32 为对象
3. `Set Target to esp32s2` - 选择 ESP32-S2 为对象
4. `Clean` - 清除项目
5. `Flash` - 烧录设备
6. `Monitor` - 启动监视终端
7. `OpenOCD` - 启动 OpenOCD 服务器
8. `BuildFlash` - 执行构建后烧录命令

请注意，对于 OpenOCD 任务，需要在系统环境变量中定义 `OpenOCD_SCRIPTS`，并将其设置为 OpenOCD 脚本文件夹的路径。

# 故障排除

如果遇到问题，请检查以下方面是否有错误：

> **注意：** 在您的 <project-directory>/.vscode/settings.json 中将 `idf.OpenOCDDebugLevel` 配置项设为 3 或更高值，以在 `ESP-IDF` 输出中显示 OpenOCD 服务器的调试级别日志。

> **注意：** 在您的 <project-directory>/.vscode/launch.json 中设置 `verbose: true` 以获得更详细的调试适配器输出。

1. 在 VS Code 菜单栏中选择**查看** > **输出** > **ESP-IDF**。此输出信息有助于了解扩展的运行状况。
2. 在 VS Code 菜单栏中选择**查看** > **命令面板...**，输入 `ESP-IDF：诊断命令`，该命令将生成环境配置的报告并复制到剪贴板中，报告内容可粘贴至任意位置。
3. 检查日志文件。文件路径如下所示：

- Windows: `%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION\esp_idf_vsc_ext.log`
- Linux & MacOSX: `$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/esp_idf_vsc_ext.log`

4. 在 VS Code 菜单栏中选择**帮助** > **切换开发人员工具**，Console 选项卡中会显示与扩展相关的错误信息，可自行复制。

5. 在 VS Code 菜单栏中选择**查看** > **输出** > **Extension Host**。此输出信息有助于了解扩展激活期间发生的情况。如果扩展命令都不工作，您可以分享此处的输出来查看错误堆栈。

6. VS Code 支持在不同级别配置设置：**全局（用户设置）**、**工作区** 和 **工作区文件夹**，请确保项目使用正确的设置。运行 `ESP-IDF：诊断命令` 得到的结果可能来自用户设置而非工作区文件夹设置。

    - 工作区文件夹的配置设置在 ``${workspaceFolder}/.vscode/settings.json`` 中定义
    - 工作区的配置设置在工作区的 ``<name>.code-workspace`` 文件中定义
    - 用户设置在 ``settings.json`` 中定义
        - **Windows**：``%APPDATA%\Code\User\settings.json``
        - **MacOS**：``$HOME/Library/Application Support/Code/User/settings.json``
        - **Linux**：``$HOME/.config/Code/User/settings.json``

    本扩展使用 ``idf.saveScope`` 配置设置（仅可在用户设置中定义）来指定将设置保存到何处，例如设置向导。您可以使用 ``ESP-IDF：选择配置存储位置`` 命令修改此设置。

7. 查看 [OpenOCD 故障排除 FAQ](https://github.com/espressif/OpenOCD-esp32/wiki/Troubleshooting-FAQ)，可帮助进行应用追踪及调试，并解决 `OpenOCD` 输出中显示的其他相关问题。

8. 有时 VS Code 中配置的默认 shell（Powershell、zsh、sh 等）可能会影响扩展的行为。请确保环境中未设置 MSYS/MinGW，且变量与终端行为不冲突。`ESP-IDF：诊断命令` 会显示运行构建、烧录和监视任务时扩展检测到的 shell。详情请参考[此处](https://code.visualstudio.com/docs/terminal/profiles)。

如果出现 Python 包错误，请尝试使用 **ESP-IDF：安装 ESP-IDF Python 包** 命令重新安装所需的 Python 包，或通过 **ESP-IDF：配置 ESP-IDF 扩展** 命令重新设置。

> **注意：** 在 Windows 中通过 Git 克隆 ESP-IDF 时，如果出现 "unable to create symlink" 错误，可启用`开发者模式`进行克隆，从而解决该问题。

如果有无法解决的错误，请在 [GitHub 仓库问题区](http://github.com/espressif/vscode-esp-idf-extension/issues) 搜索相似问题，也可点击[此处](https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose)提交新问题。

# 行为准则

该项目及其所有参与者都受到[行为准则](./docs/CODE_OF_CONDUCT.md)的约束。参与本项目时，应遵守此准则。若发现任何不规范行为，请报告至 [vscode@espressif.com](mailto:vscode@espressif.com)。

# 许可证

此扩展基于 Apache License 2.0 授权许可。有关附加版权声明和条款，请参见[许可证](./LICENSE)。
