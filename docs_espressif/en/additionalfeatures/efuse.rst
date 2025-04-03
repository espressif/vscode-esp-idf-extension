eFuse Explorer
==============

:link_to_translation:`zh_CN:[中文]`

This feature requires ESP-IDF ``>=v4.3``.

Espressif chips have several eFuses that store system and user parameters. Each eFuse is a one-bit field that can be programmed to 1 and cannot be reverted to 0. This feature uses the ESP-IDF `espfuse.py <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/efuse.html#espefuse-py>`_ script to read and write eFuses.

1.  Select the Serial Port:

    - Navigate to ``View`` > ``Command Palette``.
    - Type ``ESP-IDF: Select Port to Use`` and select the command to specify your device's serial port.

2.  Click ``ESP-IDF: Explorer`` in the Visual Studio Code activity bar. In the ``eFuse Explorer`` section, click ``Connect your Board First``.

    .. image:: ../../../media/tutorials/efuse/efuse_connect.png

3.  A list of eFuse categories appears in a tree structure.

    .. image:: ../../../media/tutorials/efuse/efuse_list.png

4.  Click any category to view the eFuses and their values.

    .. image:: ../../../media/tutorials/efuse/efuse_expanded.png
