# Using Docker Container

The Espressif docker image has been released [here](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-guides/tools/idf-docker-image.html?highlight=docker), but for `idf.py flash` and `idf.py monitor` to work in the container the serial ports should be configured to be passed to WSL from host Windows machine.

In this tutorial will show you how to develop your projects based on `Visual Studio Code` + `ESP-IDF extension` + `ESP-IDF Docker Image` to execute all ESP-IDF extension features.

# Required Tools

you need to install the following tools before starting our projects:

1. Ubuntu on Windows
1. [Visual Studio Code](https://code.visualstudio.com/)
1. [usbipd-win](https://github.com/dorssel/usbipd-win/releases)
1. [Docker Desktop For Windows](https://hub.docker.com/)

Other tools are defined in Dockefile and will be part of the executed container.

## Docker Desktop

Docker Desktop is an application for MacOS and Windows machines for the building and sharing of containerized applications. For more details, the user can refer to [here](https://docs.docker.com/get-started/), but the role of docker here is to import the `ESP-IDF Docker Image` and manage it, such as start,restart,close etc.

> **NOTE:** the default installing path of docker is C disk, so please move to other disks with `mklink` commands if the space size of C disk is not enough.

## Ubuntu on Windows

WSL is present starting from Windows 10 OS, so we can check the WSL list with the `Powershell` command prompt, as below

```c
wsl -l -o
```

<img src="../../media\tutorials\using_docker_container\wsl-l-o.png" alt="" height="">

so to install WSL on Windows, please type in the following command:

```c
wsl --install --distribution　Ubuntu
```

## usbipd-win

To access the `USB`,`serial`,`JTAG` devices which are from the local Windows, this tools must be installed, else it is impossible to download,monitor and debug on IDF docker image side. the way to install it, it is also same as Windows applications, so it will not be described in detail here.

# Configuration

we still need to do a bit configurations after installing the four tools above:

## Ubuntu on Windows

1. check the current WSL version is 2

   ```c
   wsl -l -v
   ```

   <img src="../../media\tutorials\using_docker_container\wsl-l-v.png" alt="" height="">

1. please upgrade to version 2, if not

   ```c
   wsl --set-version Ubuntu 2
   ```

1. set the distribution as default, as below:
   ```c
   wsl -s Ubuntu
   ```

at last, to check if the commands have taken effect with `wsl --status` command.

<img src="../../media\tutorials\using_docker_container\wsl-status.png" alt="" height="">

## Docker Desktop for Windows

As the distribution Ubuntu has been updated to version 2, so it needs to modify accordingly from docker side and choose the Ubuntu as the default WSL integration as well.

<img src="../../media\tutorials\using_docker_container\wsl-integration.png" alt="" height="400">

## usbipd

If any errors are found, try updating apt-get packages first.

```c
apt-get update
```

> **NOTE:** IF you are using a container made with the Dockerfile from this extension `.devcontainer` generated directory (when you create a project using the `ESP-IDF: New Project`, `ESP-IDF: Add Docker Container Configuration` or `ESP-IDF: Show Examples` commands).

with this the local Windows and WSL are all installed. To check `usbipd` tool is working well on both side, please follow the following steps:

1. <span id="usbipd_instructions"></span>open PowerShell command prompt with administrator right and then type in the command `usbipd list` for a list of USB serial devices.

2. to access the specified device from local Windows on WSL, it needs to bind this device. Open PowerShell command prompt with administrator rights and then type in the command `usbipd bind --busid <BUSID>`:

   **Note**: this command needs to be used only one time,unless the computer has restarted. **1-1** is the device's bus id `<BUSID>` I would like to bind.

3. after binding, please attach the specified device to WSL with `usbipd attach --wsl --busid <BUSID>` command in the powershell command prompt.

4. At last, let us check if it works well on both side and type in `dmesg | tail` command on WSL side.

   <img src="../../media\tutorials\using_docker_container\wsl_demsg_tail.png" alt="" height="">

   as we can see above, **1-1** device has been attached to `ttyACM0`, that means WSL can access the **1-1** USB device now.

## Visual Studio Code

Install the `Remote - Containers`、`Remote Development` and `ESP-IDF` extensions, as below:

<img src="../../media\tutorials\using_docker_container\remote_container.png" alt="" width="400">

<img src="../../media\tutorials\using_docker_container\remote_development.png" alt="" width="400">

<img src="../../media\tutorials\using_docker_container\esp-idf.png" alt="" width="400">

# Practice

After all previous steps have taken effect, the WSL or docker container should be ready to use. Here is an example to show you how to utilize these tools.

## Example Project with Docker Container

Using `Blink` and `Hello_world` projects as examples, If you have more example projects, you can put them in the same folder and mount them together in the IDF Docker image; otherwise, it will take your much more space size on your disk as you need to create one container for each example project, that is not a good solution.

<img src="../../media\tutorials\using_docker_container\example_projects.png" alt="" height="">

as seen from snapshot above, `Blink` and `Hello_world` example projects have been put in the same folder and we only need to open this folder with vscode:

<img src="../../media\tutorials\using_docker_container\example_project_vscode.gif" alt="" height="">

some readers may see that there is a `.devcontainer` folder in the example_project folder, which is not included by default; this is generated by using the ESP-IDF extension of Visual Studio Code to create and configure the ESP-IDF docker image for container development.

If the user readers also need to generate their own `.devcontainer` folder content, as follows:

1. open example project with vscode and then press `F1`
1. In the pop-up dialog box, search for the `ESP-IDF: Add Docker Container Configuration` command
1. `.devcontainer`folder will be generated for the currently opened project.

<img src="../../media\tutorials\using_docker_container\dev_container.gif" alt="" height="">

For more information about `devcontainer.json`, please refer to the comments.

```json
// For format details, see https://aka.ms/devcontainer.json. For config options, see the README at:
// https://github.com/microsoft/vscode-dev-containers/tree/v0.183.0/containers/ubuntu
{
  /* A name for the dev container displayed in the UI */
  "name": "ESP-IDF",
  /* container name when creating container */
  "image": "espressif/idf:latest",
  /* mount the local folder to /workspaces folder of docker image */
  "workspaceMount": "source=${localWorkspaceFolder},target=/workspaces/project-name,type=bind",
  /* the path of workspace folder, that means this folder will be opened after container is running
   */
  "workspaceFolder": "/workspaces/project-name",
  /* mount the vscode extensions to the target path, and then they don't need to install again when rebuilding the container
   */
  "mounts": [
    "source=extensionCache,target=/root/.vscode-server/extensions,type=volume"
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
    "idf.pythonBinPath": "/opt/esp/python_env/idf5.3_py3.10_env/bin/python",
    "idf.toolsPath": "/opt/esp",
    "idf.gitPath": "/usr/bin/git"
  },
  /* An array of extensions that should be installed into the container. */
  "extensions": ["espressif.esp-idf-extension"],
  /* start the container with privileged mode, else the devices cannot be accessed on the docker image.
   */
  "runArgs": ["--privileged"]
}
```

At this point, all related configurations have been completed.

## Create a Container

Create a container and then start your development by clicking the `><` green button at the bottom left of Visual Studio Code and select `Open Folder in Container` to start creating a container **(It will be slightly slower, because to download the Docker image of ESP-IDF, you only need to download it once)**, and finally open the `Blink` example project; if you need to switch to another project, just change it from `"workspaceFolder": "/workspaces/blink"` to `"workspaceFolder": "/workspaces/The name of the sample project you want to open"`, and then re-select`Open Folder in Container`, as follows:

<img src="../../media\tutorials\using_docker_container\create_container.gif" alt="" height="">

at this moment, you can start to use the `Blink` example project for building, flashing, monitoring, debugging, etc.

## Building the Project

Here taking the esp32-c3 as an example, users only need to change the target device from `esp32` to `esp32-c3`, as below:

<img src="../../media\tutorials\using_docker_container\device_target_esp32_c3.png" alt="" height="">

next, start to build the example project, as below:

<img src="../../media\tutorials\using_docker_container\container_build.gif" alt="" height="">

## Flashing to your Device

after building, we can use the following ways to download the firmware.

### External USB-Serial

Based on the description above, users can follow the instructions [usbipd](#usbipd_instructions) section mentioned. here `Silicon Labs CP210x USB to UART Bridge` is taken as an example, it has been attached to docker image:

<img src="../../media\tutorials\using_docker_container\wsl_demsg_tail_usb_serial.png" alt="" height="">

as you can see, this device has attached to `ttyUSB0`, so `idf.port` also need to change accordingly.

<img src="../../media\tutorials\using_docker_container\ttyUSB0.png" alt="" height="">

but, the container doesn't know the configuration has changed yet at this moment.

<img src="../../media\tutorials\using_docker_container\unkown_ttyUSB0.png" alt="" height="">

so users need to reopen the container, that is `Reopen Folder Locally` and then the new configuration wil be reloaded as well.

<img src="../../media\tutorials\using_docker_container\container_reopen.gif" alt="" height="">

at last, click the `Flash` button and start to download the firmware.

<img src="../../media\tutorials\using_docker_container\container_flash_uart.gif" alt="" height="">

### Internal USB-serial

Just as the external usb-serial, the only difference is the number attached. where the external usb-serial is `ttyUSBx`, while the internal usb-serial is `ttyACMx`.

<img src="../../media\tutorials\using_docker_container\container_flash_uart_internal.gif" alt="" height="">

### USB-JTAG

Same as [External USB-Serial](#external-usb-serial) and [Internal USB-serial](#internal-usb-serial), but it needs to configure the following extra parameters:

<img src="../../media\tutorials\using_docker_container\extra_parameters.png" alt="" height="">

the interface is the same as [Internal USB-serial](#internal-usb-serial), that is `ttyACMx`:

<img src="../../media\tutorials\using_docker_container\container_flash_jtag.gif" alt="" height="">

### Additional steps for debugging

Make sure to run `ESP-IDF: Add OpenOCD rules file (For Linux users)` command and `ESP-IDF: Install ESP-IDF Python Packages` command to add openOCD rules and install debug adapter python packages in the docker container before running openOCD and starting a debug session with the ESP-IDF Debug Adapter.

## Debugging

After following [USB-JTAG](#usb-jtag), press `F5` to start to debug:

<img src="../../media\tutorials\using_docker_container\container_debug.gif" alt="" height="">

# Precautions

1. When the container is created for the first time, it will prompt that the `ESP-IDF extension` cannot be activated because it depends on the Microsoft `C++ tools` extension. You only need to reopen the container again. This is because the ESP-IDF extension is dependent on the C++ Tools extension being installed first.
2. If you want to debug on Windows, you need to unplug the USB cable and re-plug in it again, otherwise the corresponding USB port cannot be found in the Windows device manager.
3. Docker Desktop For Windows needs to be opened and cannot be closed during container development.
