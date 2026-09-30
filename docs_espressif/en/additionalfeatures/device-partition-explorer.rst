Device Partition Explorer
=========================

:link_to_translation:`zh_CN:[中文]`

**Device Partition Explorer** lists the flash layout of the current ESP-IDF project. From a partition row you can read that region from the connected device, flash a binary to its offset, or open it in the Filesystem Image Explorer.

This view is separate from the :doc:`Partition Table Editor <partition-table-editor>`, which edits the project's partition table CSV, then builds and flashes that table.

Where to find it
----------------

Open **ESP-IDF Explorer** in the activity bar. **Device Partition Explorer** starts collapsed. Its title bar has two commands:

* ``ESP-IDF: Refresh Partition Table``
* ``ESP-IDF: Open Partition Table Editor UI``

Before you refresh
------------------

Select the device serial port with ``ESP-IDF: Select Port to Use``. Configure the extension as described in :ref:`Install ESP-IDF and Tools <installation>`.

Build the project first. Refresh uses these build outputs:

* ``build/flasher_args.json``
* ``build/bootloader/bootloader.bin``
* ``build/partition_table/partition-table.bin``

How the list is built
---------------------

``ESP-IDF: Refresh Partition Table`` (``espIdf.partition.table.refresh``) does not read the partition table stored on the chip. It converts the built ``partition-table.bin`` with ESP-IDF ``components/partition_table/gen_esp32part.py``, using the partition table offset from ``flasher_args.json``, and writes ``partition_table/partitionTable.csv`` in the project folder.

The tree then shows:

* **bootloader**, at the bootloader address from ``flasher_args.json``, sized from ``bootloader.bin``
* **partition_table**, at the partition table address, shown as 3K
* each partition from the generated CSV

Each row shows the name, offset, and size. The tooltip is the type and subtype, for example ``data / spiffs``.

Partition actions
-----------------

Click a row and choose an action. The selected serial port is used for read and flash.

* **Read partition from device** runs ``esptool.py read_flash`` for that offset and size and saves ``partitionsFromDevice/<name>.bin`` in the project folder.
* **Flash binary to this partition** asks for a ``.bin`` file and runs ``esptool.py write_flash`` at that partition's offset.
* **Explore filesystem** opens the :doc:`Filesystem Image Explorer <fs-image-explorer>`. If ``partitionsFromDevice/<name>.bin`` is not on disk yet, the extension reads the partition from the device first.

Flash a binary from the file explorer
--------------------------------------

Right-click a ``.bin`` file and choose ``ESP-IDF: Flash Binary to Partition...`` (``espIdf.flashBinaryToPartition``). Pick a partition from the list already loaded in Device Partition Explorer, or choose **Custom offset** and enter a hexadecimal value such as ``0x110000`` or a decimal offset.

Refresh the partition list first if you want the project's partitions in that picker. **Custom offset** remains available when the list is empty.

Messages for these commands are written to the **Partition Table** output channel.
