发布说明
========

本文件记录 "Espressif IDF" 扩展的所有重要变更。

2.0.2
-----

`v2.0.2 <https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v2.0.2>`_

功能与增强
~~~~~~~~~~

- `新建项目向导中先显示模板再配置 <https://github.com/espressif/vscode-esp-idf-extension/pull/1757>`_
- `调试图像查看器及从文件查看 C 图像数组 <https://github.com/espressif/vscode-esp-idf-extension/pull/1644>`_ — 只要提供图像 C UInt8Array 及尺寸长度，即可为 OpenCV、LVGL 及任意自定义数据类型进行配置。
- `移除旧版调试适配器、ESP-MDF、ESP-Matter 和 ESP-HomeKit <https://github.com/espressif/vscode-esp-idf-extension/pull/1693>`_。其中多数框架已在 ESP 组件注册表中提供。我们保留 ESP-ADF。

Bug 修复
~~~~~~~~

- `按降序显示 ESP-IDF 版本 <https://github.com/espressif/vscode-esp-idf-extension/pull/1704>`_

1.11.1
------

`v1.11.1 <https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.11.1>`_

Bug 修复
~~~~~~~~

- `仅对 Copilot Chat 使用输出捕获执行 <https://github.com/espressif/vscode-esp-idf-extension/pull/1740>`_
- `修复 v1.11.0 中构建后始终挂起的问题 <https://github.com/espressif/vscode-esp-idf-extension/pull/1733>`_
- `激活时移除对 clang 检查的 await <https://github.com/espressif/vscode-esp-idf-extension/pull/1745>`_
- `防止失去焦点时关闭“设置目标” <https://github.com/espressif/vscode-esp-idf-extension/pull/1748>`_
- `监听重启事件请求以修复调试重启按钮 <https://github.com/espressif/vscode-esp-idf-extension/pull/1747>`_
- `修复 IDF Size 任务中获取项目名称 <https://github.com/espressif/vscode-esp-idf-extension/pull/1741>`_
- `为 menuconfig 根节点添加视觉分隔符 <https://github.com/espressif/vscode-esp-idf-extension/pull/1752>`_

1.11.0
------

`v1.11.0 <https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.11.0>`_

功能与增强
~~~~~~~~~~

- `添加 DevKits 支持 <https://github.com/espressif/vscode-esp-idf-extension/pull/1557>`_
- `创建项目时添加 gitignore <https://github.com/espressif/vscode-esp-idf-extension/pull/1578>`_
- `预发布分支文档 <https://github.com/espressif/vscode-esp-idf-extension/pull/1599>`_
- `按文件类型修改事件激活 <https://github.com/espressif/vscode-esp-idf-extension/pull/1568>`_
- `在编辑器面板中添加经典 menuconfig <https://github.com/espressif/vscode-esp-idf-extension/pull/1598>`_
- `将 webview 更新为 VS Code UI 风格 <https://github.com/espressif/vscode-esp-idf-extension/pull/1554>`_ — 以“ESP-IDF: 新建项目”替代“ESP-IDF: 显示示例”命令，以提供更好的定制。
- `允许自定义 Pytest 通配符与单元测试服务 <https://github.com/espressif/vscode-esp-idf-extension/pull/1593>`_
- `未安装时提示安装 CLang <https://github.com/espressif/vscode-esp-idf-extension/pull/1615>`_
- `允许为“完全清理”命令指定额外文件与目录 <https://github.com/espressif/vscode-esp-idf-extension/pull/1613>`_
- `将 JTAG 烧录参数扩展为配置项 <https://github.com/espressif/vscode-esp-idf-extension/pull/1583>`_
- `设置向导中下载支持范围 <https://github.com/espressif/vscode-esp-idf-extension/pull/1625>`_
- `在启动调试前检查 OpenOCD 是否运行 <https://github.com/espressif/vscode-esp-idf-extension/pull/1638>`_
- `在反汇编视图中添加函数名 <https://github.com/espressif/vscode-esp-idf-extension/pull/1634>`_
- `在提示查看器中显示 OpenOCD 提示 <https://github.com/espressif/vscode-esp-idf-extension/pull/1476>`_
- `添加默认串口检测选项并使用 esptool.py 查找串口 <https://github.com/espressif/vscode-esp-idf-extension/pull/1632>`_
- `预发布活动通知 <https://github.com/espressif/vscode-esp-idf-extension/pull/1643>`_
- `优先使用 gdbinit prefix_map，并回退到 prefix_map_gdbinit <https://github.com/espressif/vscode-esp-idf-extension/pull/1660>`_
- `通过 Language Tool API 与 Copilot Chat 的 AI 集成 <https://github.com/espressif/vscode-esp-idf-extension/pull/1621>`_
- `在设置向导中允许自定义 PyPi 索引 URL <https://github.com/espressif/vscode-esp-idf-extension/pull/1692>`_
- `添加创建空项目命令 <https://github.com/espressif/vscode-esp-idf-extension/pull/1698>`_
- `添加 Unity 运行器与解析器，移除 Pytest <https://github.com/espressif/vscode-esp-idf-extension/pull/1681>`_

