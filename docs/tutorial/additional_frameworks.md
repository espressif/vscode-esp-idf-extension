# Additional frameworks in this extension

Besides ESP-IDF, you can install other frameworks to extend the extension functionality. Please look at [HARDWARE Support](../HARDWARE_SUPPORT.md) for a list of supported frameworks and Espressif chips supported.

To use [Espressif Audio Development Framework (ESP-ADF)](https://github.com/espressif/esp-adf) with this extension use the **Install ESP-ADF** command, which will clone ESP-ADF to the selected directory and set `idf.espAdfPath` (`idf.espAdfPathWin` in Windows) configuration setting.

To use [Espressif Mesh Development Framework (ESP-MDF)](https://github.com/espressif/esp-mdf) with this extension use the **Install ESP-MDF** command, which will clone ESP-MDF to the selected directory and set `idf.espMdfPath` (`idf.espMdfPathWin` in Windows) configuration setting.

You can also just set each configuration setting with the framework directory path if you already have them. For example, on Visual Studio Code menu `View` -> `Command Palette..`. -> type `Preferences: Open Settings (UI)` and search for ESP-ADF to manually set this path.

> **NOTE:** Please review [ESP-IDF Settings](../SETTINGS.md) to see how to modify these configuration settings.

After configuring these framework, you can see their examples with the **ESP-IDF: Show Examples Projects** and they will be used by other extensions commands like `Build project`.

## Others

- **Add Arduino-ESP32 as ESP-IDF Component** extension command will clone [Arduino-ESP32](https://github.com/espressif/arduino-esp32) and use it as a [ESP-IDF component](https://github.com/espressif/arduino-esp32/blob/master/docs/esp-idf_component.md) in your current directory.
- Can also use **Create ESP-IDF project** command with `arduino-as-component` template to create a new project with arduino as a [ESP-IDF component](https://github.com/espressif/arduino-esp32/blob/master/docs/esp-idf_component.md).

You should check the [Arduino-ESP32](https://github.com/espressif/arduino-esp32) repository for more information about using this arduino libraries as esp-idf component. This is not an arduino extension.
