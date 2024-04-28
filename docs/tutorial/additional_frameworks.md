# Additional Frameworks in this Extension

> **NOTE:** Consider that if you are using other Espressif frameworks for your projects, not all ESP-IDF versions are compatible with an specific framework. For example, ESP-ADF might not work with the current ESP-IDF master branch. It is recommended that you configure the extension to use the ESP-IDF within the framework (most frameworks include compatible ESP-IDF as subdirectory) in the setup wizard or JSON Configuration as shown in [SETUP](../SETUP.md) documentation or [Install](./install.md) tutorial.

Besides ESP-IDF, you can install other frameworks to extend the extension functionality. Please look at [HARDWARE Support](../HARDWARE_SUPPORT.md) for a list of supported frameworks and Espressif chips.

1. [Espressif Audio Development Framework (ESP-ADF)](https://github.com/espressif/esp-adf) with this extension using the **Install ESP-ADF** command, which will clone ESP-ADF to the selected directory and set `idf.espAdfPath` (`idf.espAdfPathWin` in Windows) configuration setting.

2. [Espressif Mesh Development Framework (ESP-MDF)](https://github.com/espressif/esp-mdf) with this extension using the **Install ESP-MDF** command, which will clone ESP-MDF to the selected directory and set `idf.espMdfPath` (`idf.espMdfPathWin` in Windows) configuration setting.

3. [Espressif Matter Framework (ESP-Matter)](https://github.com/espressif/esp-matter) with this extension using the **Install ESP-Matter** command, which will clone ESP-Matter to the selected directory and set `idf.espMatterPath` configuration setting. The **ESP-IDF: Set ESP-MATTER Device Path (ESP_MATTER_DEVICE_PATH)** is used to define the device path for ESP-Matter. **ESP-Matter is Not Supported in Windows**.

4. [Espressif Rainmaker](https://github.com/espressif/esp-rainmaker) can be clone with the **ESP-IDF: Install ESP-Rainmaker** to a selected and set `idf.espRainmakerPath` (`idf.espRainmakerPathWin` in Windows) configuration setting.

5. [ESP-HomeKit-SDK](https://github.com/espressif/esp-homekit-sdk) can be clone with the **Install ESP-HomeKit-SDK** command to the selected directory and set `idf.espHomeKitSdkPath` (`idf.espHomeKitSdkPathWin` in Windows) configuration setting.

> **NOTE:** You can also just set each configuration setting with the framework directory path if you already have them. For example, on Visual Studio Code menu `View` -> `Command Palette..`. -> type `Preferences: Open Settings (UI)` and search for ESP-ADF (or other framework) to manually set this path.

> **NOTE:** Please review [ESP-IDF Settings](../SETTINGS.md) to see how to modify these configuration settings.

After configuring these framework, you can see their examples with the **ESP-IDF: Show Examples Projects** and they will be used by other extensions commands like `Build project`.

## Others

4. **Add Arduino-ESP32 as ESP-IDF Component** extension command will clone [Arduino-ESP32](https://github.com/espressif/arduino-esp32) and use it as a [ESP-IDF Component](https://github.com/espressif/arduino-esp32/blob/master/docs/esp-idf_component.md) in your current directory. You should check the [Arduino-ESP32](https://github.com/espressif/arduino-esp32) repository for more information about using arduino libraries as ESP-IDF component.

Can also use **Create ESP-IDF Project** command with `arduino-as-component` template to create a new project with arduino as a [ESP-IDF Component](https://github.com/espressif/arduino-esp32/blob/master/docs/esp-idf_component.md).
