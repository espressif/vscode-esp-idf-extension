ESP-IDF 应用程序大小分析
========================

:link_to_translation:`en:[English]`

ESP-IDF 应用程序大小分析工具提供了应用程序内存使用情况的详细分析，能够帮助开发者优化存储分配。查看可视化分析的步骤如下：

-   前往菜单栏 ``查看`` > ``命令面板``。
-   输入 ``ESP-IDF：二进制文件大小分析``，选中该命令以查看应用程序大小信息。

    .. image:: ../../../media/tutorials/basic_use/size.png

也可以在命令行界面查看应用程序大小分析：

-   前往菜单栏 ``查看`` > ``命令面板``。
-   输入 ``ESP-IDF：构建项目``，选中该命令以构建项目。
-   应用程序大小分析任务将在终端中执行，并显示分析结果。可以通过在 ``settings.json`` 文件中设置 ``idf.enableSizeTaskAfterBuildTask`` 选项来启用或禁用此任务。

    .. image:: ../../../media/tutorials/basic_use/size_terminal.png
