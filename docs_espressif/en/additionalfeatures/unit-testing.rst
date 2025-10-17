.. _unit testing:

ESP-IDF Unit testing with Unity
===================================

When you are developing an application using ESP-IDF and you are considering adding unit testing for your components functions, this extension can help to discover and execute tests on your device based on Unity as described in `Unit Testing in ESP32 <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/unit-tests.html>`_ documentation.

The extension explores tests in your current project workspace folders that follow the convension in the former documentation, this is, all tests files that follow the glob pattern specified in the **idf.unitTestFilePattern** configuration setting (default: ``**/test/test_*.c``) in your current workspace folders. The tests cases are parsed with the ``TEST_CASE\\(\"(.*)\",\\s*\"(.*)\"\\)`` regular expression matching the following test file format:

.. code-block:: C

  TEST_CASE("test name", "[module name]")
  {
          // Add test here
  }


Configure the ESP-IDF Project to enable unit tests in the extension
-------------------------------------------------------------------------

Let's say you have a ESP-IDF project with the following structure:

.. code-block::

  unit_test
    - components                              - Components of the application project
      - testable
        - include
        - test                                - Test directory of the component
          * component.mk / CMakeLists.txt     - Component makefile of tests
          * test_mean.c                       - Test source file
        * component.mk / CMakeLists.txt       - Component makefile
        * mean.c                              - Component source file


Inside the ``testable`` component, unit tests are added into ``test`` directory. ``test`` directory contains source files of the tests and the component makefile (component.mk / CMakeLists.txt).

If you want to add tests for a ``testable`` component, just need to define a ``test`` subdirectory and add ``test_name.c`` files with the different test cases to run.

This is the structure from the `ESP-IDF unit_test example <https://github.com/espressif/esp-idf/tree/master/examples/system/unit_test>`_ which can serve as reference.

.. note::
  You can customize the test file discovery pattern by modifying the **idf.unitTestFilePattern** setting in your VS Code settings. This allows you to use different naming conventions or directory structures for your test files.

Running the tests
--------------------------------------------

When you click on the Testing Tab in the `Visual Studio Code Activity bar <https://code.visualstudio.com/docs/getstarted/userinterface>`_, the extension will try to find all test files and test cases and save the list of test components to add later in step 3.

When it press the run button on a test, it will configure the current project before the tests as follows:

1. Copy the unity-app from the extension template and add the test components to the main CMakeLists.txt ``TEST_COMPONENTS`` cmake variable. The extension unity-app is a basic ESP-IDF application with a unity menu that will be built and flashed on the current **idf.port** serial device with all test cases that were found during exploration step.

2. Build and flash the unity-app to the device.

.. note::
  You can also create, build and flash the unity test application using the **ESP-IDF Unit Test: Build Unit Test App** and **ESP-IDF Unit Test: Flash Unit Test App** extension commands respectively, which will copy build and flash to your device the generated unit testing application.

3. Capture the serial output from the device and parse the test results to show them in the ``Testing`` tab. The output from serial port is also shown in the ``ESP-IDF`` output channel.

4. You can refresh the tests and build the unity-app again with the ``Refresh Tests`` button from the ``Testing`` tab.
