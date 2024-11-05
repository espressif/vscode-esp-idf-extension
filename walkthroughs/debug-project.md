# Debugging Your ESP-IDF Project

Learn how to debug your ESP-IDF applications using VS Code's powerful debugging features. This guide assumes you have compatible hardware with JTAG capabilities or an external debugging tool.

### Starting a Debug Session

1. **Debug Options:**
   - Click the "Debug" icon from the status bar
   
        !["Debug Project"](../media/walkthrough/icons/debug.png)
   
   - Or use F5 keyboard shortcut

2. **Debug Preparation:**
   - Ensure OpenOCD is configured correctly
   - Verify JTAG connections
   - Check debug adapter settings in `launch.json`

### Key Debugging Features

1. **Breakpoints:**
   - Click line number gutter to set/remove breakpoints
   - Right-click for conditional breakpoints
   - Use the Breakpoints panel to manage all breakpoints

2. **Variable Inspection:**
   - Watch specific variables
   - Hover over variables while debugging
   - Use the Variables panel for detailed view

3. **Memory Analysis:**
   - View memory contents in hex/ascii
   - Monitor stack usage
   - Analyze heap allocation

4. **Advanced Features:**
   - Core dump analysis
   - Thread viewing and switching
   - Call stack navigation
   - Register inspection via Peripheral Viewer

### Common Issues

- **Connection Problems:**
  - Verify JTAG cable connections
  - Check OpenOCD configuration
  - Ensure correct port permissions

## Next Steps

Once you've learned how to start debugging:

- Explore our [Debug Your Project](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/debugproject.html) documentation