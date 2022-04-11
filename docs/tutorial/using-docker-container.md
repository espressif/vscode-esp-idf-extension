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

<img src="../../media\tutorials\using_docker_container\wsl-l-o.png" alt="" height="">

so to install WSL on windows, please type in the following command:
```c
wsl --install --distribution　Ubuntu-20.04
```
**where `Ubuntu-20.04` is for your information**.

## Visual Studio Code
This is a lightweight text editor launched by Microsoft. It can do lots of things as the lots of different extensions . This development environment is built by using VSCODE plus plug-ins to achieve downloading, monitoring and debugging and other functions; as for the installation method, it is the same as the common Windows applications, so it will not be described in detail here.

## usbipd-win

To access the `USB`,`serial`,`JTAG` devices which are from the local windows, this tools must be installed, else it is impossible to download,monitor and debug on IDF docker image side. the way to install it, it is also same as windows applications, so it will not be described in detail here.

# configuration

we still need to do a bit configurations after installing the four tools above:

## Ubuntu 20.04 on Windows
the default version of WSL is 1 after installing, it needs to upgrade to version2 and then set it as the default distribution with the following steps:

1. check the current WSL version
    ```c
    wsl -l -v
    ```

    <img src="../../media\tutorials\using_docker_container\wsl-l-v.png" alt="" height="">

1. please upgrade to version 2, if not
    ```c
    wsl --set-version Ubuntu-20.04 2
    ```

1. set the distribution, as below:
    ```c
    wsl -s Ubuntu 20.04
    ```

at last, to check if the commands have taken effect with `wsl --status` command.

<img src="../../media\tutorials\using_docker_container\wsl-status.png" alt="" height="">

## Docker Desktop For Windows
As the distribution Ubuntu 20.04 has been updated to version2, so it needs to modify accordingly from docker side and choose the Ubuntu 20.04 as the default WSL integration as well.

<img src="../../media\tutorials\using_docker_container\wsl-integration.png" alt="" height="400">

## usbipd
it is a key point to configure this tool and it will have an impact on the device if they can be downloaded or debugged or not.

from windows side, it doesn't need to do more settings after installing, however this tool still need to be installed on the WSL, that is to open the WSL from windows menu and then type in the following the commands separately:
```c
apt install linux-tools-5.4.0-77-generic hwdata
update-alternatives --install /usr/local/bin/usbip usbip /usr/lib/linux-tools/5.4.0-77-generic/usbip 20
```

you need update the apt package if errors occurred during the installation, as below:
```c
apt-get update
```

at this moment, local windows and WSL are all installed the usbipd tool. so to check if they are working well on both side, please follow the following steps:

1. <span id="usbipd_instructions"></span>open PowerShell command prompt with administrator right and then type in the command `usbipd wsl list`:

    <img src="../../media\tutorials\using_docker_container\usbipd_wsl_l.png" alt="" height="">
  
    as you can see, all USB devices from windows have been found and not attached sate.

1. to access the specify device which is from local windows on WSL, it needs to bind this device. that is to open PowerShell command prompt with administrator right and then type in the command `usbipd bind -b <BUSID>`:

    <img src="../../media\tutorials\using_docker_container\usbipd_bind.png" alt="" height="">

    **Note**: this command only needs to type in only one time,unless the computer has restarted. where **1-1** is the device I would like to bind.

1. after binding,please attach the specify device to WSL with `usbipd wsl attach --busid 1-1 ` command. but open the Powershell command prompt with normal user right at this moment.

    <img src="../../media\tutorials\using_docker_container\usbipd_wsl_attach.png" alt="" height="">

1. at last, let us check if it works well on both side and type in `dmesg | tail` command on WSL side.

    <img src="../../media\tutorials\using_docker_container\wsl_demsg_tail.png" alt="" height="">

    as we can see above,**1-1** device has been attached to `ttyACM0`, that means WSL can access the **1-1** USB device from now on.

it means that usbipd tool has been installed successfully on both side if all commands above can work well.

## Visual Studio Code

