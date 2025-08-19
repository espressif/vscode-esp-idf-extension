Code Coverage
=============

:link_to_translation:`zh_CN:[中文]`

Source code coverage provides data indicating the count and frequency of every program execution path taken during runtime. `GCOV <https://en.wikipedia.org/wiki/Gcov>`_ is a GCC tool that, when used with the compiler, generates log files showing the execution count of each line of source code.

Your ESP-IDF project should be configured to generate ``gcda/gcno`` coverage files using ``gcov``. Please read `GCOV Code Coverage <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/app_trace.html#gcov-source-code-coverage>`_ to learn more about code coverage with GCOV in ESP-IDF projects.

You can use the ``ESP-IDF: Configure Project SDKConfig for Coverage`` to set the required configuration in the SDK Configuration Editor.


Code Coverage Example
---------------------

Let's use the ESP-IDF `GCOV Example <https://github.com/espressif/esp-idf/tree/master/examples/system/gcov>`_ for this tutorial.

1.  Navigate to ``View`` > ``Command Palette``.

2.  Type ``ESP-IDF: New Project`` and choose ESP-IDF version to use.

    .. note::

	    If you don't see the option, please review the current ESP-IDF setup in :ref:`Installation <installation>`.

3.  A window will open with settings to configure the project. Choose from a list of ESP-IDF examples, go to the ``system`` section, and select ``gcov``. You will see a ``Create Project Using Example GCOV`` button at the top and a project description below. Click ``Create Project Using Example GCOV``.

    .. image:: ../../../media/tutorials/coverage/gcov_example.png

4.  Select a container directory where to copy the example project. For example, if you choose ``/Users/myUser/someFolder``, the resulting folder will be ``/Users/myUser/someFolder/gcov``. This new project directory will be created and opened in Visual Studio Code.

5.  Select an Espressif target (esp32, esp32s2, etc.):

    - Navigate to ``View`` > ``Command Palette``.
    - Type ``ESP-IDF: Set Espressif Device Target`` command. The default target is ``esp32``, which is used in this tutorial.

6.  Configure your sdkconfig project with the ``ESP-IDF: Configure Project SDKConfig for Coverage`` command or manually using the ``ESP-IDF: SDK Configuration Editor`` command. After all changes are made, click ``Save`` and close the window.

    .. image:: ../../../media/tutorials/basic_use/gui_menuconfig.png

7.  The example will enable the following options by default:

    - Enable the Application Tracing Module under ``Component Config`` > ``Application Level Tracing`` > ``Data Destination`` by choosing ``Trace Memory``.
    - Enable GCOV to host interface under ``Component Config`` > ``Application Level Tracing`` > ``GCOV to Host Enable``.
    - Enable OpenOCD Debug Stubs under ``Component Config`` > ``ESP32-specific`` > ``OpenOCD Debug Stubs``.

8.  Build the project, flash your device, and start the ESP-IDF Monitor using the ``ESP-IDF: Build your Project``, ``ESP-IDF: Flash your Project``, and ``ESP-IDF: Monitor Device`` commands.

    .. note::
  
        There is also an ``ESP-IDF: Build, Flash and Start a Monitor on your Device`` command that combines all three commands.

9.  Launch OpenOCD and send some commands. To start OpenOCD from the extension, execute the ``ESP-IDF: OpenOCD Manager`` command or use the ``OpenOCD Server (Running | Stopped)`` button in the Visual Studio Code status bar. OpenOCD server output is shown in ``View`` > ``Output`` > ``ESP-IDF``.

10. Launch a new terminal with menu ``Terminal`` > ``New Terminal`` and execute ``telnet <oocd_host> <oocd_port>``, which defaults to ``telnet localhost 4444``. Latest macOS users can use ``nc <oocd_host> <oocd_port>`` if ``telnet`` is not available.

    .. note::
      
	    You can modify ``openocd.tcl.host`` and ``openocd.tcl.port`` configuration settings to change these values.

11. Send the OpenOCD command ``esp gcov dump`` for a hard-coded dump, which will perform two hard-coded dumps based on this example. Then send the ``esp gcov`` command for an instant run-time dump.

    .. image:: ../../../media/tutorials/coverage/oocd_cmds.png

12. After dumping data, open the desired file in your editor and execute the ``ESP-IDF: Add Editor Coverage`` command to highlight the editor with code coverage.

13. You can customize the highlight color through the following configuration settings in the extension’s ``settings.json`` file:

    - Covered lines use ``idf.coveredLightTheme`` for light themes and ``idf.coveredDarkTheme`` for dark themes.
    - Partially covered lines use ``idf.partialLightTheme`` for light themes and ``idf.partialDarkTheme`` for dark themes.
    - Non-covered lines use ``idf.uncoveredLightTheme`` for light themes and ``idf.uncoveredDarkTheme`` for dark themes.

    Visual Studio Code supports ``red``, ``rgb(255,0,120)`` or ``rgba(120,0,0,0.1)``.

    .. image:: ../../../media/tutorials/coverage/editor_coverage.png

14. When finished, use the ``ESP-IDF: Remove Editor Coverage`` command to remove the code coverage.

    - Navigate to ``View`` > ``Command Palette``.
    - Type ``ESP-IDF: Get HTML Coverage Report for Project`` and select the command to generate an HTML report for code coverage.

    .. image:: ../../../media/tutorials/coverage/html_report.png

.. note::
        
    Check the :ref:`Troubleshooting <troubleshooting-section>` section if you encounter any issues.
