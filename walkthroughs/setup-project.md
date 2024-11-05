# Setting Up Your ESP-IDF Project

Before you can build and flash your project, you'll need to configure several important settings. Follow these steps to properly set up your development environment.

### 1. Set Target Device
First, specify which ESP chip you're developing for:

1. Click the "Set Espressif Device Target" icon from the status bar or use the "ESP-IDF: Set Espressif Device Target" command from Command Palette

   !["Set Espressif Device Target"](../media/walkthrough/icons/device-target.png)

2. Choose your target (e.g., esp32, esp32s2, esp32c3) from the list of targets
3. The extension will automatically adjust settings for your selected target

### 2. Configure Project Settings (not needed in our example)
Next, configure your project-specific settings:

1. Open ESP-IDF Configuration editor (menuconfig):
   - Use the "ESP-IDF: SDK Configuration Editor(Menuconfig)" command from Command Palette
   - Or click the "SDK Configuration editor" icon from the status bar

      !["SDK Configuration editor"](../media/walkthrough/icons/sdkconfig.png)

> 💡 **Tip**: For a comprehensive list of available configuration options, check the [ESP-IDF Configuration Options Reference](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/kconfig.html#configuration-options-reference)

### 3. Serial Port Setup
Configure your serial connection:

1. Connect your ESP device to your computer
2. Select the correct serial port:
   - Click the "Select Port to Use" icon from the status bar
   
      !["Select Port to Use"](../media/walkthrough/icons/port.png)

   - Or use "ESP-IDF: Select Port to Use" command from Command Palette

### 4. Set Flashing Method (UART recommended for simplicity)
Finally, select the flashing method you want to use:

- Use the "ESP-IDF: Select Flash Method" command from Command Palette
- Or click the "Select Flash Method" icon from the status bar

   !["Select Flash Method"](../media/walkthrough/icons/flash-method.png)

## Next Steps

For more in depth information about connecting your device and setting up the project, check out our documentation:
- [Connect Your Device](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/connectdevice.html)
- [Configure Your Project](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/configureproject.html)

Once you've completed these setup steps, you're ready to:
- Build your project
- Flash it to your device
- Monitor the device output