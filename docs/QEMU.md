# ESP-IDF Integration with Visual Studio Code

When you create a project using this extension commands, there is Dockerfile which can be used with the [Microsoft Remote Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers). You can open any project inside a container with the `Remote Containers: Open folder in container..` command. Besides including an already configured setup for ESP-IDF and tools (this is based on the ESP-IDF docker image), a fork of [QEMU](https://github.com/espressif/qemu) for Espressif devices is included, which can be used for emulated development.

> **NOTE:** The `Add docker container configuration` command can be used to add these files to the current project directory.

Development steps:

1. Prepare a project folder in a container based on the dockerfile in the templates `.devcontainer` directory in this repository. For this you can:
    - Create a project using `New Project`, `ESP-IDF: Show Examples Projects` or `ESP-IDF: Create project from extension template` command which will include the `.devcontainer` directory.
    - Use the `Add docker container configuration` command to add the `.devcontainer` files to the currently opened project directory.
2. Use the `Remote Containers: Open folder in container..` command to open the folder within the container.
3. The `Remote Containers` will build the container from the Dockerfile (if it has not been created before) and install this extension on the container.
4. The extension should be self configured, otherwise run the setup wizard.
5. Write your code and build the project with the `Build your project` command.
6. Use the `Launch QEMU server` command or the `[QEMU Server]` link in the activity bar to launch QEMU with the binaries from the build directory.
7. You can use the `Monitor QEMU device` command to launch a terminal running IDF Monitor on QEMU. This extension uses the `idf.qemuTcpPort` configuration setting for the serial monitor in QEMU.
8. If you want to launch a QEMU debug session, use the `Launch QEMU debug session` commmand, which will stop any existing QEMU server and launch a new QEMU server for debugging.

> **NOTE:** Using QEMU is not limited to a docker container, basically the extension assumes that `qemu-system-xtensa` is available in the environment variable PATH for the `Launch QEMU server` command and that a QEMU server is running for `Monitor QEMU device` and `Launch QEMU debug session`.