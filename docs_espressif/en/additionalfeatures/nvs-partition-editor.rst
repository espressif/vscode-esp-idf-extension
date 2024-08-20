NVS Partition Editor
=========================

The **ESP-IDF: Open NVS Partition Editor** allows you to create a NVS partition binary file based on key-value pairs in CSV file. 

The resulting binary file is compatible with NVS architecture defined in `ESP-IDF Non Volatile Storage <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_flash.html>`_.

The expected CSV format is:

.. code-block::

  key,type,encoding,value     <-- column header (must be the first line)
  namespace_name,namespace,,  <-- First entry must be of type "namespace"
  key1,data,u8,1
  key2,file,string,/path/to/file

1. Click menu **View** > **Command Palette...** 
2. Type **ESP-IDF: Open NVS Partition Editor** and select the command (to create a new file) or right click an existing partition table CSV file.

3. If creating a new file, choose the name of the file. It will be created in the current editor directory.

.. note::
  Make sure first 2 lines of existing CSV file are as shown in expected CSV format above.

4. Make desired changes to CSV file.

.. note::
  Make sure that the size of partition is enough for inserted data.

.. image:: ../../../media/tutorials/nvs/nvs_partition_editor.png

5. Save the CSV data (First time will create the CSV file).

6. (OPTIONAL) Enable encryption of the binary. If encrypt is enable, can disable the generate key option to use your own key if desired, in which case you need to set the key absolute path.

7. Generate the partition binary.

This feature is based on ESP-IDF `NVS Partition Generator Utility <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_partition_gen.html>`_.

Make sure extension is configured as shown in :ref:`Install ESP-IDF and Tools <installation>` documentation for this feature to work properly.
