# Setting Up Your ESP-IDF Project

### 1. Set Target Device

1. Click the "Set Espressif Device Target" icon from the status bar !["Set Espressif Device Target"](../../media/walkthrough/icons/device-target.png) or use the "ESP-IDF: Set Espressif Device Target" command
   

2. Choose your target (e.g., esp32, esp32s2, esp32c3) from the list of targets

### 2. Configure Project Settings (not needed in our example)

1. Open ESP-IDF Configuration editor (menuconfig):
   - Use the "ESP-IDF: SDK Configuration Editor(Menuconfig)" command
   - Or click the "SDK Configuration editor" icon from the status bar !["SDK Configuration editor"](../../media/walkthrough/icons/sdkconfig.png)


> 💡 **Tip**: For a comprehensive list of available configuration options, check the [ESP-IDF Configuration Options Reference](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/kconfig.html#configuration-options-reference)

### 3. Serial Port Setup

1. Connect your ESP device to your computer
2. Select the correct serial port:
   - Click the "Select Port to Use" icon from VS Code's status bar
   !["Select Port to Use"](../../media/walkthrough/icons/port.png)

   - Or use "ESP-IDF: Select Port to Use" command

### 4. Set Flashing Method (UART recommended for simplicity)

- Use the "ESP-IDF: Select Flash Method" command
- Or click the "Select Flash Method" icon from the status bar !["Select Flash Method"](../../media/walkthrough/icons/flash-method.png)

## Related Resources

For more in depth information about connecting your device and setting up the project, check out our documentation:
- [Connect Your Device](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/connectdevice.html)
- [Configure Your Project](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/configureproject.html)
