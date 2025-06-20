.. _unit testing:

使用 Unity 进行 ESP-IDF 单元测试
===================================

当您使用 ESP-IDF 开发应用程序并考虑为组件函数添加单元测试时，此扩展可以帮助基于 Unity 在您的设备上发现和执行测试，如 `ESP32 单元测试 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/unit-tests.html>`_ 文档中所述。

扩展会在当前项目工作区文件夹中探索遵循前述文档约定的测试，即所有遵循 **idf.unitTestFilePattern** 配置设置中指定的 glob 模式（默认：``**/test/test_*.c``）的测试文件。测试用例通过 ``TEST_CASE\\(\"(.*)\",\\s*\"(.*)\"\\)`` 正则表达式进行解析，匹配以下测试文件格式：

.. code-block:: C

  TEST_CASE("test name", "[module name]")
  {
          // Add test here
  }


配置 ESP-IDF 项目以在扩展中启用单元测试
-------------------------------------------------------------------------

假设您有一个具有以下结构的 ESP-IDF 项目：

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


在 ``testable`` 组件内，单元测试添加到 ``test`` 目录中。``test`` 目录包含测试的源文件和组件 makefile（component.mk / CMakeLists.txt）。

如果您想为 ``testable`` 组件添加测试，只需定义一个 ``test`` 子目录并添加包含不同测试用例的 ``test_name.c`` 文件即可运行。

这是来自 `ESP-IDF unit_test 示例 <https://github.com/espressif/esp-idf/tree/master/examples/system/unit_test>`_ 的结构，可以作为参考。

.. note::
  您可以通过修改 VS Code 设置中的 **idf.unitTestFilePattern** 设置来自定义测试文件发现模式。这允许您为测试文件使用不同的命名约定或目录结构。

PyTest 嵌入式服务配置
--------------------------------------

扩展使用 `pytest-embedded <https://docs.espressif.com/projects/pytest-embedded/en/latest/index.html>`_ 在 ESP-IDF 设备上运行测试。**idf.pyTestEmbeddedServices** 配置设置允许您指定运行 pytest 命令时要使用的嵌入式服务。

默认情况下，扩展使用 ``["esp", "idf"]`` 作为嵌入式服务。这些服务提供以下功能：

* **esp**：启用乐鑫特定功能，包括使用 `esptool` 进行自动目标检测和端口确认
* **idf**：提供 ESP-IDF 项目支持，包括自动烧录构建的二进制文件和解析二进制信息

您可以通过修改 VS Code 设置中的 **idf.pyTestEmbeddedServices** 设置来自定义嵌入式服务。例如，您可能想要添加其他服务，如：

* **serial**：用于基本串口通信
* **jtag**：用于 OpenOCD/GDB 工具
* **qemu**：用于在 QEMU 而不是真实硬件上运行测试
* **wokwi**：用于在 Wokwi 仿真平台上运行测试

有关可用服务及其功能的完整列表，请参阅 `pytest-embedded 服务文档 <https://docs.espressif.com/projects/pytest-embedded/en/latest/concepts/services.html>`_。

.. note::
  您选择的嵌入式服务将影响执行的 pytest 命令。确保您指定的服务与您的测试环境和要求兼容。

运行测试
--------------------------------------------

当您点击 `Visual Studio Code 活动栏 <https://code.visualstudio.com/docs/getstarted/userinterface>`_ 中的测试选项卡时，扩展将尝试查找所有测试文件和测试用例，并保存测试组件列表以便在步骤 3 中添加。

.. note::
  用户需要通过选择菜单 **查看** > **命令面板** 并输入 **ESP-IDF 单元测试：安装 ESP-IDF PyTest 要求** 来安装 ESP-IDF PyTest python 要求。选择命令并查看 pytest 包安装输出。

当按下测试上的运行按钮时，它将在测试前按如下方式配置当前项目：

1. 检查 ESP-IDF 的 PyTest 要求是否满足。

.. note::
  此扩展中的单元测试需要在您的 Python 虚拟环境中安装 `ESP-IDF PyTest 要求 <https://github.com/espressif/esp-idf/blob/master/tools/requirements/requirements.pytest.txt>`_。

2. 如果在 settings.json 中 **idf.toolsPath** 配置设置指定的 python 当前虚拟环境中未找到，则安装 ESP-IDF PyTest 要求。

3. 从扩展模板复制 unity-app 并将测试组件添加到主 CMakeLists.txt 的 ``TEST_COMPONENTS`` cmake 变量中。扩展 unity-app 是一个基本的 ESP-IDF 应用程序，带有 unity 菜单，将在当前 **idf.port** 串行设备上构建和烧录，包含在探索步骤中找到的所有测试用例。

.. note::
  您也可以使用 **ESP-IDF 单元测试：安装 ESP-IDF PyTest 要求** 扩展命令创建、构建和烧录 unity 测试应用程序，该命令将复制构建并烧录生成的单元测试应用程序到您的设备。

4. 运行 `pytest-embedded <https://docs.espressif.com/projects/pytest-embedded/en/latest/index.html>`_，这是一个扩展 PyTest 以在 esp-idf 设备上运行的插件，并在 unity-app 目录中以 XML 文件形式输出结果。这作为扩展任务执行，输出显示在终端中（类似于构建和烧录任务）。pytest 命令使用 **idf.pyTestEmbeddedServices** 配置设置中指定的嵌入式服务（默认：``["esp", "idf"]``）。

.. note::
  您可以通过修改 VS Code 设置中的 **idf.pyTestEmbeddedServices** 设置来自定义 pytest 使用的嵌入式服务。这允许您指定不同的服务或根据需要为测试环境添加其他服务。

5. 解析 XML 结果文件，并在测试选项卡中更新测试结果，显示测试持续时间。

6. 您可以使用测试选项卡中的 ``刷新测试`` 按钮刷新测试并再次构建 unity-app。
