EFuse Explorer
========================

This feature requires ESP-IDF ``>=v4.3``.

Espressif chips has a number of eFuses which can store system and user parameters. Each eFuse is a one-bit field which can be programmed to 1 after which it cannot be reverted back to 0. This feature is based on ESP-IDF `espfuse.py <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/efuse.html#espefuse-py>`_ script to read and write efuses.

1. Select the Serial Port:

- Navigate to **View** > **Command Palette**.

- Type **ESP-IDF: Select Port to Use** and select the command to specify the serial port of your device.

2. Click the ``ESP-IDF Explorer`` in the `Visual Studio Code Activity bar <https://code.visualstudio.com/docs/getstarted/userinterface>`_. On the ``EFUSE EXPLORER`` section, click the ``Connect your Board First``.

.. image:: ../../../media/tutorials/efuse/efuse_connect.png

3. A list of EFuses categories will now be shown in a tree structure.

.. image:: ../../../media/tutorials/efuse/efuse_list.png

4. If you click on any category, the user will see the category Efuses and Values.

.. image:: ../../../media/tutorials/efuse/efuse_expanded.png