.. _start a esp-idf project:

Start a ESP-IDF Project
===============================

There are three ways one can get started with a project:

1. :ref:`ESP-IDF New Project`
2. :ref:`ESP-IDF Show Examples Projects`
3. :ref:`ESP-IDF Existing ESP-IDF Project`

The first option is recommended as it allows you to configure the project while the second and third just create the project with current workspace folder configuration.

.. _ESP-IDF New Project:

1. Using **ESP-IDF: New project**
-----------------------------------

In Visual Studio Code

- Navigate to **View** > **Command Palette**.

- Type **ESP-IDF: New Project** and select the command to launch the New Project wizard.

.. image:: ../../media/tutorials/new_project/new_project_init.png

- Choose the project name
- Choose where to create this new project
- Select the Espressif board you are using
- Select the serial port of the device. (A list of currently serial devices is shown in the dropdown)

.. note::
  * Please review `Establish serial communication <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/establish-serial-connection.html>`_ if you are not sure about the serial port name.

.. note::
  * Please review `Configuration of OpenOCD for Specific Target <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/tips-and-quirks.html#jtag-debugging-tip-openocd-configure-target>`_ to understand which board or configuration to use for your specific hardware.

- Optionally, You could also choose to import any ESP-IDF component directory ``component-dir`` to the new project which will be copied to the new project's directory ``components`` sub directory (``<project-dir>/components/component-dir``).

After that click ``Choose Template`` button.

Choose ESP-IDF from the dropdown if you want to use an example as template.

.. note::
  If you want to create a blank project, choose ESP-IDF ``sample_project`` or  Extension ``template-app``.

.. image:: ../../media/tutorials/new_project/new_project_templates.png

Choose your desired template and click the **Create Project Using Template <template-name>** button where **<template-name>** is the name of the selected template.

After the project is created, a notification window will show up to open the newly created project or not.

.. image:: ../../media/tutorials/new_project/new_project_confirm.png

.. _ESP-IDF Show Examples Projects:

2. Using **Show Examples Projects**
-----------------------------------

In Visual Studio Code

- Navigate to **View** > **Command Palette**.

- Type **ESP-IDF: Show Examples Projects** and select the command to create a new project from ESP-IDF examples.

Select ``ESP-IDF`` from the dropdown. A window will appear showing a list of ESP-IDF examples.

When you select an example the readme will be shown and a **Create project using example example_name** button.

Choose a destination to create the new project. A notification will be shown to Open folder in a new window.

.. image:: ../../media/tutorials/new_project/new_project_confirm.png

.. _ESP-IDF Existing ESP-IDF Project:

3. Opening an Existing ESP-IDF Project
----------------------------------------

An ESP-IDF project follow the tree directory structure as shown in `ESP-IDF Example Project <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#example-project>`_ is:

.. code-block::
  
  - myProject/
              - CMakeLists.txt
              - sdkconfig
              - components/ - component1/ - CMakeLists.txt
                                          - Kconfig
                                          - src1.c
                            - component2/ - CMakeLists.txt
                                          - Kconfig
                                          - src1.c
                                          - include/ - component2.h
              - main/       - CMakeLists.txt
                            - src1.c
                            - src2.c

              - build/


In Visual Studio Code

- Navigate to **View** > **Command Palette**.

- Type **ESP-IDF: Import ESP-IDF Project** and select the command to import an existing ESP-IDF project.

This command will add both Visual Studio Code configuration files (settings.json, launch.json) and Docker container files (Dockerfile and .devcontainer.json).

Next step is to :ref:`Connect a device <connectdevice>`.

Getting Visual Studio Code configuration files
--------------------------------------------------

When you open a directory in Visual Studio Code with menu **File** > **Open Folder** which contains a **CMakeLists.txt** file in the root directory (myProject) that follows the ESP-IDF structure.

1. You can add vscode configuration files (settings.json, launch.json) by:

- Navigate to **View** > **Command Palette**.

- Type **ESP-IDF: Add .vscode Configuration Folder** command.

2. If you want to open the project within the ESP-IDF Docker container:

- Navigate to **View** > **Command Palette**.

- Type **ESP-IDF: Add Docker Container Configuration** and select the command to add the ``.devcontainer`` directory to your current directory.

- Navigate to **View** > **Command Palette**.

- Type **Remote - Containers: Open Folder in Remote Container** and select the command to open the existing project into the recently created container from previous step Dockerfile.