To connect to IDF docker image, vsocde needs to install the `Remote - Containers`、`Remote Development` and `ESP-IDF` extensions, as below:

<img src="../../media\tutorials\using_docker_container\remote_container.png" alt="" width="400">

<img src="../../media\tutorials\using_docker_container\remote_development.png" alt="" width="400">

<img src="../../media\tutorials\using_docker_container\esp-idf.png" alt="" width="400">

after that, vsocde can connect to IDF docker image and implement all features with ESP-IDF extension, for instance, building,flashing,monitoring etc.

# Practice

at this moment, all configurations and tools have taken effect, to understand better them, here give you an example to show you how to utilize these tools.

## example projects
let me take `blink` and `hello_world` example project as example, If you have more example projects, you can put them in the same folder and mount them together in the IDF Docker image; otherwise, it will take your much more space size on your disk as you need to create one container for each example project, that is not a good solution.

<img src="../../media\tutorials\using_docker_container\example_projects.png" alt="" height="">

as seen from snapshot above,`blink` and `hello_world` example projects have been put in the same folder and we only need to open this folder with vscode:

<img src="../../media\tutorials\using_docker_container\example_project_vscode.gif" alt="" height="">

some readers may see that there is a `.devcontainer` folder in the example_project folder, which is not included by default; this is generated by using the ESP-IDF extension of VSCODE to control and configure IDF docker image; So readers also need to generate their own `.devcontainer` folder content, as follows:

1. open example project with vscode and then type in `F1` 
1. In the pop-up dialog box, enter `ESP-IDF: Add docker container configuration`
1. `.devcontainer`folder has been generated at this moment

<img src="../../media\tutorials\using_docker_container\dev_container.gif" alt="" height="">

however, we still need to modify it accordingly as it cannot be used yet. regarding the meaning of each parameters, please refer to the comments.

- devcontainer.json

  ```json
  // For format details, see https://aka.ms/devcontainer.json. For config options, see the README at:
    // https://github.com/microsoft/vscode-dev-containers/tree/v0.183.0/containers/ubuntu
    {
        /* A name for the dev container displayed in the UI */
        "name": "ESP-IDF",
        /* container name when creating container */
        "image":"espressif/idf:latest",
        /* mount the local folder to /workspaces folder of docker image */
        "workspaceMount": "source=${localWorkspaceFolder},target=/workspaces,type=bind",
        /* the path of workspace folder, that means this folder will be opened after container is running
         */
        "workspaceFolder": "/workspaces/blink",
        /* mount the vscode extensions to the target path, and then they don't need to install again when rebuilding the container
        */
        "mounts": [
            "source=extensionCache,target=/root/.vscode-server/extensions,type=volume",
        ],
        /* follow the commands of Dockerfile to create the container
         */
        "build": {
            "dockerfile": "Dockerfile"
        },
        /* Machine specific settings that should be copied into the container
         */
        "settings": {
            "terminal.integrated.defaultProfile.linux": "bash",
            "idf.espIdfPath": "/opt/esp/idf",
            "idf.customExtraPaths": "",
            "idf.pythonBinPath": "/opt/esp/python_env/idf5.0_py3.8_env/bin/python",
            "idf.toolsPath": "/opt/esp",
            "idf.gitPath": "/usr/bin/git"
        },
        /* An array of extensions that should be installed into the container. */
        "extensions": [
            "ms-vscode.cpptools",
            "espressif.esp-idf-extension"
        ],
        /* start the container with privileged mode, else the devices cannot be accessed on the docker image.
         */
        "runArgs": [
            "--privileged"
        ]
    }
    ```
- Dockerfile
  ```c
    # The docker image needed to create the container, here is the image of ESP-IDF
    FROM espressif/idf:latest
    # When executing commands, no interaction is required
    ARG DEBIAN_FRONTEND=nointeractive
    # RUN apt-get update \
    #   && apt install -y -q \
    #   cmake \
    #   git \
    #   libglib2.0-0 \
    #   libnuma1 \
    #   libpixman-1-0
    # ESP-IDF related configuration
    RUN ./opt/esp/entrypoint.sh && pip install --no-cache-dir idf-component-manager
    RUN echo $($IDF_PATH/tools/idf_tools.py export) >> $HOME/.bashrc
    ENTRYPOINT [ "/opt/esp/entrypoint.sh" ]
    CMD ["/bin/bash"]
    ```

