.. _extension-activation:

扩展激活
========

本文档说明 ESP-IDF 扩展如何决定是否在 Visual Studio Code 中打开工作区时激活。

VS Code 扩展激活的工作原理
--------------------------

VS Code 中的扩展激活是一个 **两阶段过程**。理解这两个阶段对于避免扩展未按预期激活时的困惑至关重要。

**阶段 1：VS Code 决定是否加载扩展**

在扩展自身的代码运行之前，VS Code 本身必须决定是否加载它。此决定基于扩展 ``package.json`` 中声明的 **激活事件**。ESP-IDF 扩展注册了以下激活触发器：

- ``workspaceContains:**/CMakeLists.txt`` — 当工作区中任何位置存在 ``CMakeLists.txt`` 文件时，VS Code 会自动加载扩展。
- ``onCommand:espIdf.*`` — 当您从命令面板运行任何 ESP-IDF 命令时（例如 *ESP-IDF: Build your Project*、*ESP-IDF: Flash your Project*），VS Code 会加载扩展。
- ``onView:idfPartitionExplorer``、``onView:espRainmaker`` 等 — 当您打开扩展注册的侧边栏视图时，VS Code 会加载扩展。
- ``onLanguageModelTool:espIdfCommands`` — 当语言模型集成（例如 Copilot）调用 ESP-IDF 命令工具时，VS Code 会加载扩展。
- ``contributes.mcpServerDefinitionProviders`` (``espIdf.mcpServers``) — 当聊天发现 MCP 服务器时，VS Code 可以加载扩展。此时会注册乐鑫文档和 ESP 组件注册表服务器，除非 ``idf.extensionActivationMode`` 为 ``never``。

如果 **没有任何** 激活事件触发，VS Code 将永远不会加载扩展，其 ``activate()`` 函数也永远不会运行。这意味着：

.. important::

   ``idf.extensionActivationMode`` 设置 **只有在 VS Code 先加载扩展之后才会生效**。如果上述激活事件均未触发（工作区中无 ``CMakeLists.txt``、未运行 ESP-IDF 命令、未打开侧边栏视图、未调用语言模型工具、未发现 MCP 服务器），则扩展不会激活 — 即使 ``idf.extensionActivationMode`` 设置为 ``"always"`` 也是如此。扩展加载后，若未打开工作区文件夹，或 ``idf.currentSetup`` 已指向一个已完成的 ESP-IDF 安装，则同样不会使用该设置。

**阶段 2：扩展决定是否完全初始化**

一旦 VS Code 加载了扩展（阶段 1），扩展的 ``activate()`` 函数就会运行。它会在注册项目命令之前验证 ESP-IDF 安装管理器目录和当前所选配置。仅当工作区文件夹已打开且 ``idf.currentSetup`` 为空时，才会使用 ``idf.extensionActivationMode``。

.. list-table:: 两阶段总结
   :header-rows: 1

   * - 阶段
     - 控制方
     - 发生的事情
   * - **阶段 1** — 加载
     - VS Code 平台（``package.json`` 中的 ``activationEvents``）
     - VS Code 决定是否加载并启动扩展的代码
   * - **阶段 2** — 初始化
     - 扩展代码（``eim_idf.json``、``idf.currentSetup``，以及该配置为空时的 ``idf.extensionActivationMode``）
     - 扩展进入未配置模式、无工作区文件夹的已配置模式，或完整已配置模式

安装验证（阶段 2）
------------------

扩展加载后，会在注册项目命令之前检查 ESP-IDF 安装管理器目录。不需要工作区文件夹的命令（包括安装管理器、欢迎页和新项目向导）无论结果如何都会注册。

1. **必须存在 ``eim_idf.json``**

   当 ``idf.eimIdfJsonPath`` 指向的文件存在时，扩展使用该文件。若该设置为空，或它指向一个不存在的文件而平台默认文件存在，则清空该设置并使用默认文件（Windows 上为 ``C:\\Espressif\\tools\\eim_idf.json``，其他平台为 ``~/.espressif/tools/eim_idf.json``）。若两者都不存在，状态栏显示 ``eim_idf.json not found``。点击后运行 **ESP-IDF: 选择 eim_idf.json**。

