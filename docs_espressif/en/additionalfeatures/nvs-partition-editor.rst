NVS Partition Editor
====================

:link_to_translation:`zh_CN:[中文]`

The ``ESP-IDF: Open NVS Partition Editor`` command allows you to create a NVS partition binary file based on key-value pairs in a CSV file.

The resulting binary file is compatible with the NVS architecture defined in `ESP-IDF Non-Volatile Storage Library <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_flash.html>`_.

The expected CSV format is as follows:

.. code-block::

    key,type,encoding,value     <-- column header (must be the first line)
    namespace_name,namespace,,  <-- First entry must be of type "namespace"
    key1,data,u8,1
    key2,file,string,/path/to/file

1.  Go to ``View`` > ``Command Palette``.
2.  Type ``ESP-IDF: Open NVS Partition Editor`` and select the command to create a new file or right-click an existing partition table CSV file.
3.  If creating a new file, choose the file name. It will be created in the current editor directory.

    .. note::

        Ensure the first two lines of the existing CSV file match the expected CSV format above.

4.  Make desired changes to CSV file.

    .. note::

        Ensure the partition size is sufficient for the inserted data.

    .. image:: ../../../media/tutorials/nvs/nvs_partition_editor.png

5.  Save the CSV data. The first save will create the CSV file.
6.  (OPTIONAL) Enable encryption of the binary. If encryption is enabled, you can disable the generate key option to use your own key. In this case, set the key's absolute path.
7.  Generate the partition binary.

This feature is based on ESP-IDF `NVS Partition Generator Utility <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_partition_gen.html>`_.

Make sure the extension is configured as shown in :ref:`Install ESP-IDF and Tools <installation>` documentation for this feature to work properly.