At this point, all related configurations have been completed. It may be a little troublesome for the first time, but basically there is no need to modify it in the future. This is a once and for all configuration.

## Create a container
When all the configurations above are completed, you only need to create a container and then start your development immediately, that is, click the green button at the bottom left of VSCODE and select `Open Folder in Container` to start creating a container **(It will be slightly slower, because to download the Docker image of ESP-IDF, you only need to download it once)**, and finally open the `Blink` example project; if you need to switch to another project, just change it from `"workspaceFolder": "/workspaces/blink"` to `"workspaceFolder": "/workspaces/The name of the sample project you want to open"`, and then re-select` Open Folder in Container`, as follows:

<img src="../../media\tutorials\using_docker_container\create_container.gif" alt="" height="">

at this moment, you can start to debug the `Blink` example project, such as flashing,monitoring,debugging etc.

## building
After the container is created, users can develop their own porject with `ESP-IDF extension` now.here it took esp32-c3 as an example, users only need to change the device target from `esp32` to `esp32-c3`,as below:

<img src="../../media\tutorials\using_docker_container\device_target_esp32_c3.png" alt="" height="">

next, start to build the example project, as below:

<img src="../../media\tutorials\using_docker_container\container_build.gif" alt="" height="">

## downloading
after building, we can use the following ways to download the firmware.

### External USB-Serial

based on the description above, users can follow the instructions [usbipd](#usbipd_instructions) section mentioned. here `Silicon Labs CP210x USB to UART Bridge` is taken as an example, it has been attached to docker image:

<img src="../../media\tutorials\using_docker_container\wsl_demsg_tail_usb_serial.png" alt="" height="">

as you can see, this device has attached to `ttyUSB0`, so `idf.port` also need to change accordingly.

<img src="../../media\tutorials\using_docker_container\ttyUSB0.png" alt="" height="">

but, the container doesn't know the configuration has changed yet at this moment.

<img src="../../media\tutorials\using_docker_container\unkown_ttyUSB0.png" alt="" height="">

so users need to reopen the container, that is `Reopen Folder Locally` and then the new configuration wil be reloaded as well.

<img src="../../media\tutorials\using_docker_container\container_reopen.gif" alt="" height="">

at last, click the `flash` button and start to download the firmware.

<img src="../../media\tutorials\using_docker_container\container_flash_uart.gif" alt="" height="">

### Internal USB-serial
actually, it is the same as the external usb-serial, the only difference is the number attached. where the external usb-serial is `ttyUSBx`, while the internal usb-serial is `ttyACMx`.

<img src="../../media\tutorials\using_docker_container\container_flash_uart_internal.gif" alt="" height="">

### USB-JTAG

it is also the same as [External USB-Serial](#external-usb-serial) and [Internal USB-serial](#internal-usb-serial), but it needs to configure the following extra parameters:

<img src="../../media\tutorials\using_docker_container\extra_parameters.png" alt="" height="">

the interface is the same as [Internal USB-serial](#internal-usb-serial), that is `ttyACMx`:

<img src="../../media\tutorials\using_docker_container\container_flash_jtag.gif" alt="" height="">

## debugging
actually, the configuration for debugging is also the same as [USB-JTAG](#usb-jtag), press the `F5` and then start to debug:

<img src="../../media\tutorials\using_docker_container\container_debug.gif" alt="" height="">

# Precautions
1. When the container is created for the first time, it will prompt that the ESP-IDF extension cannot be activated because it depends on the C++ tools extension. You only need to reopen the container again.
1. If you want to debug on Windows, you need to unplug the USB cable and re-plug in it again, otherwise the corresponding USB port cannot be found in the Windows device manager.
1. Docker Desktop For Windows needs to be opened and cannot be closed.

So far, all functions have been realized, and there is no difference in operation with the Windows environment. Enjoy! ! !