2. **至少有一个已完成的 ESP-IDF 配置**

   ``eim_idf.json`` 必须包含状态为 ``finished`` 的安装。低于 3.0 的目录，以及没有 status 的条目，视为已完成。若没有符合条件的安装，状态栏显示 ``No valid ESP-IDF setup found``。点击后打开 ESP-IDF 安装管理器。安装完成后，运行 **ESP-IDF: 重试 ESP-IDF 激活**。

3. **先检查工作区文件夹，再检查 ``idf.currentSetup``**

   若未打开工作区文件夹，验证在此停止。扩展停留在无工作区文件夹的已配置模式，不会读取或写入 ``idf.currentSetup``。打开文件夹后会再次运行验证。

   若已打开文件夹，所用文件夹是扩展已存储的工作区选择；若尚未存储，则使用第一个工作区文件夹。

   - 若 ``idf.currentSetup`` 路径匹配一个已完成的安装，则进入完整已配置模式。
   - 若路径不在 ``eim_idf.json`` 中，或状态不是已完成，状态栏显示 ``Invalid ESP-IDF Setup``。点击状态栏会运行 **ESP-IDF: 选择当前 ESP-IDF 版本**。
   - 若 ``idf.currentSetup`` 为空，则运行下面的 ``idf.extensionActivationMode`` 检查。检查允许激活时，第一个已完成的安装会保存为 ``idf.currentSetup``，并进入完整已配置模式。检查拒绝时，不注册项目命令，也不显示未配置状态栏。

**ESP-IDF: 重试 ESP-IDF 激活** 会再次运行这些检查。在扩展尚未进入完整已配置模式时，若 ``idf.eimIdfJsonPath``、``idf.currentSetup`` 或 ``idf.extensionActivationMode`` 发生变化，或添加了工作区文件夹，也会再次运行。扩展进入完整已配置模式后，``eim_idf.json`` 文件本身的变化由 `监视 eim_idf.json`_ 中描述的监视器处理。

ESP-IDF 命令视图
------------

ESP-IDF 命令视图在扩展加载时创建，并在激活模式变化时刷新。

在进入完整已配置模式之前，该视图是一个扁平列表。它没有 Advanced 类别，也没有状态栏复选框。列表为：

- **ESP-IDF: 打开 ESP-IDF 安装管理器**
- **ESP-IDF: 新建项目**
- **ESP-IDF: 创建新的空项目**
- **ESP-IDF: 诊断命令**
- **ESP-IDF: 欢迎**
- **ESP-IDF: 打开入门演练**
- **ESP-IDF: 重试 ESP-IDF 激活**

在未配置模式，以及激活被跳过时，若已打开工作区文件夹，列表还会包含 **ESP-IDF: 选择当前 ESP-IDF 版本**。

完整已配置模式显示项目命令列表以及带复选框的 Advanced 类别。

当目录变化导致离开已配置模式时，视图切换为较短的列表。已经注册的项目命令仍可从命令面板使用。之后一次成功的重试会恢复完整列表。

监视 eim_idf.json
---------------

首次验证之后，扩展会监视解析得到的目录文件。当 ``idf.eimIdfJsonPath`` 指向的文件存在时，监视该文件。否则，在 Windows 上监视 ``C:\\Espressif\\tools\\eim_idf.json``，在其他平台上监视 ``~/.espressif/tools/eim_idf.json``。该文件位于工作区之外。同一次编辑产生的创建、更改和删除事件只处理一次。激活正在运行时，这些事件会被忽略。

- **未配置和已跳过**：运行 **ESP-IDF: 重试 ESP-IDF 激活**。
- **已配置**：当 ``idf.currentSetup`` 仍匹配一个已完成的安装时，保持已配置。若文件缺失、无法读取，或该配置已不存在或未完成，则显示现有状态栏（``Invalid ESP-IDF Setup``，或在实际失败为目录缺失或没有已完成配置时显示 ``eim_idf.json not found`` / ``No valid ESP-IDF setup found``），并将命令视图切换为较短列表。已经注册的项目命令保持注册。
- **无工作区文件夹**：当至少还有一个已完成的安装时，保持该模式。否则，为缺失的目录（``eim_idf.json not found``）或没有已完成的配置（``No valid ESP-IDF setup found``）显示未配置状态栏。

更改 ``idf.eimIdfJsonPath`` 会重新定位监视器。指向不存在文件的自定义路径会被清空；默认文件存在时则监视默认文件。若监视器已经位于该默认路径，则保持不变。若两个文件都不存在，则停止监视。监视路径变化后，会立即执行相同的反应。

