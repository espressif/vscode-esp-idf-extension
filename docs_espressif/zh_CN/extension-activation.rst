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

如果 **没有任何** 触发器触发，VS Code 将永远不会加载扩展，其 ``activate()`` 函数也永远不会运行。这意味着：

.. important::

   ``idf.extensionActivationMode`` 设置 **只有在 VS Code 先加载扩展之后才会生效**。如果您的工作区不包含任何 ``CMakeLists.txt`` 文件且您未运行过 ESP-IDF 命令，则扩展不会激活 — 即使 ``idf.extensionActivationMode`` 设置为 ``"always"`` 也是如此。

**阶段 2：扩展决定是否完全初始化**

一旦 VS Code 加载了扩展（阶段 1），扩展的 ``activate()`` 函数就会运行。此时，扩展会读取 ``idf.extensionActivationMode`` 设置，并应用下一节中描述的优先级层次来决定是继续完全初始化还是提前退出。

.. list-table:: 两阶段总结
   :header-rows: 1

   * - 阶段
     - 控制方
     - 发生的事情
   * - **阶段 1** — 加载
     - VS Code 平台（``package.json`` 中的 ``activationEvents``）
     - VS Code 决定是否加载并启动扩展的代码
   * - **阶段 2** — 初始化
     - 扩展代码（``idf.extensionActivationMode`` 设置）
     - 扩展决定是否完全初始化或提前退出

激活模式优先级层次（阶段 2）
----------------------------

一旦 VS Code 加载了扩展，它将遵循严格的优先级层次来决定是否完全初始化：

1. **工作区/全局设置 = "always"**

   - **操作**: 立即初始化
   - **跳过**: 所有其他检查（CMake 检测、文件夹检查）
   - **用例**: 为自定义项目布局强制启用扩展
   - **设置位置**: 用户设置或工作区设置

2. **工作区/全局设置 = "never"**

   - **操作**: 不初始化，立即退出
   - **覆盖**: 所有文件夹级设置
   - **不显示提示**: 尊重您的显式选择
   - **用例**: 在特定工作区中显式禁用扩展

3. **任意文件夹设置 = "always"**

   - **操作**: 立即初始化（"true 优先"策略）
   - **顺序独立**: 检查所有文件夹，而不仅仅是第一个
   - **用例**: 至少包含一个 ESP-IDF 项目的多根工作区
   - **设置位置**: ``.vscode/settings.json`` 中的文件夹设置

4. **所有文件夹设置 = "never"**

   - **操作**: 不初始化，立即退出
   - **不显示提示**: 尊重显式配置
   - **用例**: 显式排除 ESP-IDF 的多根工作区

5. **所有设置 = "detect"** （默认行为）

   - **操作**: 回退到自动 CMakeLists.txt 内容检测
   - **检测**: 搜索 ``include($ENV{IDF_PATH}/tools/cmake/project.cmake)``
   - **如果未找到**: 提示"仍然激活"对话框
   - **用例**: 标准 ESP-IDF 项目（向后兼容）

配置设置
--------

控制扩展初始化（阶段 2）的设置是：

.. code-block:: json

   {
     "idf.extensionActivationMode": "detect"
   }

**可选值:**

- ``"detect"`` （默认） — 通过检查 ``CMakeLists.txt`` 内容自动检测。
- ``"always"`` — 跳过检测，立即初始化。
- ``"never"`` — 即使检测到 ESP-IDF 项目也不初始化。

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

   这仅在您的工作区至少包含一个 ``CMakeLists.txt`` 文件（触发阶段 1 加载）或您先从命令面板运行了 ESP-IDF 命令时才有效。

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

1. 仅设置 ``"idf.extensionActivationMode": "always"`` 是 **不够的** — VS Code 不会加载扩展，因为没有激活触发器触发。
2. 要激活扩展，请从命令面板手动运行任何 ESP-IDF 命令（``Ctrl+Shift+P`` → 输入 ``ESP-IDF``）。这通过 ``onCommand`` 激活事件触发阶段 1 加载，``"always"`` 设置确保阶段 2 初始化继续进行。

常见激活问题
------------

扩展未激活
~~~~~~~~~~

**症状**: ESP-IDF 命令不可用，没有扩展功能工作。

**可能原因**:

1. **没有激活触发器** （阶段 1）：工作区不包含 ``CMakeLists.txt`` 文件，也未运行过 ESP-IDF 命令。

   **解决方案**: 从命令面板运行任何 ESP-IDF 命令以触发加载，或创建一个 ``CMakeLists.txt`` 文件。如果您希望将来自动激活，请设置 ``"idf.extensionActivationMode": "always"``，这样一旦加载，它将始终初始化。

2. **显式 "never" 设置** （阶段 2）：扩展已加载，但 ``idf.extensionActivationMode`` 在用户、工作区或文件夹设置中被设置为 ``"never"``。

   **解决方案**: 将其设置为 ``"always"`` 或 ``"detect"``。

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

1. **全局 Never 时提前退出**: 如果工作区/全局设置为 ``"never"``，扩展会立即退出，而不检查文件夹或读取文件。
2. **任何 Always 时提前退出**: 当任何文件夹为 ``"always"`` 时，扩展停止检查剩余文件夹。
3. **跳过 CMake 检测**: 如果找到任何显式 ``"always"``，则完全跳过 CMake 文件检测。
4. **延迟文件读取**: 仅在所有设置为 ``"detect"`` 时读取 CMakeLists.txt 文件。

另请参阅
--------

- :ref:`故障排除 <troubleshooting-section>`
- :ref:`设置 <settings>`
- :ref:`常见问题 <faqs-section>`
- `VS Code 激活事件文档 <https://code.visualstudio.com/api/references/activation-events>`_
- `GitHub Issue #1756 <https://github.com/espressif/vscode-esp-idf-extension/issues/1756>`_
