.. _build the project:

Build Your Project
==================

:link_to_translation:`zh_CN:[中文]`

1.  Build your project: Go to ``View`` > ``Command Palette``, enter ``ESP-IDF: Build your Project`` and choose the command to build the project.

2.  A new terminal will open with the build output. A notification bar will display the "Building project" message, followed by a "Building done" message when the process is complete.

    .. image:: ../../media/tutorials/basic_use/build.png

    .. note::

        There is an ``idf.notificationMode`` configuration setting if you prefer not to see the output automatically. Please refer to :ref:`ESP-IDF Settings <settings>` to learn how to modify this configuration.

    You can adjust the behavior of the build task with ``idf.cmakeCompilerArgs`` for the Cmake configure step and ``idf.ninjaArgs`` for the Ninja step. For example, use ``idf.ninjaArgs: [-j N]`` where **N** is the number of jobs to run in parallel.

3.  After building the application, the size analysis task will run in a terminal, showing the binary size analysis results. You can enable or disable this task with ``idf.enableSizeTaskAfterBuildTask`` in the ``settings.json``.

    .. image:: ../../media/tutorials/basic_use/size_terminal.png

The ESP-IDF build output will provide hints to resolve errors, which can be viewed using the :ref:`Hints Viewer <hints viewer>`.

Next, proceed to :ref:`Flash onto the Device <flash the device>`.
