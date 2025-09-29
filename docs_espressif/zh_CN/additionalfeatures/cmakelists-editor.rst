CMakeLists.txt 编辑器
=====================

:link_to_translation:`en:[English]`

.. warning::

    该操作会用编辑器生成的内容覆盖文件中现有的代码。如果文件中有未包含在 schema 中的代码（或单行注释），请使用常规文本编辑器。

右键点击任意 ``CMakeLists.txt`` 文件时，该扩展会提供一个自定义的 ``CMakeLists.txt`` 编辑器，用于填写 ESP-IDF 项目和组件注册，具体参考：

- `项目 CMakeLists 文件 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#cmakelists>`_
- `组件 CMakeLists 文件 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#component-directories>`_

需要选择要编辑哪种类型的 ``CMakeLists.txt`` 文件（项目或组件），共有两种类型：简单字符串和字符串数组，例如 Component Sources (SRCS)。

.. note::

    * 所有输入项都在 `CMakeLists.txt schema <https://github.com/espressif/vscode-esp-idf-extension/blob/master/cmakeListsSchema.json>`_ 中有描述。
    * 该编辑器并不支持所有 CMake 函数和语法，仅用于简单的 ``CMakeLists.txt`` 配置，例如组件注册（使用 ``idf_component_register``）和基础项目元素。如需自定义或进行高级的 ``CMakeLists.txt`` 配置，请参考 `ESP-IDF 构建系统 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html>`_。此外，可查看 **CMakeLists.txt 编辑器 schema** 以获取支持的代码列表。

本教程将使用 blink 示例项目。

1.  右键点击 ``<project_path>/blink/CMakeLists.txt``，选择 ``ESP-IDF：CMakeLists.txt 编辑器``，然后选择 ``Project CMakeLists.txt``。

    .. image:: ../../../media/tutorials/cmakelists_editor/cmakelists_editor.png

2.  从 ``New Element`` 下拉菜单中选择新元素，然后点击 ``Add`` 按钮添加。为简单起见，可以修改项目名称，然后点击 ``Save`` 保存更改。

    在常规文本编辑器中重新打开文件，可以看到修改后的内容。

3.  在该项目中创建一个新的 ESP-IDF 组件，以便修改其 ``CMakeLists.txt``。前往菜单栏 ``查看`` > ``命令面板``，输入 ``ESP-IDF：创建新 ESP-IDF 组件``，并输入新组件名称。

4.  新组件将创建在 ``<project_path>/blink/components/<component_name>`` 目录下。在常规文本编辑器中打开 ``CMakeLists.txt``，可以看到一个 ``idf_component_register`` 方法，如下：

    .. code-block:: C

        idf_component_register(SRCS "my_component.c"
                               INCLUDE_DIRS "include")

    右键点击 ``<project_path>/blink/components/<component_name>/CMakeLists.txt``，选择 ``ESP-IDF：CMakeLists.txt 编辑器``，然后选择 ``Component CMakeLists.txt``。

    .. image:: ../../../media/tutorials/cmakelists_editor/components_editor.png

5.  注意，某些字段是数组类型，例如 **Component Sources (SRCS)**，你可以添加多个路径，而其他字段仅是字符串输入（如 ``cmakeListsSchema.json`` 所述）。

    .. note::

        使用该扩展时，源文件会在 ``CMakeLists.txt`` 所在目录自动添加或删除，无需用户手动操作。

6.  添加新元素 ``Public Component Requirements for the Component (REQUIRES)``，点击 ``Add`` 按钮。将出现新的数组字段。

7.  如 `组件 CMakeLists 文件 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#component-directories>`_ 中所述，``REQUIRES`` 用于列出组件依赖项。输入 ``mbedtls`` 并点击 ``+`` 按钮（也可在输入后按 Enter 键）。

8.  点击 ``Save`` 按钮并关闭 ``CMakeLists.txt`` 编辑器。在常规文本编辑器中打开 ``<project_path>/blink/components/<component_name>/CMakeLists.txt``，你将看到如下内容：

    .. code-block:: C
  
        idf_component_register(SRCS "my_component.c"
                               INCLUDE_DIRS "include"
                               REQUIRES "mbedtls")

参考链接
--------

要查看 ``CMakeLists.txt`` 编辑器中使用的所有字段，请访问：

- `ESP-IDF 项目 CMakeLists 文件 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#cmakelists>`_

- `ESP-IDF 组件 CMakeLists 文件 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#component-directories>`_
