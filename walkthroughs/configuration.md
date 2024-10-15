# Configure the ESP-IDF VS Code Extension

### 1. Install Prerequisites (macOS and Linux only)
Follow the steps in our [ESP-IDF installation documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/linux-macos-setup.html#step-1-install-prerequisites) for a quick and simple process.

### 2. Select Setup Mode
Choose the Express setup mode (recommended).
![Express Setup Mode selection](../media/walkthrough/express-setup.png)

### 3. Choose ESP-IDF Version
Expend dropdown menu and select an ESP-IDF version.

![ESP-IDF Version selection](../media/walkthrough/idf-version.png)

### 4. Set Python Path (macOS and Linux only)
Choose the appropriate Python path from the dropdown.

![Python Path selection](../media/walkthrough/python-selection.png)

### 5. Install
Click the Install button to begin the installation process.

![Start Installation](../media/walkthrough/install-btn.png)

### 6. Post-Installation Step (Linux only)
After installation, run the following command in your preferred terminal:
```
sudo cp --update=none /home/hmp/.espressif/tools/openocd-esp32/v0.12.0-esp32-20240318/openocd-esp32/share/openocd/contrib/60-openocd.rules /etc/udev/rules.d
```

## Next Steps

Once configuration is complete, you're ready to start developing with ESP-IDF in VS Code. You can now:
- Create a new project
- Open an existing ESP-IDF project
- Build, flash, and monitor your ESP device directly from VS Code