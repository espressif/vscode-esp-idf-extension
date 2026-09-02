Filesystem Image Explorer
=========================

:link_to_translation:`zh_CN:[中文]`

The ``ESP-IDF: Explore Filesystem Image`` command inspects a partition binary (``.bin``) generated for an ESP-IDF project. It detects whether the image is **SPIFFS**, **FAT**, **LittleFS**, or **NVS**, then shows a read-only tree of the contents.

How to open it
--------------

* Right-click a ``.bin`` file in the Explorer and choose ``ESP-IDF: Explore Filesystem Image``.
* Run ``ESP-IDF: Explore Filesystem Image`` from the Command Palette and pick a binary.
* In **Device Partition Explorer**, select a partition and choose **Explore filesystem**. If the partition has not been read from the device yet, the extension reads it to ``partitionsFromDevice/<name>.bin`` first.

The **Filesystem Image Explorer** view (ESP-IDF Explorer sidebar) lists directories and files with sizes. NVS is a key-value store, not a directory filesystem: namespaces appear as folders and keys as leaves, with type and a short value preview.

Detection and listing
---------------------

Detection inspects on-disk structures rather than searching for strings, so application binaries that merely reference a filesystem are reported as unknown. If a Device Partition Explorer subtype (for example ``spiffs`` or ``nvs``) disagrees with the detected type, the detected type is used and a warning is shown on the tree root.

* **NVS**: parsed in the extension. Namespaces, keys, types, and scalar or string values are read from the page entry tables. Encrypted NVS images cannot be listed without keys.
* **FAT**: listed with ESP-IDF ``components/fatfs/fatfsparse.py`` (including wear levelling detection). Configure ESP-IDF so this script is available. The volume label folder that the tool creates is collapsed so the tree starts at the partition root.
* **LittleFS**: read from the superblock and the metadata pairs, following the newest revision of each pair and descending into subdirectories.
* **SPIFFS**: geometry is recovered from the per-block magic value, then object index headers provide names and sizes.

LittleFS and SPIFFS listings report names and sizes only; file contents are not extracted in this version. A formatted image with no files shows an empty tree, while unknown or unreadable images show an error on the root item instead of a fake directory tree.

If the image is not recognized
------------------------------

When a binary is not a filesystem, the explorer identifies what it is instead of reporting a generic failure:

* **Application or bootloader image**: ``build/<project>.bin`` is your application, not a data partition. For a project named ``spiffs``, ``build/spiffs.bin`` is the application image and cannot be browsed.
* **Partition table binary**: ``build/partition_table/partition-table.bin`` describes the flash layout, not filesystem contents. Use **Device Partition Explorer** to browse the layout.
* **ELF file** or an **erased partition** (all bytes ``0xFF``, meaning no filesystem has been written yet).

A filesystem image is only produced at build time when the project asks for one, for example with ``spiffs_create_partition_image``, ``littlefs_create_partition_image``, or ``fatfs_create_spiflash_image`` in a ``CMakeLists.txt``. Such images are written to the build folder under the partition name, typically ``build/storage.bin``.

If your application creates or formats the filesystem on the device at runtime (for instance mounting SPIFFS with ``format_if_mount_failed``), no image exists on the host. In that case open **Device Partition Explorer**, select the data partition, and choose **Explore filesystem** to read it from the device first.

Make sure the extension is configured as shown in :ref:`Install ESP-IDF and Tools <installation>` documentation. FAT listing in particular requires a configured ESP-IDF environment.