Bug 修复
~~~~~~~~

- `更新反汇编截图 <https://github.com/espressif/vscode-esp-idf-extension/pull/1588>`_
- `JTAG 缩写问题 <https://github.com/espressif/vscode-esp-idf-extension/pull/1604>`_
- `修复多项目配置中的 IDF_TARGET <https://github.com/espressif/vscode-esp-idf-extension/pull/1579>`_
- `修复加密烧录中的部分加密 <https://github.com/espressif/vscode-esp-idf-extension/pull/1373>`_
- `JTAG 烧录结束后关闭 OpenOCD <https://github.com/espressif/vscode-esp-idf-extension/pull/1601>`_
- `CI 中使用 NodeJS 20 <https://github.com/espressif/vscode-esp-idf-extension/pull/1611>`_
- `更新构建消息 <https://github.com/espressif/vscode-esp-idf-extension/pull/1603>`_
- `将 git 和 pigweed 追加到 PATH 而非前置 <https://github.com/espressif/vscode-esp-idf-extension/pull/1614>`_
- `文档中使用 master 最新版 <https://github.com/espressif/vscode-esp-idf-extension/pull/1636>`_
- `修复设置面板中的 fileExists 检查 <https://github.com/espressif/vscode-esp-idf-extension/pull/1609>`_ 感谢 @jonsambro
- `调试中符号加载使用 mon program_esp 替代 load <https://github.com/espressif/vscode-esp-idf-extension/pull/1556>`_ 感谢 @wormyrocks
- `将状态栏项移至左侧 <https://github.com/espressif/vscode-esp-idf-extension/pull/1626>`_
- `修复设置目标预览目标 <https://github.com/espressif/vscode-esp-idf-extension/pull/1652>`_
- `修复应用跟踪与堆跟踪 <https://github.com/espressif/vscode-esp-idf-extension/pull/1656>`_
- `修复设置向导中 idf.py 未找到的误导提示 <https://github.com/espressif/vscode-esp-idf-extension/pull/1642>`_
- `Clang 与 OpenOCD 的 PATH 校验 <https://github.com/espressif/vscode-esp-idf-extension/pull/1666>`_
- `遥测问题修复 <https://github.com/espressif/vscode-esp-idf-extension/pull/1675>`_
- `修复 addOpenOCDRules 中的 openOCDRulesPath <https://github.com/espressif/vscode-esp-idf-extension/pull/1685>`_
- `在 pytest 安装步骤中添加约束 <https://github.com/espressif/vscode-esp-idf-extension/pull/1686>`_
- `为 gdbinit 文件路径添加双引号 <https://github.com/espressif/vscode-esp-idf-extension/pull/1684>`_

1.10.1
------

`v1.10.1 <https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.10.1>`_

功能与增强
~~~~~~~~~~

- `悬停时计算变量、以十六进制查看变量、设置数据断点 <https://github.com/espressif/vscode-esp-idf-extension/pull/1521>`_
- `Clang 项目设置配置 <https://github.com/espressif/vscode-esp-idf-extension/pull/1489>`_
- `在选择列表中显示当前活动的 openOCD 板 <https://github.com/espressif/vscode-esp-idf-extension/pull/1527>`_
- `添加 ESP-IDF VS Code 配置文件模板 <https://github.com/espressif/vscode-esp-idf-extension/pull/1499>`_

Bug 修复
~~~~~~~~

