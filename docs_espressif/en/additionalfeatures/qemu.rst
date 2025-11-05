.. _qemu:

QEMU Integration 
================

When you create a project using this extension's commands, a Dockerfile is included for use with the `Dev Containers <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers>`_. You can open any project inside a container with the ``Dev Containers: Open Folder in Container`` command.

The ESP-IDF setup can include a fork of the `Espressif QEMU <https://github.com/espressif/qemu>`_ for Espressif devices, which is used for emulated development. Ensure it is installed by running ``python $IDF_PATH/tools/idf_tools.py install qemu-xtensa qemu-riscv32`` in the ``ESP-IDF: Open ESP-IDF Terminal`` terminal.

.. note::

    The ``ESP-IDF: Add Docker Container Configuration`` command can be used to add these files to the current project directory.

Development steps:

1.  Prepare a project folder in a container based on the Dockerfile in the template's ``.devcontainer`` directory in this repository. For this you can:

    - Create a project using the ``ESP-IDF: New Project`` command, which includes the ``.devcontainer`` directory.
    - Use the ``ESP-IDF: Add Docker Container Configuration`` command to add the ``.devcontainer`` files to the currently opened project directory.

2.  Use the ``Dev Containers: Open Folder in Container`` command to open the folder within the container.
3.  The **Dev Containers** will build the container from the Dockerfile (if it has not been created before) and install this extension on the container.
4.  The extension should be self-configured; otherwise, run the setup wizard.
5.  Write your code and build the project with the ``ESP-IDF: Build your Project`` command.
6.  Use the ``ESP-IDF: Launch QEMU Server`` command or the **[QEMU Server]** link in the activity bar to launch QEMU with the binaries from the build directory.
7.  Use the ``ESP-IDF: Monitor QEMU Device`` command to launch a terminal running IDF Monitor on QEMU.
8.  To launch a QEMU debug session, use the ``ESP-IDF: Launch QEMU Debug Session`` command, which will stop any existing QEMU server and launch a new QEMU server for debugging.

Set the ``idf.qemuDebugMonitor`` configuration option to start the monitor after the QEMU debug session is launched. To pass additional arguments, set the ``idf.qemuExtraArgs`` configuration option.

An example of ``"idf.qemuExtraArgs": ["--qemu-extra-args"]`` can be used to pass additional arguments to QEMU directly, while ``--flash-file`` or ``--efuse-file`` are ``idf.py`` specific arguments as described in the `ESP-IDF QEMU Emulator <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/tools/qemu.html>`_ documentation.

.. note::

    The extension assumes that ``qemu-system-xtensa`` or ``qemu-system-riscv32`` is available in the environment variable PATH to run ``ESP-IDF: Monitor QEMU Device`` and ``ESP-IDF: Launch QEMU Debug Session``.
