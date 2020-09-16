# Partition Table Editor UI for ESP-IDF

Our VS Code Extension comes with UI for editing your [partition table](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/partition-tables.html) and flash it to your chip, instead of dealing with csv files we present you with comfortable UI where you can edit the existing partition table or create a new one of your choosing.

## Prerequisites

- ESP-IDF `>=v4.x`
- IDF VSCode extension version `>=0.5.0`
- We assume that you have built your project already and ready to edit the generated partition table directly from the partition binary file.
- ESP Wrover Kit (optional for flashing the modified partition table)

## Steps

- Once you have built the project, right click on the `partition-table.bin` file, _same can be located in the `build/partition_table` directory_
- Select `Open Partition Table Editor` from the context menu
- Once the editor is opened, now the table will show you already filled partition table
- You can now edit the existing rows or add new rows of your choosing.
- Once you're satisfied press `Save` to save the changes made by you, _this will save the partition table as binary format_
- Now you can click the `Flash` button on the top-right, to just flash the partition table to the chip.

## Screenshot

![Partition Table Editor UI](../media/screenshots/partition_table_editor.png)

---

> If you find any of the data/graph/tables represent wrong data points please help us correct/improve the same by [reporting bugs here](http://github.com/espressif/vscode-esp-idf-extension/issues)
