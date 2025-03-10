ESP-IDF Application Size Analysis
=================================

:link_to_translation:`zh_CN:[中文]`

The ESP-IDF application size analysis tool provides a detailed breakdown of your application’s memory usage, helping developers optimize storage allocation. To view a visual size analysis:

-   Navigate to ``View`` > ``Command Palette``.
-   Type ``ESP-IDF: Size Analysis of the Binaries`` and select the command to review the application size information.

    .. image:: ../../../media/tutorials/basic_use/size.png

To view application size analysis from the CLI:

-   Navigate to ``View`` > ``Command Palette``.
-   Type ``ESP-IDF: Build your Project`` and select the command to build your project.
-   The application size analysis task will be executed in a terminal, showing the size analysis results. You can enable or disable this task with ``idf.enableSizeTaskAfterBuildTask`` in your ``settings.json``.

    .. image:: ../../../media/tutorials/basic_use/size_terminal.png
