Partition Table Editor
======================

:link_to_translation:`zh_CN:[中文]`

-   Go to ``View`` > ``Command Palette``.
-   Type ``ESP-IDF: SDK Configuration Editor`` and select the command.

    .. image:: ../../../media/tutorials/partition_table/sdkconfig.png

-   Search for ``partition_table_custom``, select ``Custom Partition Table CSV`` from the ``Partition Table`` dropdown list, and set the filename. The tool will search for this file in your current project directory.

    .. image:: ../../../media/tutorials/partition_table/partition_table_custom.png

-   If the partition table file does not exist, executing the command will create the file. If the partition table file already exists, ensure that the first two lines of the partition table CSV file match the format below:

    .. code-block::

        # ESP-IDF Partition Table
        # Name, Type, SubType, Offset, Size, Flag

-   Once the partition table editor is open, you can edit the partition table as needed. For more information, refer to `ESP-IDF Partition Tables <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/partition-tables.html>`_.

    .. image:: ../../../media/tutorials/partition_table/partition_editor.png

-   Once you are satisfied, click ``Save`` to save the changes. This will override the content of the CSV file.

-   The editor reads ``CONFIG_ESPTOOLPY_FLASHSIZE`` and ``CONFIG_PARTITION_TABLE_OFFSET`` from ``sdkconfig`` and draws a flash map. Each block is a partition, the reserved boot region, or free space. The summary shows used, free, and total flash.

-   Under each partition, the slider and the minus and plus buttons change its size in 4 KB steps (1 KB for a custom non-app partition). ``Reclaim`` takes the free gap immediately after that partition. ``Fit`` grows it into the remaining flash. ``Recommended`` snaps NVS, otadata, FAT, SPIFFS, LittleFS, coredump, and phy partitions to their minimum size. Sizes are saved as ``K`` or ``M`` when the value divides evenly, otherwise as hexadecimal.

-   A blank offset stays blank in the CSV. The map aligns data partitions to 4 KB and app partitions to 64 KB, starting at the partition table offset plus 4 KB. An offset already written in the CSV stays fixed.

-   A preset replaces the rows: single factory app, OTA with SPIFFS, OTA with FAT, or Zigbee ESP-IDF. ``Save`` writes the file. ``Keep equal OTA slots`` (on by default) resizes ``ota_0`` and ``ota_1`` together.

-   Warnings for overlap, flash overflow, leftover free space, an OTA app without ``otadata``, and OTA without NVS do not block ``Save``. Field validation still blocks ``Save``. ``Copy CSV`` and ``Paste CSV`` use the editor clipboard.

-   Data subtypes include ``littlefs`` and ``efuse``. Choose ``custom`` to enter a type from ``0x40`` to ``0xFE`` and a subtype from ``0x00`` to ``0xFE``. Flags can be ``encrypted`` and ``readonly``.

-   Now you can click ``Select Flash Method``, ``Build``, and ``Flash`` buttons at the top right to build and flash the partition table to the chip.

-   To read a partition from the connected device or flash a binary to one partition, use the :doc:`Device Partition Explorer <device-partition-explorer>`.
