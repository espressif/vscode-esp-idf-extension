# NVS Partition Editor UI for ESP-IDF

Our VS Code Extension comes with UI to creates a binary file based on key-value pairs provided in a CSV file. The resulting binary file is compatible with NVS architecture defined in [ESP_IDF Non Volatile Storage](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_flash.html). The expected CSV format is:

```
key,type,encoding,value     <-- column header (must be the first line)
namespace_name,namespace,,  <-- First entry must be of type "namespace"
key1,data,u8,1
key2,file,string,/path/to/file
```

This is based on ESP-IDF [NVS Partition Generator Utility](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_partition_gen.html). Make sure `idf.espIdfPath` configuration setting is defined for this to work properly.

## Prerequisites

- ESP-IDF `>=v4.x`
- IDF VSCode extension version `>=0.6.0`

## Steps

- Press F1 -> `Type ESP-IDF: Open NVS Partition Editor` (to create a new file) or right click an existing CSV file.
- If creating a new file, choose the name of the file. It will be created in the current editor directory.
- Make desire changes to CSV data.
- Save the CSV data (First time will create the csv file).
- Generate the partition binary (Choose encrypt to encrypt the binary and disable the generate key option to use your own key if desired).
