.. _unit testing:

使用 Unity 框架进行单元测试
=============================

:link_to_translation:`en:[English]`

使用 ESP-IDF 开发应用程序并考虑为组件函数添加单元测试时，你可以使用此扩展，基于 Unity 框架在设备上发现和执行测试，详情请参考 `ESP32 中的单元测试 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/unit-tests.html>`_。

扩展会扫描当前项目的工作区文件夹，寻找所有符合规范的测试文件，即所有符合 ``idf.unitTestFilePattern`` 配置项中指定通配符模式的测试文件（默认是 ``**/test/test_*.c``）。找到测试文件后，扩展会通过正则表达式 ``TEST_CASE\\(\"(.*)\",\\s*\"(.*)\"\\)`` 解析文件中的测试用例。具体而言，这些正则表达式会匹配如下测试文件格式：

.. code-block:: C

    TEST_CASE("test name", "[module name]")
    {
            // 在此处添加测试
    }


配置 ESP-IDF 项目以在扩展中启用单元测试
----------------------------------------

假设有一个 ESP-IDF 项目，结构如下：

.. code-block::

  unit_test
    - components                              - 应用程序项目的组件
      - testable
        - include
        - test                                - 组件的测试目录
          * component.mk / CMakeLists.txt     - 测试的组件 makefile
          * test_mean.c                       - 测试源文件
        * component.mk / CMakeLists.txt       - 组件 makefile
        * mean.c                              - 组件源文件


在 ``testable`` 组件内，单元测试添加到 ``test`` 目录中，其中包含测试的源文件和组件 makefile (``component.mk``/``CMakeLists.txt``)。

如果想要为 ``testable`` 组件添加测试，只需定义一个 ``test`` 子目录并添加包含不同测试用例的 ``test_name.c`` 文件即可运行。

此结构来自 `ESP-IDF unit_test 示例 <https://github.com/espressif/esp-idf/tree/master/examples/system/unit_test>`_，可以作为参考。

.. note::

运行测试
--------

点击 `Visual Studio Code 活动栏 <https://code.visualstudio.com/docs/getstarted/userinterface>`_ 中的 ``Testing`` 选项卡时，扩展将尝试查找所有测试文件和测试用例，并保存测试组件列表以便在步骤 3 中添加。

当按下测试上的运行按钮时，它将在测试前按如下方式配置当前项目：

1. 从扩展模板复制 unity-app 并将测试组件添加到主 CMakeLists.txt 的 ``TEST_COMPONENTS`` cmake 变量中。扩展 unity-app 是一个基本的 ESP-IDF 应用程序，带有 unity 菜单，将在当前 **idf.port** 串行设备上构建和烧录，包含在探索步骤中找到的所有测试用例。

2. 构建并烧录 unity-app 到设备。

.. note::
  您也可以使用 **ESP-IDF 单元测试：构建单元测试应用** 和 **ESP-IDF 单元测试：烧录单元测试应用** 扩展命令分别创建、构建和烧录 unity 测试应用程序，这些命令将复制构建并烧录生成的单元测试应用程序到您的设备。

3. 捕获设备的串口输出并解析测试结果以在 ``测试`` 选项卡中显示。串口输出也会显示在 ``ESP-IDF`` 输出通道中。

4. 您可以使用 ``测试`` 选项卡中的 ``刷新测试`` 按钮刷新测试并再次构建 unity-app。
