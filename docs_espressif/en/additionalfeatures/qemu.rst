.. _qemu:

ESP-IDF QEMU Integration with Visual Studio Code
===================================================

When you create a project using this extension commands, there is Dockerfile which can be used with the `Microsoft Remote Containers Extension <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers>`_. You can open any project inside a container with the **Remote Containers: Open Folder in Container..** command. Besides including an already configured setup for ESP-IDF and tools (this is based on the ESP-IDF docker image), a fork of `Espressif QEMU fork <https://github.com/espressif/qemu>`_ for Espressif devices is included, which can be used for emulated development.

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
7. You can use the **ESP-IDF: Monitor QEMU Device** command to launch a terminal running IDF Monitor on QEMU. This extension uses the **idf.qemuTcpPort** configuration setting for the serial monitor in QEMU.
8. If you want to launch a QEMU debug session, use the **ESP-IDF: Launch QEMU Debug Session** commmand, which will stop any existing QEMU server and launch a new QEMU server for debugging.

.. note::
  Using QEMU is not limited to a docker container, basically the extension assumes that ``qemu-system-xtensa`` or ``qemu-system-riscv32`` is available in the environment variable PATH for the **ESP-IDF: Launch QEMU Server** command and that a QEMU server is running for **ESP-IDF: Monitor QEMU Device** and **ESP-IDF: Launch QEMU Debug Session**.
