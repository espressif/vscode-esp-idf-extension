.. _unit testing:

ESP-IDF Unit testing with Unity
===================================

When you are developing an application using ESP-IDF and you are considering adding unit testing for your components functions, this extension can help to discover and execute tests on your device based on Unity as described in `Unit Testing in ESP32 <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/unit-tests.html>`_ documentation.

The extension explores tests in your current project workspace folders that follow the convension in the former documentation, this is, all tests files that follow ``**/test/test_*.c`` glob pattern in your current workspace folders. The tests cases are parsed with the ``TEST_CASE\\(\"(.*)\",\\s*\"(.*)\"\\)`` regular expression matching the following test file format:

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

Running the tests
--------------------------------------------

When you click on the Testing Tab in the `Visual Studio Code Activity bar <https://code.visualstudio.com/docs/getstarted/userinterface>`_, the extension will try to find all test files and test cases and save the list of test components to add later in step 3.

.. note::
  User needs to install ESP-IDF PyTest python requirements by selecting menu **View** > **Command Palette** and type **ESP-IDF Unit Test: Install ESP-IDF PyTest requirements**. Select the command and see the pytest package installation output.

When it press the run button on a test, it will configure the current project before the tests as follows:

1. Check that PyTest requirements from ESP-IDF are satisfied.

.. note::
  Unit tests in this extension requires `ESP-IDF PyTest requirements <https://github.com/espressif/esp-idf/blob/master/tools/requirements/requirements.pytest.txt>`_ to be installed in your Python virtual environment.

2. Install ESP-IDF PyTest requirements if they are not found in the python current virtual environment specified in **idf.toolsPath** configuration setting in settings.json.

3. Copy the unity-app from the extension template and add the test components to the main CMakeLists.txt ``TEST_COMPONENTS`` cmake variable. The extension unity-app is a basic ESP-IDF application with a unity menu that will be built and flashed on the current **idf.port** serial device with all test cases that were found during exploration step.

.. note::
  You can also create, build and flash the unity test application using the **ESP-IDF Unit Test: Install ESP-IDF PyTest requirements** extension command, which will copy build and flash to your device the generated unit testing application.

4. Runs `pytest-embedded <https://docs.espressif.com/projects/pytest-embedded/en/latest/index.html>`_ a plugin that extends PyTest to run on esp-idf devices and output the results as XML file in the unity-app directory. This is executed as an extension task and the output shown in the terminal (similar to Build and Flash tasks).

5. The XML results file is parsed and test results are updated in the Testing tab with test duration.

6. You can refresh the tests and build the unity-app again with the ``Refresh Tests`` button from the Testing tab.
