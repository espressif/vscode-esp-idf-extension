.. _qemu:

ESP-IDF QEMU Integration with Visual Studio Code
===================================================

When you create a project using this extension commands, there is Dockerfile which can be used with the `Microsoft Remote Containers Extension <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers>`_. You can open any project inside a container with the **Remote Containers: Open Folder in Container..** command. 

ESP-IDF setup can include a fork of `Espressif QEMU fork <https://github.com/espressif/qemu>`_ for Espressif devices, which can be used for emulated development. You can make sure is installed it by running ``python $IDF_PATH/tools/idf_tools.py install qemu-xtensa qemu-riscv32`` in the **ESP-IDF: Open ESP-IDF Terminal** terminal.

.. note::
  * The **ESP-IDF: Add Docker Container Configuration** command can be used to add these files to the current project directory.

Development steps:

1. Prepare a project folder in a container based on the dockerfile in the templates ``.devcontainer`` directory in this repository. For this you can:
   - Create a project using **ESP-IDF: New Project**, **ESP-IDF: Show Examples Projects** or **ESP-IDF: Create Project from Extension Template** command which will include the ``.devcontainer`` directory.
   - Use the **ESP-IDF: Add Docker Container Configuration** command to add the ``.devcontainer`` files to the currently opened project directory.
2. Use the **Remote Containers: Open Folder in Container..** command to open the folder within the container.
3. The **Remote Containers** will build the container from the Dockerfile (if it has not been created before) and install this extension on the container.
4. The extension should be self configured, otherwise run the setup wizard.
5. Write your code and build the project with the **ESP-IDF: Build your Project** command.
6. Use the **ESP-IDF: Launch QEMU Server** command or the **[QEMU Server]** link in the activity bar to launch QEMU with the binaries from the build directory.
7. You can use the **ESP-IDF: Monitor QEMU Device** command to launch a terminal running IDF Monitor on QEMU.
8. If you want to launch a QEMU debug session, use the **ESP-IDF: Launch QEMU Debug Session** commmand, which will stop any existing QEMU server and launch a new QEMU server for debugging.

You can use the ``idf.qemuDebugMonitor`` configuration setting to enable the monitor to start after QEMU debug session is launched. If you want to pass additional arguments ``idf.qemuExtraArgs`` configuration setting can be used.

An example of ``"idf.qemuExtraArgs": ["--qemu-extra-args"]`` can be used to pass additional arguments to QEMU directly while ``--flash-file`` or ``--efuse-file`` are idf.py specific arguments as described in **ESP-IDF QEMU Emulator** documentation below.

More information about how to use in `ESP-IDF QEMU Emulator <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/tools/qemu.html>`_.

.. note::
  The extension assumes that ``qemu-system-xtensa`` or ``qemu-system-riscv32`` is available in the environment variable PATH to run **ESP-IDF: Monitor QEMU Device** and **ESP-IDF: Launch QEMU Debug Session**.
