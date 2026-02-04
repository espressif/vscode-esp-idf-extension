.. _create_an_esp-idf_project:

创建 ESP-IDF 项目
=================

:link_to_translation:`en:[English]`

可以通过以下两种方式创建项目：

1. :ref:`ESP-IDF New Project`
2. :ref:`ESP-IDF Existing ESP-IDF Project`

推荐使用第一种方式，便于配置项目；第二种方式将使用当前工作区文件夹配置创建项目。

.. _ESP-IDF New Project:

使用 ``ESP-IDF: New Project``
-----------------------------

在 Visual Studio Code 中：

- 前往 ``查看`` > ``命令面板``。

- 输入 ``ESP-IDF: New Project`` 并选择该命令以启动新建项目向导。

- 将出现一个下拉菜单，列出扩展检测到的所有 ESP-IDF 配置。选择要用于创建新项目的 ESP-IDF 配置。

- 将显示 ESP-IDF 中的全部示例菜单。可选择其中一个示例作为新项目的模板。

    .. note::

        若要创建空白项目，请选择 ESP-IDF 的 ``sample_project`` 或扩展的 ``template-app``。

    .. image:: ../../media/tutorials/new_project/new_project_templates.png

- 选择所需模板并点击 ``Create Project Using Template <template-name>`` 按钮，其中 ``<template-name>`` 为所选模板名称。

- 将出现新建项目配置窗口。请填写必填项：


    .. image:: ../../media/tutorials/new_project/new_project_init.png

- 选择项目名称。
- 选择新项目的保存位置。
- 选择本项目中使用的 Espressif IDF_TARGET 与开发板。
- 选择设备串口（下拉列表中会显示当前已连接的串口设备）。

    .. note::

        如不确定串口名称，请参阅 `建立串口连接 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/get-started/establish-serial-connection.html>`_。

    .. note::

        请参阅 `根据目标配置 OpenOCD <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_，根据硬件选择正确的 OpenOCD 配置文件。

- （可选）可将任意 ESP-IDF 组件目录 ``component-dir`` 导入新项目，该目录会被复制到新项目的 ``components`` 子目录（``<project-dir>/components/component-dir``）。

- 点击 ``Create Project`` 按钮。

- 等待项目创建完成后，点击 ``Open Project``。

.. _ESP-IDF Existing ESP-IDF Project:

打开已有的 ESP-IDF 项目
-----------------------

ESP-IDF 项目遵循以下目录结构：

`ESP-IDF 示例项目 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#example-project>`_

.. code-block::

  - myProject/
              - CMakeLists.txt
              - sdkconfig
              - components/ - component1/ - CMakeLists.txt
                                          - Kconfig
                                          - src1.c
                            - component2/ - CMakeLists.txt
                                          - Kconfig
                                          - src1.c
                                          - include/ - component2.h
              - main/       - CMakeLists.txt
                            - src1.c
                            - src2.c

              - build/


在 Visual Studio Code 中：

- 前往 ``查看`` > ``命令面板``。

- 输入 ``ESP-IDF: Import ESP-IDF Project`` 并选择该命令以导入已有的 ESP-IDF 项目。

此命令会添加 Visual Studio Code 配置文件（settings.json、launch.json）以及 Docker 容器相关文件（Dockerfile 和 .devcontainer.json）。

下一步请 :ref:`连接设备 <connectdevice>`。


添加 Visual Studio Code 配置文件和 Docker 容器
----------------------------------------------

在 Visual Studio Code 中，前往 ``文件`` > ``打开文件夹``，打开根目录下包含 ``CMakeLists.txt`` 的文件夹（例如 myProject），且该文件夹符合 ESP-IDF 项目结构。

1.  添加 Visual Studio Code 配置文件（settings.json、launch.json）：

    - 前往 ``查看`` > ``命令面板``。

    - 输入 ``ESP-IDF: Add .vscode Configuration Folder`` 并选择该命令。

2.  在 ESP-IDF Docker 容器中打开项目：

    - 前往 ``查看`` > ``命令面板``。

    - 输入 ``ESP-IDF: Add Docker Container Configuration`` 并选择该命令，将 ``.devcontainer`` 目录添加到当前目录。

    - 前往 ``查看`` > ``命令面板``。

    - 输入 ``Dev Containers: Open Folder in Remote Container`` 并选择该命令，在由上一步 Dockerfile 创建的容器中打开现有项目。