激活模式优先级层次（阶段 2）
----------------------------

仅当工作区文件夹已打开且 ``idf.currentSetup`` 为空时，才会运行 ``idf.extensionActivationMode``。允许激活的结果会保存第一个已完成的 ESP-IDF 安装并注册项目命令。拒绝的结果则不会。该检查遵循以下优先级：

1. **工作区/全局设置 = "always"**

   - **操作**: 保存第一个已完成的 ESP-IDF 安装并完全初始化
   - **跳过**: CMake 检测和“仍然激活”提示
   - **用例**: 为自定义项目布局强制启用扩展
   - **设置位置**: 用户设置或工作区设置

2. **工作区/全局设置 = "never"**

   - **操作**: 不保存 ``idf.currentSetup``，也不注册项目命令
   - **覆盖**: 所有文件夹级设置
   - **不显示提示**: 尊重您的显式选择
   - **用例**: 在特定工作区中显式禁用扩展
   - 当 VS Code 通过 MCP 发现在未打开工作区的情况下加载扩展时，此规则仍然适用；此时也不会注册 MCP 服务器。当模式为 ``"never"`` 或扩展停用时，这些服务器会被撤回；它们不是用户 ``mcp.json`` 中的条目。

3. **任意文件夹设置 = "always"**

   - **操作**: 保存第一个已完成的 ESP-IDF 安装并完全初始化（"true 优先"策略）
   - **顺序独立**: 检查所有文件夹，而不仅仅是第一个
   - **用例**: 至少包含一个 ESP-IDF 项目的多根工作区
   - **设置位置**: ``.vscode/settings.json`` 中的文件夹设置

4. **所有文件夹设置 = "never"**

   - **操作**: 不保存 ``idf.currentSetup``，也不注册项目命令
   - **不显示提示**: 尊重显式配置
   - **用例**: 显式排除 ESP-IDF 的多根工作区

5. **否则** （默认行为 — CMake 检测）

   - **条件**: 无工作区/全局强制覆盖（即 ``"detect"``），无文件夹设为 ``"always"``，且并非所有文件夹均设为 ``"never"`` — 包括部分 ``"detect"`` 与部分 ``"never"`` 的混合状态
   - **操作**: 回退到自动 CMakeLists.txt 内容检测
   - **检测**: 搜索 ``include($ENV{IDF_PATH}/tools/cmake/project.cmake)``
   - **如果未找到**: 提示"仍然激活"对话框
   - **用例**: 标准 ESP-IDF 项目（向后兼容）

配置设置
--------

当工作区文件夹已打开且 ``idf.currentSetup`` 为空时使用的设置是：

.. code-block:: json

   {
     "idf.extensionActivationMode": "detect"
   }

**可选值:**

- ``"detect"`` （默认） — 通过检查 ``CMakeLists.txt`` 内容自动检测。
- ``"always"`` — 跳过 CMake 检测，保存第一个已完成的 ESP-IDF 安装，并注册项目命令。
- ``"never"`` — 不保存空的 ``idf.currentSetup``，也不注册项目命令，即使检测到 ESP-IDF 项目。

**设置范围:**

- **用户（全局）**:

  - Linux: ``~/.config/Code/User/settings.json``
  - macOS: ``~/Library/Application Support/Code/User/settings.json``
  - Windows: ``%APPDATA%\Code\User\settings.json``

- **工作区**: 工作区根目录中的 ``.vscode/settings.json``
- **文件夹**: 特定文件夹中的 ``.vscode/settings.json`` （多根工作区）

使用示例
--------

为自定义项目强制启用
~~~~~~~~~~~~~~~~~~~~

如果您有不使用标准 ESP-IDF ``project.cmake`` 包含的自定义 CMake 设置：

**工作区设置** (``.vscode/settings.json``):

.. code-block:: json

   {
     "idf.extensionActivationMode": "always"
   }

这将初始化扩展，无论您的 CMakeLists.txt 内容如何。

.. note::

   这仅在至少一个阶段 1 激活事件触发时才有效 — 例如工作区中存在 ``CMakeLists.txt`` 文件、您从命令面板运行了 ESP-IDF 命令或打开了 ESP-IDF 侧边栏视图。

