.. _build the project:

构建项目
========

:link_to_translation:`en:[English]`

1.  构建项目：前往菜单栏 ``查看`` > ``命令面板`` 并输入 ``ESP-IDF：构建项目``，点击该命令开始构建项目。

2.  一个新的终端自动开启并显示构建输出。通知栏中会出现 "Building project" 的信息，构建完成后则会显示 "Building done"。

    .. image:: ../../media/tutorials/basic_use/build.png

    .. note::

        如果你不想自动查看输出，可以修改 ``idf.notificationMode`` 设置。请查看 :ref:`ESP-IDF 设置 <settings>`，了解如何修改此配置。

    若想修改构建任务的行为，可以在配置 Cmake 时使用 ``idf.cmakeCompilerArgs`` 参数，或在配置 Ninja 时使用 ``idf.ninjaArgs`` 参数。例如，可以使用 ``idf.ninjaArgs: [-j N]`` 来设置并行作业数，其中 **N** 是并行作业的数量。

3.  完成应用程序构建后，终端中将执行二进制文件大小分析任务，并显示分析结果。可以在 ``settings.json`` 中通过 ``idf.enableSizeTaskAfterBuildTask`` 配置项启用或禁用此分析任务。

    .. image:: ../../media/tutorials/basic_use/size_terminal.png

ESP-IDF 构建输出中会提示如何解决构建错误，这些提示可以通过 :ref:`提示查看器 <hints viewer>` 显示。

接下来请 :ref:`烧录项目 <flash the device>`。
