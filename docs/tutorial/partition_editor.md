# Using the partition editor

Let's open a ESP-IDF project. For this tutorial we will use the `system/console` example.

1. Click menu View -> Command Palette... and search for the **ESP-IDF: Show Examples Projects** command and choose `Use current ESP-IDF (/path/to/esp-idf)`. If the user doesn't see the option, please review the setup in [Install tutorial](./install.md).

2. A window will be open with a list a projects, go the **system** section and choose the `console`. You will see a **Create project using example console** button in the top and a description of the project below. Click the button and choose the containing directory. The project will be opened in a new window.

<p>
  <img src="../../media/tutorials/partition_table/console-example.png" alt="System console example" height="500">
</p>

3. Click menu View -> Command Palette... and search for the **ESP-IDF: SDK Configuration editor** command (<kbd>CTRL</kbd> <kbd>E</kbd> <kbd>G</kbd> keyboard shortcut ).

<p>
  <img src="../../media/tutorials/partition_table/sdkconfig.png" alt="SDK Configuration editor">
</p>

4. Search for `partition_table_custom` and select `Custom partition table CSV` from Partition Table and set the filename. It will search this file in your current project directory. (This is already configured in the example we are using.)

<p>
  <img src="../../media/tutorials/partition_table/partition_table_custom.png" alt="Custom partition table" height="500">
</p>

5. If the partition table file doesn't exists, when you execute the command the file will be created. But if the partition table file already exists, make sure that the first two lines of the partion table csv file are:

```
# ESP-IDF Partition Table
# Name, Type, SubType, Offset, Size, Flag
```

6. Once partition table editor is open, the user can edit the partition table as desired. For more information please refer to [this article](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/partition-tables.html).

<p>
  <img src="../../media/tutorials/partition_table/partition_editor.png" alt="Partition table editor" height="500">
</p>

7. Once the user is satisfied press `Save` to save the changes, _this will override the content of csv file_.

8. Now you can click the `Select Flash Method, Build, Flash` right top buttons in order to finish flashing the partition table to the chip.
