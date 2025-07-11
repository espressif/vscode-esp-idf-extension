.. _create_an_esp-idf_project:

创建 ESP-IDF 项目
=================

:link_to_translation:`en:[English]`

可以通过三种方式启动 ESP-IDF 项目：

1. :ref:`ESP-IDF New Project`
3. :ref:`ESP-IDF Existing ESP-IDF Project`

推荐使用第一种方式来自行配置项目，而第二和第三种方式则使用当前工作区文件夹配置来创建项目。

.. _ESP-IDF New Project:

使用 ``ESP-IDF：新建项目``
--------------------------------

在 Visual Studio Code 中：

- 前往菜单栏 ``查看`` > ``命令面板``。

- 输入 ``ESP-IDF：新建项目``，选择该命令以启动新项目向导窗口。

    .. image:: ../../media/tutorials/new_project/new_project_init.png

- 输入项目名称
- 选择保存新项目的位置
- 选择当前使用的乐鑫开发板名称
- 选择设备的串口（下拉菜单中会显示当前连接的串行设备列表）

    .. note::

        如果不确定串口名称，可以查看 `创建串口连接 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/get-started/establish-serial-connection.html>`_。

    .. note::

        请查看 `根据目标芯片配置 OpenOCD <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_，为你的硬件选择合适的 OpenOCD 配置文件。

- 你也可以将 ESP-IDF 组件目录 ``component-dir`` 导入到新项目中。该组件目录将被复制到新项目的 ``components`` 子目录中 (``<project-dir>/components/component-dir``)。

- 点击 ``Choose Template`` 按钮。

- 如果想使用例程模板，请在下拉菜单中选择 ESP-IDF。

    .. note::

        如果想创建一个空白项目，请选择 ``sample_project`` 或 ``template-app``。

    .. image:: ../../media/tutorials/new_project/new_project_templates.png

- 选择想要使用的模板并点击 ``Create Project Using Template <template-name>`` 按钮，其中 ``<template-name>`` 是所选模板的名称。

- 成功创建项目后，将弹出一个通知窗口，询问是否打开新创建的项目。

.. image:: ../../media/tutorials/new_project/new_project_confirm.png
  :width: 400px
  :align: center

.. _ESP-IDF Existing ESP-IDF Project:

打开已有的 ESP-IDF 项目
--------------------------

ESP-IDF 项目遵循以下目录结构：

`ESP-IDF 示例项目 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/build-system.html#example-project-structure>`_

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

- 前往菜单栏 ``查看`` > ``命令面板``。

- 输入 ``ESP-IDF：导入 ESP-IDF 项目``，选择该命令以导入现有的 ESP-IDF 项目。

此命令将添加 Visual Studio Code 配置文件 (settings.json, launch.json) 和 Docker 容器文件 (Dockerfile and .devcontainer.json)。

接下来请 :ref:`连接设备 <connectdevice>`。


添加 Visual Studio Code 配置文件和 Docker 容器
----------------------------------------------

在 Visual Studio Code 中，前往菜单栏 ``文件`` > ``打开文件夹``。打开一个根目录中包含 ``CMakeLists.txt`` 文件的文件夹（如 myProject），该文件夹应符合 ESP-IDF 项目结构。

1.  可以通过以下方式添加 Visual Studio Code 配置文件 (settings.json, launch.json)：

    - 前往菜单栏 ``查看`` > ``命令面板``。

    - 输入 ``ESP-IDF：添加 VS Code 配置文件夹``，并选中该命令。

2.  可以通过以下方式在 ESP-IDF Docker 容器中打开项目：

    - 前往菜单栏 ``查看`` > ``命令面板``。

    - 输入 ``ESP-IDF：添加 Docker 容器配置``，选中该命令从而将 ``.devcontainer`` 目录添加到当前目录下。

    - 前往菜单栏 ``查看`` > ``命令面板``。

    - 输入 ``开发容器: 在容器中打开文件夹`` 并选中该命令，在由 Dockerfile 创建的容器中打开现有的项目。
