# Opening an Existing ESP-IDF Project

An ESP-IDF project follow the tree directory structure as shown in [ESP-IDF Example Project](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#example-project) is:

```
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
```

When you open a directory in Visual Studio Code with menu `File` -> `Open Folder` which contains a **CMakeLists.txt** file in the root directory (myProject) that follows the ESP-IDF structure.

If you need to add Visual Studio Code configuration files, use the `ESP-IDF: Add .vscode Configuration Folder` command to add these files to the existing folder.

If you want to use a project in a Docker container with Visual Studio Code [Remote - Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension you can use the `ESP-IDF: Add Docker Container Configuration` command to add required `Dockerfile` and `.devcontainer` json files.

As shown in [Working with multiple projects](../MULTI_PROJECTS.md), there are many places where configuration settings could be saved based on `idf.saveScope` and how to work with multiple debug and tasks configuration.

1. Open an example ESP-IDF project, like the [Blink example](https://github.com/espressif/esp-idf/tree/master/examples/get-started/blink) with `File` -> `Open Folder`.

2. You can already use the existing setup to build, flash and monitor the existing project. To debug, you need the `esp-idf` launch.json which can be added by running the `ESP-IDF: Add .vscode Configuration Folder` command.

3. If you want to open the project within the ESP-IDF Docker container, use the `ESP-IDF: Add Docker Container Configuration` command to add the `.devcontainer` directory which allows you to use the `Remote - Containers: Open Folder in Remote Container` to open the existing project into a container.
