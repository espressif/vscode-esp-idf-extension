设备分区资源管理器
==================

:link_to_translation:`en:[English]`

**设备分区资源管理器** 列出当前 ESP-IDF 项目的 flash 布局。在分区行上，可以从已连接的设备读取该区域、将二进制文件烧录到其偏移地址，或在文件系统镜像资源管理器中打开它。

此视图与 :doc:`分区表编辑器 <partition-table-editor>` 不同。分区表编辑器用于编辑项目的分区表 CSV，然后构建并烧录该表。

在哪里找到
----------

在活动栏中打开 **ESP-IDF 资源管理器**。**设备分区资源管理器** 默认处于折叠状态。其标题栏有两个命令：

* ``ESP-IDF：刷新分区表``
* ``ESP-IDF 打开分区表编辑器 UI``

刷新之前
--------

使用 ``ESP-IDF：选择要使用的端口 (COM、tty、usbserial)`` 选择设备串口。请按照 :ref:`安装 ESP-IDF 和工具 <installation>` 文档完成扩展配置。

请先构建项目。刷新会使用以下构建产物：

* ``build/flasher_args.json``
* ``build/bootloader/bootloader.bin``
* ``build/partition_table/partition-table.bin``

列表如何生成
------------

``ESP-IDF：刷新分区表`` （``espIdf.partition.table.refresh``）不会读取芯片上存储的分区表。它使用 ``flasher_args.json`` 中的分区表偏移量，通过 ESP-IDF 的 ``components/partition_table/gen_esp32part.py`` 转换已构建的 ``partition-table.bin``，并在项目目录中写入 ``partition_table/partitionTable.csv``。

树中随后会显示：

* **bootloader**，地址来自 ``flasher_args.json`` 中的 bootloader 地址，大小来自 ``bootloader.bin``
* **partition_table**，位于分区表地址，显示为 3K
* 生成的 CSV 中的每个分区

每一行显示名称、偏移量和大小。工具提示为类型和子类型，例如 ``data / spiffs``。

分区操作
--------

单击某一行并选择操作。读取和烧录使用已选择的串口。

* **从设备读取分区** 对该偏移量和大小运行 ``esptool.py read_flash``，并在项目目录中保存 ``partitionsFromDevice/<name>.bin``。
* **将二进制文件烧录到该分区** 会要求选择一个 ``.bin`` 文件，并在该分区的偏移量处运行 ``esptool.py write_flash``。
* **浏览文件系统** 会打开 :doc:`文件系统镜像资源管理器 <fs-image-explorer>`。如果磁盘上还没有 ``partitionsFromDevice/<name>.bin``，扩展会先从设备读取该分区。

从文件资源管理器烧录二进制文件
------------------------------

右键单击 ``.bin`` 文件，选择 ``ESP-IDF：将二进制文件烧录到分区…`` （``espIdf.flashBinaryToPartition``）。从设备分区资源管理器中已加载的列表里选择一个分区，或选择 **自定义偏移量**，输入十六进制值（例如 ``0x110000``）或十进制偏移量。

如果希望在该选择器中看到项目的分区，请先刷新分区列表。列表为空时，仍可使用 **自定义偏移量**。

这些命令的消息会写入 **Partition Table** 输出通道。
