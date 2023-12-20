# EFuse Explorer

This feature requires ESP-IDF `>=v4.3`.

Espressif chips has a number of eFuses which can store system and user parameters. Each eFuse is a one-bit field which can be programmed to 1 after which it cannot be reverted back to 0. This feature is based on ESP-IDF [espfuse.py](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/efuse.html#espefuse-py) script to read and write efuses.

1. Make sure your board is connected and select the serial port using the **ESP-IDF: Select Port to Use** command.

2. Click the `ESP-IDF Explorer` in the [Activity bar](https://code.visualstudio.com/docs/getstarted/userinterface). On the `EFUSE EXPLORER` section, click the `Connect your Board First`.

<p>
  <img src="../../media/tutorials/efuse/efuse_connect.png" alt="eFuse Explorer connect" height="300">
</p>

3. A list of EFuses categories will now be shown in a tree structure.

<p>
  <img src="../../media/tutorials/efuse/efuse_list.png" alt="eFuse Explorer list" height="300">
</p>

4. If you click on any category, the user will see the category Efuses and Values.

<p>
  <img src="../../media/tutorials/efuse/efuse_expanded.png" alt="eFuse Explorer expanded"  height="300">
</p>
