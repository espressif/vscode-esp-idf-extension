.. _extension-activation:

扩展激活
========

本文档说明 ESP-IDF 扩展如何决定是否在 Visual Studio Code 中打开工作区时激活。

概述
----

扩展使用智能激活系统，既尊重用户的显式配置，又提供合理的默认值。该系统旨在解决 `#1756 <https://github.com/espressif/vscode-esp-idf-extension/issues/1756>`_ 问题，即使用自定义 CMake 设置的用户无法激活扩展。

激活优先级层次
--------------

扩展在决定是否激活时遵循严格的优先级层次：

1. **工作区/全局设置 = "always"**
   
   - **操作**: 立即激活
   - **跳过**: 所有其他检查（CMake 检测、文件夹检查）
   - **用例**: 为自定义项目布局强制启用扩展
   - **设置位置**: 用户设置或工作区设置

2. **工作区/全局设置 = "never"**
   
   - **操作**: 不激活，立即退出
   - **覆盖**: 所有文件夹级设置
   - **不显示提示**: 尊重您的显式选择
   - **用例**: 在特定工作区中显式禁用扩展

3. **任意文件夹设置 = "always"**
   
   - **操作**: 立即激活（"true 优先"策略）
   - **顺序独立**: 检查所有文件夹，而不仅仅是第一个
   - **用例**: 至少包含一个 ESP-IDF 项目的多根工作区
   - **设置位置**: ``.vscode/settings.json`` 中的文件夹设置

4. **所有文件夹设置 = "never"**
   
   - **操作**: 不激活，立即退出
   - **不显示提示**: 尊重显式配置
   - **用例**: 显式排除 ESP-IDF 的多根工作区

5. **所有设置 = "detect"** （默认行为）
   
   - **操作**: 回退到自动 CMakeLists.txt 检测
   - **检测**: 搜索 ``include($ENV{IDF_PATH}/tools/cmake/project.cmake)``
   - **如果未找到**: 提示"仍然激活"对话框
   - **用例**: 标准 ESP-IDF 项目（向后兼容）

配置设置
--------

控制扩展激活的设置是：

.. code-block:: json

   {
     "idf.extensionActivationMode": "detect"  // 或 "always" / "never"
   }

**设置范围:**

- **用户（全局）**: ``~/.config/Code/User/settings.json`` (Linux/macOS) 或 ``%APPDATA%\Code\User\settings.json`` (Windows)
- **工作区**: 工作区根目录中的 ``.vscode/settings.json``
- **文件夹**: 特定文件夹中的 ``.vscode/settings.json`` （多根工作区）

**默认值:** ``"detect"`` （自动检测）

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

这将激活扩展，无论您的 CMakeLists.txt 内容如何。

在特定工作区中禁用扩展
~~~~~~~~~~~~~~~~~~~~~~

如果您想防止扩展在非 ESP-IDF 工作区中激活：

**工作区设置** (``.vscode/settings.json``):

.. code-block:: json

   {
     "idf.extensionActivationMode": "never"
   }

扩展将不会激活，也不会显示提示。

包含混合项目的多根工作区
~~~~~~~~~~~~~~~~~~~~~~~~

对于同时包含 ESP-IDF 和非 ESP-IDF 项目的工作区：

**工作区文件** (``my-workspace.code-workspace``):

.. code-block:: json

   {
     "folders": [
       {
         "path": "esp32-firmware",
         "settings": {
           "idf.extensionActivationMode": "always"
         }
       },
       {
         "path": "documentation",
         "settings": {
           "idf.extensionActivationMode": "never"
         }
       },
       {
         "path": "web-interface"
         // 无设置 - 不影响激活
       }
     ]
   }

在此示例中，扩展将激活，因为 ``esp32-firmware`` 文件夹设置为 ``true`` （优先级 #3："true 优先"）。

标准 ESP-IDF 项目（无需配置）
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

对于具有典型 CMakeLists.txt 结构的标准 ESP-IDF 项目：

**CMakeLists.txt** （项目根目录）:

.. code-block:: cmake

   cmake_minimum_required(VERSION 3.16)
   include($ENV{IDF_PATH}/tools/cmake/project.cmake)
   project(my-project)

无需设置 — 扩展将自动将其检测为 ESP-IDF 项目（优先级 #5）。

性能优化
--------

激活逻辑设计为最佳性能：

1. **全局 Never 时提前退出**: 如果工作区/全局设置为 ``"never"``，扩展会立即退出，而不检查文件夹或读取文件。

2. **任何 Always 时提前退出**: 当任何文件夹为 ``"always"`` 时，扩展停止检查剩余文件夹。

3. **跳过 CMake 检测**: 如果找到任何显式 ``"always"``，则完全跳过 CMake 文件检测。

4. **延迟文件读取**: 仅在所有设置为 ``"detect"`` 时读取 CMakeLists.txt 文件。

常见激活问题
------------

扩展未激活
~~~~~~~~~~

**症状**: ESP-IDF 命令不可用，没有扩展功能工作。

**可能原因**:

1. **显式 "never" 设置**: 检查用户、工作区或文件夹设置中是否将 ``idf.extensionActivationMode`` 设置为 ``"never"``。

   **解决方案**: 将其设置为 ``"always"`` 或 ``"detect"``。

2. **非标准 CMakeLists.txt**: 您的项目不包含标准 ESP-IDF project.cmake 行。

   **解决方案**: 在工作区设置中添加 ``"idf.extensionActivationMode": "always"``。

3. **提示被关闭**: 您关闭了"仍然激活"对话框。

   **解决方案**: 重新加载窗口（``Ctrl+Shift+P`` → "开发人员: 重新加载窗口"）并在提示时选择"仍然激活"。

扩展在错误的工作区中激活
~~~~~~~~~~~~~~~~~~~~~~~~

**症状**: ESP-IDF 扩展在非 ESP-IDF 项目中激活。

**解决方案**: 在工作区设置中添加 ``"idf.extensionActivationMode": "never"`` 以显式禁用它。

多根工作区问题
~~~~~~~~~~~~~~

**症状**: 即使一个文件夹是 ESP-IDF 项目，扩展也未激活。

**可能原因**: 工作区级 ``"never"`` 设置正在覆盖文件夹设置。

**解决方案**: 删除工作区级 ``idf.extensionActivationMode`` 设置，改用文件夹级设置。

技术细节
--------

为什么使用"True 优先"策略？
~~~~~~~~~~~~~~~~~~~~~~~~~~~

在多根工作区中，如果任何文件夹需要 ESP-IDF 扩展，则扩展必须全局激活（VSCode 扩展按工作区激活，而不是按文件夹）。"true 优先"策略确保：

- 一个 ESP-IDF 项目文件夹可以为所有文件夹激活扩展
- 文档或实用程序文件夹可以共存而不会阻止激活
- 混合项目工作区中的更好用户体验

向后兼容性
~~~~~~~~~~

激活系统保持完全向后兼容性：

- 没有设置的项目使用原始 CMakeLists.txt 检测
- "仍然激活"提示仍会出现在非标准项目中
- 标准 ESP-IDF 项目无需任何配置更改即可工作

另请参阅
--------

- :ref:`故障排除 <troubleshooting-section>`
- :ref:`设置 <settings>`
- :ref:`常见问题 <faqs-section>`
- `GitHub Issue #1756 <https://github.com/espressif/vscode-esp-idf-extension/issues/1756>`_
