# Configure the ESP-IDF VS Code Extension

### 1. Select Setup Mode
Choose the Express setup mode (recommended).
![Express Setup Mode selection](../../media/walkthrough/express-setup.png)

### 2. Choose ESP-IDF Version
Expand dropdown menu and select an ESP-IDF version.

![ESP-IDF Version selection](../../media/walkthrough/idf-version.png)

### 3. Set Python Path (macOS and Linux only)
Choose the appropriate Python path from the dropdown.

![Python Path selection](../../media/walkthrough/python-selection.png)

### 4. Install
Click the Install button to begin the installation process.

![Start Installation](../../media/walkthrough/install-btn.png)

### 5. Post-Installation Step (Linux only)
After installation, run the following command in your preferred terminal:
```
sudo cp --update=none /home/hmp/.espressif/tools/openocd-esp32/v0.12.0-esp32-20240318/openocd-esp32/share/openocd/contrib/60-openocd.rules /etc/udev/rules.d
```

## Related Resources

In case you get stuck, you can always follow the in depth [Installation](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/installation.html) documentation.