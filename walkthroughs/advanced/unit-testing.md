# Unit Testing with ESP-IDF

Learn how to use Unity-based unit testing in your ESP-IDF projects directly from VS Code.

## Features
- Automatic test discovery from your project's components
- Visual test runner integration in VS Code's Testing tab
- PyTest-based test execution with detailed results
- Support for both CMake and legacy Make build systems

![GIF about Unit Testing](../../media/walkthrough/gifs/unit-testing.gif)

## Try it yourself

1. Install the testing requirements:
   - Open Command Palette (Ctrl+Shift+P)
   - Type "ESP-IDF Unit Test: Install ESP-IDF PyTest requirements"
   - Wait for the installation to complete

2. Add tests to your component:
   - Create a `test` directory in your component folder
   - Add test files following the pattern `test_*.c`
   - Use the Unity test framework:
   ```c
   TEST_CASE("my test name", "[my_component]")
   {
       // Your test code here
   }
   ```

3. Run your tests:
   - Open the Testing tab in the Activity Bar
   - Click the Run Test button next to any test
   - View results directly in VS Code

## Related Resources
- [Unit Testing with Unity Documentation](https://docs.espressif.com/projects/vscode-esp-idf-extension/en/latest/additionalfeatures/unit-testing.html)
- [ESP-IDF Unit Testing in ESP32 Documentation](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/unit-tests.html)
- Example: ESP-IDF unit_test project