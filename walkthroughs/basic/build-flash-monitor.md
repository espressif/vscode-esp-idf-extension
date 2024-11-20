# Building, Flashing, and Monitoring Your ESP-IDF Project

### Building Your Project
  Click the "Build Project" icon from the status barn !["Build Project"](../../media/walkthrough/icons/build.png) or use command `ESP-IDF: Build your Project`

### Flashing to Device
Before flashing, make sure your device is connected and you've selected the correct port
  Click "Flash Device" icon from the status bar !["Flash Device"](../../media/walkthrough/icons/flash.png) or use the command `ESP-IDF: Flash (UART) your Project`

### Monitoring Output
 Click "Monitor Device" icon from the status bar !["Monitor Device"](../../media/walkthrough/icons/monitor.png) or use the command `ESP-IDF: Monitor Device`

### All-in-One Operation

The most convenient way is using "Build, Flash and Monitor":
* Click the "Build, Flash and Monitor" icon from the status bar !["Build, Flash and Monitor"](../../media/walkthrough/icons/build-flash-monitor.png) or use the command `ESP-IDF: Build, Flash and Start a Monitor on your Device`

### Common Issues

- **Build Failures:**
  - Check error messages in terminal

- **Flash Issues:**
  - Verify correct port selection
  - Check device connection
  - Ensure device is in correct mode

- **Monitor Problems:**
  - Ensure no other program is using the port

## Related Resources

For more in depth information about building, flashing and monitoring check out our documentation:
- [Build the Project](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/buildproject.html)
- [Flash onto the Device](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/flashdevice.html)
- [Monitor the Output](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/monitoroutput.html)