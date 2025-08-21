.. _unit testing:

Unit Testing
============

When developing an application using ESP-IDF and considering unit testing for your component functions, this extension helps discover and execute tests on your device based on Unity, as described in `Unit Testing in ESP32 <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/unit-tests.html>`_.

The extension scans the workspace folders in your current project for test files that follow the convention described in the previous documentation. Specifically, it looks for files that match the glob pattern defined by the ``idf.unitTestFilePattern`` configuration setting (default: ``/test/test_*.c``). Within these files, the extension identifies test cases using the regular expression ``TEST_CASE\("(.*)",\s*"(.*)"\)``, which matches the following test file format:

.. code-block:: C

    TEST_CASE("test name", "[module name]")
    {
            // Add test here
    }


Configure the ESP-IDF Project to Enable Unit Tests in the Extension
-------------------------------------------------------------------

Consider an ESP-IDF project with the following structure:

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


Inside the ``testable`` component, unit tests are added to the ``test`` directory, which contains the test source files and the component makefile (``component.mk``/``CMakeLists.txt``).

To add tests for a ``testable`` component, define a ``test`` subdirectory and add ``test_name.c`` files with different test cases to run.

This structure is from the `ESP-IDF unit_test example <https://github.com/espressif/esp-idf/tree/master/examples/system/unit_test>`_, which can serve as a reference.

.. note::

    You can customize the test file discovery pattern by modifying the ``idf.unitTestFilePattern`` setting in your VS Code settings. This allows you to use different naming conventions or directory structures for your test files.

pytest Embedded Services Configuration
--------------------------------------

The extension uses `pytest-embedded <https://docs.espressif.com/projects/pytest-embedded/en/latest/index.html>`_ to run tests on ESP-IDF devices. The ``idf.pyTestEmbeddedServices`` configuration setting allows you to specify which embedded services to use when running pytest commands.

By default, the extension uses ``["esp", "idf"]`` as the embedded services. These services provide the following functionality:

* **esp**: Enables Espressif-specific functionality, including automatic target detection and port confirmation using ``esptool``.
* **idf**: Provides ESP-IDF project support, including automatic flashing of built binaries and parsing of binary information.

You can customize the embedded services by modifying the ``idf.pyTestEmbeddedServices`` setting in your VS Code settings. For example, you might want to add following additional services:

* **serial**: For basic serial port communication.
* **jtag**: For OpenOCD/GDB utilities.
* **qemu**: For running tests on QEMU instead of real hardware.
* **wokwi**: For running tests on the Wokwi simulation platform.

For a complete list of available services and their capabilities, refer to the `pytest-embedded Services Documentation <https://docs.espressif.com/projects/pytest-embedded/en/latest/concepts/services.html>`_.

.. note::
  
    The embedded services you choose will affect the pytest command that gets executed. Make sure the services you specify are compatible with your testing environment and requirements.

Running the Tests
-----------------

When you click the ``Testing`` Tab in the `Visual Studio Code Activity bar <https://code.visualstudio.com/docs/getstarted/userinterface>`_, the extension will try to find all test files and test cases and save the list of test components to add later in step 3.

.. note::

    User needs to install ESP-IDF pytest Python requirements by selecting menu ``View`` > ``Command Palette`` and typing ``Unit Test: Install ESP-IDF pytest requirements``. Select the command and see the pytest package installation output.

When you press the ``run`` button on a test, it will configure the current project before the tests as follows:

1.  Check that pytest requirements from ESP-IDF are satisfied.

    .. note::

        Unit tests in this extension requires `ESP-IDF pytest requirements <https://github.com/espressif/esp-idf/blob/master/tools/requirements/requirements.pytest.txt>`_ to be installed in your Python virtual environment.

2.  Install ESP-IDF pytest requirements if they are not found in the python current virtual environment specified in ``idf.toolsPath`` configuration setting in ``settings.json``.

3.  Copy the ``unity-app`` from the extension template, and add the required test components to the ``TEST_COMPONENTS`` CMake variable in the main ``CMakeLists.txt``. The ``unity-app`` provided by the extension is a simple ESP-IDF application that includes a unity test menu. It will be built and flashed to the serial device defined by ``idf.port``, together with all the test cases discovered during the exploration step.

    .. note::

        You can also create, build and flash the unity test application using the ``Unit Test: Install ESP-IDF pytest requirements`` extension command, which will copy, build, and flash the generated unit testing application to your device.

4.  Run `pytest-embedded <https://docs.espressif.com/projects/pytest-embedded/en/latest/index.html>`_, a plugin that extends pytest to run on ESP-IDF devices and output the results as an XML file in the ``unity-app`` directory. This is executed as an extension task, and the output is shown in the terminal (similar to build and flash tasks). The pytest command uses the embedded services specified in the ``idf.pyTestEmbeddedServices`` configuration setting (default: ``["esp", "idf"]``).

    .. note::

        You can customize the embedded services used by pytest by modifying the ``idf.pyTestEmbeddedServices`` setting in your VS Code settings. This allows you to specify different services or add additional ones as needed for your testing environment.

5.  The XML results file is parsed, and test results are updated in the ``Testing`` tab with test duration.

6.  You can refresh the tests and build the ``unity-app`` again with the ``Refresh Tests`` button from the ``Testing`` tab.
