# Using Docker Container

as we all know, Espressif docker image has been released [here](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-guides/tools/idf-docker-image.html?highlight=docker), but it is too simple to bring up, also it highlighted that `idf.py flash` and `idf.py monitor`will not work in the container unless the serial port is passed through into the container.

so this tutorial will show you how to develop your projects based on `VSCODE` + `ESP-IDF extension` + `IDF Docker Image` and implement all features `ESP-IDF extension` supported, for instance, flashing, monitoring and debugging etc. ok, here we go!

# tools

you need to install the following tools before starting our projects:

1. Ubuntu 20.04 on Windows
1. [Visual Studio Code](https://code.visualstudio.com/)
1. [usbipd-win](https://github.com/dorssel/usbipd-win/releases)
1. [Docker Desktop For Windows](https://hub.docker.com/)

as you can see above, only 4 tools are enough and don't need to extra tools. it is different from the ways we did before, that is to install different tools, such as `toolchain`, `python`,`cmake` etc.

## Docker Desktop For Windows

as for what is the Docker? what it can do? we don't discuss here. the more details, we can refer to [here](https://docs.docker.com/get-started/), but the role of docker here is that:
> import the IDF Docker Image and manage it, such as start,restart,close etc.

regarding the ways to install **Docker Desktop For Windows**, it is the same as the general windows application, so we don't discuss here as well, but one point need to concern about, that is the default installing path of docker is C disk, so please move to other disks with `mklink` commands if the space size of C disk is not enough


## Ubuntu 20.04 on Windows
WSL is present starting from win10 OS, so we can check the WSL list with `powershell` command prompt, as below
```c
wsl -l -o
```
