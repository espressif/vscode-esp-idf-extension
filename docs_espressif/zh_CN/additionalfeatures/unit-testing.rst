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

    你可以通过修改 VS Code 设置中的 ``idf.unitTestFilePattern`` 配置项来自定义测试文件发现模式，为测试文件使用不同的命名方式或目录结构。

pytest 嵌入式服务配置
---------------------

扩展使用 `pytest-embedded <https://docs.espressif.com/projects/pytest-embedded/en/latest/index.html>`_ 在 ESP-IDF 设备上运行测试。可以通过 ``idf.pyTestEmbeddedServices`` 配置项指定运行 pytest 命令时使用的嵌入式服务。

默认情况下，扩展使用 ``["esp", "idf"]`` 作为嵌入式服务。服务提供以下功能：

* **esp**：启用乐鑫特有功能，包括使用 ``esptool`` 进行目标自动检测和端口确认。
* **idf**：提供 ESP-IDF 项目支持，包括自动烧录构建的二进制文件和解析二进制信息。

通过修改 VS Code 设置中的 ``idf.pyTestEmbeddedServices`` 配置项，可以自定义嵌入式服务。例如，你可以添加以下服务：

* **serial**：用于基本串口通信。
* **jtag**：用于 OpenOCD/GDB 工具。
* **qemu**：用于在 QEMU 而不是真实硬件上运行测试。
* **wokwi**：用于在 Wokwi 仿真平台上运行测试。

有关可用服务及其功能的完整列表，请参阅 `pytest-embedded 服务文档 <https://docs.espressif.com/projects/pytest-embedded/en/latest/concepts/services.html>`_。

.. note::
  
    你选择的嵌入式服务将影响执行的 pytest 命令。请确保你指定的服务与你的测试环境和要求兼容。

运行测试
--------

点击 `Visual Studio Code 活动栏 <https://code.visualstudio.com/docs/getstarted/userinterface>`_ 中的 ``Testing`` 选项卡时，扩展将尝试查找所有测试文件和测试用例，并保存测试组件列表以便在步骤 3 中添加。

.. note::

    用户需要安装 ESP-IDF pytest 的 Python 的依赖。请前往菜单栏选择 ``查看`` > ``命令面板``，输入 ``单元测试：安装 ESP-IDF pytest 依赖项``，选择该命令后，即可查看 pytest 包的安装输出。

按下测试中的 ``run`` 按钮时，系统将在测试前按如下方式配置当前项目：

1.  检查 ESP-IDF 的 pytest 依赖项是否满足。

    .. note::

        若想在此扩展中进行单元测试，需要先在你的 Python 虚拟环境中安装 `ESP-IDF pytest 依赖项 <https://github.com/espressif/esp-idf/blob/master/tools/requirements/requirements.pytest.txt>`_。

2.  如果在 ``settings.json`` 文件中 ``idf.toolsPath`` 配置项所指定的 Python 虚拟环境中未找到 ESP-IDF 所需的 pytest 依赖，则系统会自动安装这些依赖。

3.  从扩展模板中复制 ``unity-app``，并将所需的测试组件添加到主 ``CMakeLists.txt`` 文件的 ``TEST_COMPONENTS`` CMake 变量中。扩展提供的 ``unity-app`` 是一个包含 Unity 菜单的简单 ESP-IDF 应用程序，该程序会和探索步骤中发现的测试用例一起被构建并烧录到 ``idf.port`` 指定的串口设备上。

    .. note::

        你也可以使用 ``单元测试：安装 ESP-IDF pytest 依赖项`` 扩展命令，来创建、构建和烧录单元测试应用程序。该命令将把生成的单元测试应用程序复制、构建并烧录到你的设备上。

4.  扩展会运行 `pytest-embedded <https://docs.espressif.com/projects/pytest-embedded/en/latest/index.html>`_ 插件，让 pytest 在 ESP-IDF 设备上执行测试，并把结果保存为 XML 文件放到 ``unity-app`` 目录。这个过程作为扩展任务执行，结果会显示在终端里（类似于构建和烧录任务）。pytest 的运行还依赖 ``idf.pyTestEmbeddedServices`` 配置项指定的服务（默认是 ``["esp", "idf"]``）。

    .. note::

        你可以通过修改 VS Code 设置中的 ``idf.pyTestEmbeddedServices`` 配置项来自定义 pytest 使用的嵌入式服务，从而指定不同的服务或根据需要为测试环境添加其他服务。

5.  解析 XML 结果文件，并在 ``Testing`` 选项卡中更新测试结果，显示测试持续时间。

6.  你可以使用 ``Testing`` 选项卡中的 ``Refresh Tests`` 按钮刷新测试并再次构建 ``unity-app``。
