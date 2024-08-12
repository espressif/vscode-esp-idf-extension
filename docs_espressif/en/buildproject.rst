.. _build the project:

Build the Project
===============================

1. Build the project:

- Navigate to **View** > **Command Palette**.

- Type **ESP-IDF: Build your Project** and select the command to build the project.

2. A new terminal being launched with the build output and a notification bar with Building Project message until it is done then a Build done message when finished. 

.. image:: ../../media/tutorials/basic_use/build.png

.. note::
  There is a **idf.notificationMode** configuration setting if the user does not wants to see the output automatically. Please review `ESP-IDF Settings <settings>` to see how to modify this configuration setting.

You could modify the behavior of the build task with **idf.cmakeCompilerArgs** for Cmake configure step and **idf.ninjaArgs** for Ninja step. For example, using ``idf.ninjaArgs: [-j N]`` where N is the number of jobs run in parallel.

3. After building the application size analysis task will be executed in a terminal showing the size analysis results.  You can enable or disable this task being executed with **idf.enableSizeTaskAfterBuildTask** in your settings.json.

.. image:: ../../media/tutorials/basic_use/size_terminal.png

ESP-IDF build output will try to suggest hints to solve errors that can be shown using the :ref:`Hints viewer <hints viewer>`.

Next step is to :ref:`Flash onto the device <flash the device>`.