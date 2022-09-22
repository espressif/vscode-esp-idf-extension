# Current chips supported in this extension

[ESP32](https://www.espressif.com/en/products/socs/esp32-s2)
[ESP32-S2](https://www.espressif.com/en/products/socs/esp32-s2)
[ESP32-S3](https://www.espressif.com/en/products/socs/esp32-s3)
[ESP32-C3](https://www.espressif.com/en/products/socs/esp32-c3)

In addition to ESP-IDF chips, there are several boards configurations files implemented for OpenOCD. The `idf.openOcdConfigs` configuration setting is used by this extension to set OpenOCD Configuration files for the OpenOCD server executed within the extension. Here is more information about [OpenOCD Configuration targets](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target).

# Current frameworks supported in the extension

- [Arduino-ESP32](https://github.com/espressif/arduino-esp32) allows the user to add Arduino libraries as a ESP-IDF component in your current directory to use Arduino code in your ESP-IDF projects with the **Add Arduino-ESP32 as ESP-IDF Component** extension command.

- [Espressif Audio Development Framework (ESP-ADF)](https://github.com/espressif/esp-adf) is the official audio development framework for the ESP32 and ESP32-S2 SoCs. The **Install ESP-ADF** will clone ESP-ADF to a selected directory and set `idf.espAdfPath` (`idf.espAdfPathWin` in Windows) configuration setting.

- [Espressif Mesh Development Framework (ESP-MDF)](https://github.com/espressif/esp-mdf) to develop with the [ESP-WIFI-MESH](https://docs.espressif.com/projects/esp-idf/en/stable/api-guides/mesh.html) networking protocol. The **Install ESP-MDF** will clone ESP-MDF to a selected directory and set `idf.espMdfPath` (`idf.espMdfPathWin` in Windows) configuration setting.

- [Espressif Matter Framework (ESP-Matter)](https://github.com/espressif/esp-matter) to develop with the [Matter](https://buildwithmatter.com/) unified IP-based connectivity protocol. The **Install ESP-Matter** will clone ESP-Matter to a selected directory and set `idf.espMatterPath` (`idf.espMatterPathWin` in Windows) configuration setting.

> **NOTE:** Consider that if you are using other Espressif frameworks for your projects, not all ESP-IDF versions are compatible with an specific framework. For example, ESP-ADF might not work with the current ESP-IDF master branch. It is recommended that you configure the extension to use the ESP-IDF within the framework (most frameworks include compatible ESP-IDF as subdirectory) in the setup wizard or JSON Configuration as shown in [SETUP](./SETUP.md) documentation or [Install](./tutorial/install.md) tutorial.