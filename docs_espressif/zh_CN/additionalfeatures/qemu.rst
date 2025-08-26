.. _qemu:

QEMU 模拟器
===========

使用该扩展的命令创建项目时，会包含 Dockerfile，用于配合 `Dev Containers <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers>`_ 使用。使用 ``开发容器：在容器中打开文件夹`` 命令可以在容器中打开任意项目。

安装 ESP-IDF 时会包含一个 `乐鑫 QEMU 分支 <https://github.com/espressif/qemu>`_，此分支可基于乐鑫设备进行仿真开发。运行 ``ESP-IDF：打开 ESP-IDF 终端`` 命令，在终端中执行 ``python $IDF_PATH/tools/idf_tools.py install qemu-xtensa qemu-riscv32``，确保安装该分支。

.. note::

    可以使用 ``ESP-IDF：添加 Docker 容器配置`` 命令，将这些文件添加到当前项目目录中。

开发步骤：

1.  基于本仓库模板的 ``.devcontainer`` 目录中的 Dockerfile，在容器中准备一个项目文件夹。你可以通过以下方式实现：

    - 使用 ``ESP-IDF：新建项目`` 命令创建项目，该项目会包含 ``.devcontainer`` 目录。
    - 使用 ``ESP-IDF：添加 Docker 容器配置`` 命令，将 ``.devcontainer`` 文件添加至当前已打开的项目目录。

2.  使用 ``开发容器：在容器中打开文件夹`` 命令，在容器中打开项目文件夹。
3.  **Dev Containers** 会根据 Dockerfile 构建容器（如果之前未构建过），并在容器中安装此扩展。
4.  扩展应自动完成配置，如未完成，请运行设置向导。
5.  编写代码，并使用 ``ESP-IDF：构建项目`` 命令构建项目。
6.  使用 ``ESP-IDF：启动 QEMU 服务器`` 命令或活动栏中的 **[QEMU Server]** 链接，启动 QEMU，并加载构建目录中的二进制文件。  
7.  使用 ``ESP-IDF：监视 QEMU 设备`` 命令，启动一个运行 IDF 监视器的终端，以监视 QEMU。 
8.  要启动 QEMU 调试会话，请使用 ``ESP-IDF：启动 QEMU 调试会话`` 命令，该命令会停止当前的 QEMU 服务器并启动一个新的 QEMU 服务器以进行调试。

设置 ``idf.qemuDebugMonitor`` 配置项，在启动 QEMU 调试会话后启动监视器。要传递额外参数，请设置 ``idf.qemuExtraArgs`` 配置项。

例如，可以通过设置 ``"idf.qemuExtraArgs": ["--qemu-extra-args"]`` 向 QEMU 直接传递额外参数，而 ``--flash-file`` 或 ``--efuse-file`` 则属于 ``idf.py`` 特有的参数，详情请参阅 `ESP-IDF QEMU 模拟器 <https://docs.espressif.com/projects/esp-idf/zh_CN/latest/esp32/api-guides/tools/qemu.html>`_ 文档。

.. note::

    扩展在运行 ``ESP-IDF：监视 QEMU 设备`` 和 ``ESP-IDF：启动 QEMU 调试会话`` 命令时，默认 ``qemu-system-xtensa`` 或 ``qemu-system-riscv32`` 已在环境变量 PATH 中可用。
