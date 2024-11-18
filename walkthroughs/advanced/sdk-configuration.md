# Configuring Your Project with menuconfig

## Opening SDK Configuration
![Menuconfig Interface](../media/walkthrough/menuconfig.gif)

1. Click the menuconfig icon in status bar
   - Or use Command Palette: "ESP-IDF: SDK Configuration Editor"

## Key Features

### Common Configurations
- Component configuration
- Compiler options
- Flash and partition settings
- Serial port parameters

💡 **Tip**: Use search bar to quickly find settings

## Troubleshooting

1. **Editor Won't Open**
   - Check Python installation
   - Verify ESP-IDF environment
   - Run [Doctor Command](command:espIdf.doctorCommand)

2. **Changes Not Saving**
   - Save before closing
   - Check write permissions
   - Verify sdkconfig file location

Need help? Check:
- [Configure Your Project](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/configureproject.html)
- [Project Configuration Editor](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/additionalfeatures/project-configuration.html)
- [ESP-IDF Configuration documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/kconfig-reference.html)