在特定工作区中禁用扩展
~~~~~~~~~~~~~~~~~~~~~~

如果您想防止扩展在非 ESP-IDF 工作区中初始化：

**工作区设置** (``.vscode/settings.json``):

.. code-block:: json

   {
     "idf.extensionActivationMode": "never"
   }

扩展将不会初始化，也不会显示提示。

包含混合项目的多根工作区
~~~~~~~~~~~~~~~~~~~~~~~~

对于同时包含 ESP-IDF 和非 ESP-IDF 项目的工作区：

**工作区文件** (``my-workspace.code-workspace``):

.. code-block:: json

   {
     "folders": [
       { "path": "esp32-firmware" },
       { "path": "documentation" },
       { "path": "web-interface" }
     ]
   }

**文件夹级设置** （每个文件夹的 ``.vscode/settings.json``）:

``esp32-firmware/.vscode/settings.json``:

.. code-block:: json

   {
     "idf.extensionActivationMode": "always"
   }

``documentation/.vscode/settings.json``:

.. code-block:: json

   {
     "idf.extensionActivationMode": "never"
   }

在此示例中，扩展将初始化，因为 ``esp32-firmware`` 文件夹设置为 ``"always"`` （优先级 #3："true 优先"）。

标准 ESP-IDF 项目（无需配置）
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

对于具有典型 CMakeLists.txt 结构的标准 ESP-IDF 项目：

**CMakeLists.txt** （项目根目录）:

.. code-block:: cmake

   cmake_minimum_required(VERSION 3.16)
   include($ENV{IDF_PATH}/tools/cmake/project.cmake)
   project(my-project)

无需设置 — VS Code 会自动加载扩展，因为 ``CMakeLists.txt`` 存在（阶段 1），扩展会检测到 ESP-IDF 项目包含（阶段 2，优先级 #5）。

没有 CMakeLists.txt 的工作区
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

如果您的工作区 **不** 包含任何 ``CMakeLists.txt`` 文件（例如，一个纯文档工作区，您希望在其中使用 ESP-IDF 工具）：

1. 仅设置 ``"idf.extensionActivationMode": "always"`` 是 **不够的** — VS Code 不会加载扩展，因为没有激活事件触发。
2. 要激活扩展，请从命令面板手动运行任何 ESP-IDF 命令（``Ctrl+Shift+P`` → 输入 ``ESP-IDF``）。这通过 ``onCommand`` 激活事件触发阶段 1 加载，``"always"`` 设置确保阶段 2 初始化继续进行。

常见激活问题
------------

扩展未激活
~~~~~~~~~~

**症状**: ESP-IDF 命令不可用，没有扩展功能工作。

**可能原因**:

1. **没有激活触发器** （阶段 1）：没有任何已声明的激活事件触发 — 工作区不包含 ``CMakeLists.txt`` 文件、未运行过 ESP-IDF 命令、未打开侧边栏视图等。

   **解决方案**: 从命令面板运行任何 ESP-IDF 命令以触发加载，或创建一个 ``CMakeLists.txt`` 文件。如果您希望将来自动激活，请设置 ``"idf.extensionActivationMode": "always"``，这样一旦加载，它将始终初始化。

2. **显式 "never" 设置** （阶段 2）：工作区文件夹已打开，``idf.currentSetup`` 为空，且 ``idf.extensionActivationMode`` 为 ``"never"``。此时不会注册项目命令。若 ``idf.currentSetup`` 已指向一个已完成的安装，则不会查阅该设置。

   **解决方案**: 将其设置为 ``"always"`` 或 ``"detect"``，或在更改设置后运行 **ESP-IDF: 重试 ESP-IDF 激活**。也可以选择一个 ESP-IDF 版本，使 ``idf.currentSetup`` 不再为空。

3. **非标准 CMakeLists.txt** （阶段 2）：您的项目有 ``CMakeLists.txt``，但不包含标准 ESP-IDF ``project.cmake`` 行。

   **解决方案**: 在工作区设置中添加 ``"idf.extensionActivationMode": "always"``。

4. **提示被关闭** （阶段 2）：您关闭了"仍然激活"对话框。

   **解决方案**: 重新加载窗口（``Ctrl+Shift+P`` → "开发人员: 重新加载窗口"）并在提示时选择"仍然激活"。