- `修复无工作区 fsPath 的启动错误 <https://github.com/espressif/vscode-esp-idf-extension/pull/1538>`_
- `反汇编视图 DAP 请求更新 <https://github.com/espressif/vscode-esp-idf-extension/pull/1518>`_
- `右键状态栏项名称 <https://github.com/espressif/vscode-esp-idf-extension/pull/1515>`_
- `在 doctor 命令日志中用用户 HOME 或 USERPROFILE 替换 HOMEPATH <https://github.com/espressif/vscode-esp-idf-extension/pull/1517>`_
- `烧写 eFuse 前增加用户确认 <https://github.com/espressif/vscode-esp-idf-extension/pull/1540>`_
- `将当前配置加入 ESP-IDF 配置列表 <https://github.com/espressif/vscode-esp-idf-extension/pull/1513>`_
- `修复项目配置状态中的 OpenOCD 参数 <https://github.com/espressif/vscode-esp-idf-extension/pull/1551>`_
- `在 IDF 终端中执行 export 脚本，允许自定义终端可执行文件 <https://github.com/espressif/vscode-esp-idf-extension/pull/1558>`_
- `在 readme 中添加 eFuse 文档 <https://github.com/espressif/vscode-esp-idf-extension/pull/1545>`_
- `移除 which 与 where 依赖，在 PATH 列表中浏览二进制 <https://github.com/espressif/vscode-esp-idf-extension/pull/1565>`_
- `修复克隆开发分支 <https://github.com/espressif/vscode-esp-idf-extension/pull/1584>`_
- `添加 Windows ARM serialport 二进制 <https://github.com/espressif/vscode-esp-idf-extension/pull/1585>`_
- `添加 idf-python 与 idf-git 的 GitHub 镜像 <https://github.com/espressif/vscode-esp-idf-extension/pull/1586>`_
- `修复 sysview gdbinit 命令 <https://github.com/espressif/vscode-esp-idf-extension/pull/1580>`_
- `修复 launch.json 中调试适配器 debugPort 的更新 <https://github.com/espressif/vscode-esp-idf-extension/pull/1587>`_

1.10.0
------

`v1.10.0 <https://github.com/espressif/vscode-esp-idf-extension/releases/tag/v1.10.0>`_

功能与增强
~~~~~~~~~~

- `添加删除 esp-idf 特定设置的命令 <https://github.com/espressif/vscode-esp-idf-extension/pull/1353>`_
- `添加 idf.monitorPort 设置 <https://github.com/espressif/vscode-esp-idf-extension/pull/1429>`_
- `添加 idf.jtagFlashCommandExtraArgs <https://github.com/espressif/vscode-esp-idf-extension/pull/1450>`_
- `调试与监视使用 idf qemu 和 idf.qemuExtraArgs <https://github.com/espressif/vscode-esp-idf-extension/pull/1462>`_
- `应用、引导加载程序、分区表构建烧录命令，从设备读取分区，按分区烧录 <https://github.com/espressif/vscode-esp-idf-extension/pull/1436>`_

Bug 修复
~~~~~~~~

- `俄语翻译拼写修正 <https://github.com/espressif/vscode-esp-idf-extension/pull/1409>`_ 感谢 @SinglWolf
- `修复 esp_idf.json 配置未被识别 <https://github.com/espressif/vscode-esp-idf-extension/pull/1451>`_
- `IDF 终端中 export 脚本的引号 <https://github.com/espressif/vscode-esp-idf-extension/pull/1428>`_
- `修复多配置项目中的 preFlashTask <https://github.com/espressif/vscode-esp-idf-extension/pull/1441>`_
- `添加 Web 扩展调试及其他文档 <https://github.com/espressif/vscode-esp-idf-extension/pull/1453>`_
- `修复 openOCD 参数顺序 <https://github.com/espressif/vscode-esp-idf-extension/pull/1482>`_
- `修复项目配置文档 <https://github.com/espressif/vscode-esp-idf-extension/pull/1480>`_
- `修复从组件注册表创建示例项目 <https://github.com/espressif/vscode-esp-idf-extension/pull/1485>`_
- `使用 remoteName 检测 Codespaces 环境 <https://github.com/espressif/vscode-esp-idf-extension/pull/1483>`_
- `创建的 json 文件使用 2 空格缩进 <https://github.com/espressif/vscode-esp-idf-extension/pull/1510>`_
- `确保构建目录存在，在项目配置编辑器中解析 workspaceFolder 路径 <https://github.com/espressif/vscode-esp-idf-extension/pull/1417>`_
- `修复构建、烧录、监视时释放串口 <https://github.com/espressif/vscode-esp-idf-extension/pull/1502>`_
- `在项目配置编辑器与新建项目向导中合并环境变量并添加 IDF_TARGET <https://github.com/espressif/vscode-esp-idf-extension/pull/1498>`_

更早版本
--------

**1.9.1** 至 **0.1.0** 的发布说明请参见 `GitHub 上的 CHANGELOG <https://github.com/espressif/vscode-esp-idf-extension/blob/master/CHANGELOG.md>`_。
