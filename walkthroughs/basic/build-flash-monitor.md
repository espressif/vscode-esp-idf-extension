# Building, Flashing, and Monitoring Your ESP-IDF Project

Learn how to compile your code, flash it to your device, and monitor the output. You can perform these operations individually or all at once.

### Building Your Project

1. **Build Options:**
   - Click the "Build Project" icon from the status bar

        !["Build Project"](../../media/walkthrough/icons/build.png)

   - Use Command Palette: "ESP-IDF: Build your Project"
   - Use keyboard shortcut (if configured)

2. **Build Process:**
   - The extension will compile your code
   - Output appears in the terminal

### Flashing to Device

1. **Prerequisites:**
   - Ensure device is connected
   - Correct port is selected

2. **Flash Options:**
   - Click "Flash Device" icon from the status bar

        !["Flash Device"](../../media/walkthrough/icons/flash.png)

   - Use Command Palette: "ESP-IDF: Flash (UART) your Project"

### Monitoring Output

1. **Monitor Options:**
   - Click "Monitor Device" icon from the status bar

        !["Monitor Device"](../../media/walkthrough/icons/monitor.png)

   - Use Command Palette: "ESP-IDF: Monitor Device"

2. **Monitor Features:**
   - View device output in real-time
   - Send commands through UART

### All-in-One Operation

The most convenient way is using "Build, Flash and Monitor":
1. Click the "Build, Flash and Monitor" icon from the status bar

    !["Build, Flash and Monitor"](../../media/walkthrough/icons/build-flash-monitor.png)

2. Or use Command Palette: "ESP-IDF: Build, Flash and Start a Monitor on your Device"
3. The extension will:
   - Build your project
   - Flash the binary
   - Start the monitor automatically

### Common Issues

- **Build Failures:**
  - Check error messages in terminal

- **Flash Issues:**
  - Verify correct port selection
  - Check device connection
  - Ensure device is in correct mode

- **Monitor Problems:**
  - Ensure no other program is using the port

## Next Steps

For more in depth information about building, flashing and monitoring check out our documentation:
- [Build the Project](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/buildproject.html)
- [Flash onto the Device](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/flashdevice.html)
- [Monitor the Output](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/monitoroutput.html)

After successfully building, flashing, and monitoring your project:
- Experiment with project's code and re-build and re-flash the project
- Debug your application if needed
- Explore more advanced features