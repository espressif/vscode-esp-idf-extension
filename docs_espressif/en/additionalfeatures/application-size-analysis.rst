ESP-IDF Application Size Analysis
===================================

The ESP-IDF Application Size Analysis tool provides a detailed breakdown of your application’s memory usage, helping developers optimize storage allocation. For a visual size analysis:

- Navigate to **View** > **Command Palette**.

- Type **ESP-IDF: Size Analysis of the Binaries** and select the command to visually review the application size information.

.. image:: ../../../media/tutorials/basic_use/size.png

Follow the below instructions to view applciation size analysis from CLI:

- Navigate to **View** > **Command Palette**.

- Type **ESP-IDF: Build your Project** and select the command to specify the build your project.

- The application size analysis task will be executed in a terminal showing the size analysis results. You can enable or disable this task being executed with **idf.enableSizeTaskAfterBuildTask** in your settings.json.

.. image:: ../../../media/tutorials/basic_use/size_terminal.png