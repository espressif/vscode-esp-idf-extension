# Troubleshooting ESP-IDF Projects

Learn how to diagnose and resolve common issues with ESP-IDF development in VS Code.

### Debug Logging Configuration

1. **OpenOCD Debug Level:**
    - Open VS Code settings
    - Set `idf.openOcdDebugLevel` to 4 or higher
        - Reveals detailed OpenOCD server output

2. **Debug Adapter Logging:**
   - Open project's `.vscode/launch.json`
   - Set `logLevel` to 3 or higher
        - Provides additional debug adapter information

### Diagnostic Tools

1. **ESP-IDF Output Panel:**
   - View > Output > ESP-IDF
   - Shows real-time extension activity
   - Useful for tracking command execution

2. **Doctor Command:**
   - Run "ESP-IDF: Doctor Command" from Command Palette
   - Generates environment configuration report
   - Automatically copies to clipboard
   
3. **Extension Logs:**

   Windows location:

   >%USERPROFILE%.vscode\extensions\espressif.esp-idf-extension-VERSION\esp_idf_vsc_ext.log

   MacOS/Linux location:

   >$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/esp_idf_vsc_ext.log

### Common Issues

1. **Settings Hierarchy:**
- Check settings at all levels:
  - Global (User Settings)
  - Workspace
  - Workspace Folder
- Doctor Command shows active settings

2. **Python Package Issues:**
- Use "ESP-IDF: Install ESP-IDF Extension Python Packages"
    - Reinstalls required packages
    - Updates both ESP-IDF and extension packages

3. **Windows-Specific:**
- Enable Developer Mode for symlink issues
    - Helps with ESP-IDF git cloning
    - Resolves permission-related errors

### Getting Help

1. **OpenOCD Issues:**
- Review [OpenOCD troubleshooting FAQ](https://github.com/espressif/openocd-esp32/wiki/Troubleshooting-FAQ)
- Check application tracing
- Verify debug configuration

2. **Developer Tools:**
- Help > Toggle Developer Tools
- Check Console tab for errors
- Copy relevant error messages

3. **Community Support:**
- Search [existing issues](http://github.com/espressif/vscode-esp-idf-extension/issues)
- Open [new issue](https://github.com/espressif/vscode-esp-idf-extension/issues/new/choose)
- Include Doctor Command output

## Next steps

For more information:

- Explore our [Troubleshooting](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/troubleshooting.html) documentation