扩展在错误的工作区中激活
~~~~~~~~~~~~~~~~~~~~~~~~

**症状**: ESP-IDF 扩展在非 ESP-IDF 项目中激活。

**原因**: 工作区包含 ``CMakeLists.txt`` 文件（可能用于非 ESP-IDF 的 C/C++ 项目），这触发了阶段 1 加载。然后扩展要么检测到 ESP-IDF 包含，要么提示用户。

**解决方案**: 在工作区设置中添加 ``"idf.extensionActivationMode": "never"`` 以显式禁用阶段 2 初始化。

多根工作区问题
~~~~~~~~~~~~~~

**症状**: 即使一个文件夹是 ESP-IDF 项目，扩展也未激活。

**可能原因**: 工作区级 ``"never"`` 设置正在覆盖文件夹设置。

**解决方案**: 删除工作区级 ``idf.extensionActivationMode`` 设置，改用文件夹级设置。

技术细节
--------

阶段 1：激活事件
~~~~~~~~~~~~~~~~~

扩展的 ``package.json`` 声明了以下激活事件：

- **workspaceContains:\*\*/CMakeLists.txt**: 当工作区中任何文件夹在任意深度包含 ``CMakeLists.txt`` 文件时触发。这是最常见的自动触发器。
- **onCommand:espIdf.\***: 每个 ESP-IDF 命令都注册为激活触发器。从命令面板运行任何命令将加载扩展。
- **onView:\***: 打开 ESP-IDF 侧边栏面板（应用追踪器、分区浏览器、Rainmaker、组件）会触发加载。
- **onLanguageModelTool:espIdfCommands**: 当语言模型集成（例如 Copilot）调用 ESP-IDF 命令工具时触发，支持 AI 辅助工作流。

这些事件由 `VS Code 扩展 API <https://code.visualstudio.com/api/references/activation-events>`_ 定义，无法通过用户设置更改。阻止阶段 1 加载的唯一方法是在 VS Code 的扩展视图中完全禁用扩展。

扩展还声明了 ``contributes.mcpServerDefinitionProviders``（``espIdf.mcpServers``）。这是贡献点，而不是 ``activationEvents`` 条目。当聊天发现所贡献的 MCP 服务器时，VS Code 仍可以加载扩展。当 ``idf.extensionActivationMode`` 为 ``"never"`` 或扩展停用时，这些服务器会被撤回；它们不会写入用户 ``mcp.json`` 文件。

为什么使用"True 优先"策略？
~~~~~~~~~~~~~~~~~~~~~~~~~~~

在多根工作区中，如果任何文件夹需要 ESP-IDF 扩展，则扩展必须全局激活（VS Code 扩展按工作区激活，而不是按文件夹）。"true 优先"策略确保：

- 一个 ESP-IDF 项目文件夹可以为所有文件夹激活扩展
- 文档或实用程序文件夹可以共存而不会阻止激活
- 混合项目工作区中的更好用户体验

向后兼容性
~~~~~~~~~~

激活系统保持完全向后兼容性：

- 没有设置的项目使用原始 CMakeLists.txt 检测
- "仍然激活"提示仍会出现在非标准项目中
- 标准 ESP-IDF 项目无需任何配置更改即可工作

性能优化
~~~~~~~~

阶段 2 逻辑设计为最佳性能：

1. **全局 Never 时提前退出**: 如果工作区/全局设置为 ``"never"``，项目检查会立即返回，而不检查文件夹或读取文件。仅当工作区文件夹已打开且 ``idf.currentSetup`` 为空时才会运行此检查。
2. **任何 Always 时提前退出**: 当任何文件夹为 ``"always"`` 时，扩展停止检查剩余文件夹。
3. **跳过 CMake 检测**: 如果找到任何显式 ``"always"``，则完全跳过 CMake 文件检测。
4. **延迟文件读取**: 仅在进入检测回退阶段时（无显式 ``"always"`` 或全部 ``"never"`` 覆盖）读取 CMakeLists.txt 文件。

另请参阅
--------

- :ref:`故障排除 <troubleshooting-section>`
- :ref:`设置 <settings>`
- :ref:`常见问题 <faqs-section>`
- `VS Code 激活事件文档 <https://code.visualstudio.com/api/references/activation-events>`_
- `GitHub Issue #1756 <https://github.com/espressif/vscode-esp-idf-extension/issues/1756>`_
