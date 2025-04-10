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

-   Now you can click ``Select Flash Method``, ``Build``, and ``Flash`` buttons at the top right to build and flash the partition table to the chip.
