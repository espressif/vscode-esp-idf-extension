# Using WSL

In this tutorial will show you how to develop your projects based on `Visual Studio Code` + `ESP-IDF Extension` + `Remote - WSL` to implement all features of this extension in WSL.

# Required tools

you need to install the following tools before starting our projects:

1. Ubuntu 20.04 on Windows using WSL
1. [Visual Studio Code](https://code.visualstudio.com/)
1. [usbipd-win](https://github.com/dorssel/usbipd-win/releases)

## Ubuntu 20.04 on Windows

WSL is present starting from Windows 10 OS, so we can check the WSL list with the `Powershell` command prompt, as below

```c
wsl -l -o
```

<img src="../../media\tutorials\using_docker_container\wsl-l-o.png" alt="" height="">

so to install WSL on Windows, please type in the following command:

```c
wsl --install --distribution　Ubuntu-20.04
```

**where `Ubuntu-20.04` is for your information**.

## usbipd-win

To access the `USB`,`serial`,`JTAG` devices which are from the local Windows, this tools must be installed, else it is impossible to download,monitor and debug on IDF docker image side. the way to install it, it is also same as Windows applications, so it will not be described in detail here.

# Configuration

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

## Adding the Required Linux Packages in WSL

Run the following command in WSL for ESP-IDF to work on Linux.

```
sudo apt-get install git wget flex bison gperf python3-pip python3-venv python3-setuptools cmake ninja-build ccache libffi-dev libssl-dev dfu-util
```

## usbipd

From windows side this tool should be already configured. However `usbipd` still need to be installed on the WSL, that is, open the WSL from Windows menu and then type in the following the commands separately:

```c
sudo apt install linux-tools-virtual hwdata
sudo update-alternatives --install /usr/local/bin/usbip usbip `ls /usr/lib/linux-tools/*/usbip | tail -n1` 20
```

If any errors are found, try updating apt-get packages first.

```c
apt-get update
```

> **NOTE:** IF you are using a container made with the Dockerfile from this extension `.devcontainer` generated directory (when you create a project using the `ESP-IDF: New Project`, `ESP-IDF: Add Docker Container Configuration` or `ESP-IDF: Show Examples` commands).

with this the local Windows and WSL are all installed. To check `usbipd` tool is working well on both side, please follow the following steps:

1. <span id="usbipd_instructions"></span>open PowerShell command prompt with administrator right and then type in the command `usbipd wsl list`:

   <img src="../../media\tutorials\using_docker_container\usbipd_wsl_l.png" alt="" height="">

   as you can see, all USB devices from Windows have been found and not attached sate.

2. to access the specified device from local Windows on WSL, it needs to bind this device. Open PowerShell command prompt with administrator rights and then type in the command `usbipd bind -b <BUSID>`:

   <img src="../../media\tutorials\using_docker_container\usbipd_bind.png" alt="" height="">

   **Note**: this command needs to be used only one time,unless the computer has restarted. **1-1** is the device's bus id I would like to bind.

3. after binding, please attach the specified device to WSL with `usbipd wsl attach --busid 1-1` command in the powershell command prompt.

<img src="../../media\tutorials\using_docker_container\usbipd_wsl_attach.png" alt="" height="">

4. At last, let us check if it works well on both side and type in `dmesg | tail` command on WSL side.

   <img src="../../media\tutorials\using_docker_container\wsl_demsg_tail.png" alt="" height="">

   as we can see above, **1-1** device has been attached to `ttyACM0`, that means WSL can access the **1-1** USB device now.

## Visual Studio Code

To develop in WSL, install the `Remote - WSL`、`Remote Development` and `ESP-IDF` extensions, as below:

<img src="../../media\tutorials\using_docker_container\remote_wsl.png" alt="" width="400">

<img src="../../media\tutorials\using_docker_container\remote_development.png" alt="" width="400">

<img src="../../media\tutorials\using_docker_container\esp-idf.png" alt="" width="400">

# Practice

After all previous steps have taken effect, the WSL should be ready to use. Here is an example to show you how to utilize these tools.

## Example Project with WSL

Using `blink` and `hello_world` projects as examples:

<img src="../../media\tutorials\using_docker_container\example_projects.png" alt="" height="">

as seen from snapshot above, `blink` and `hello_world` example projects have been put in the same folder and we only need to open this folder with vscode:

<img src="../../media\tutorials\using_docker_container\example_project_vscode.gif" alt="" height="">

some readers may see that there is a `.devcontainer` folder in the example_project folder, which is not included by default; this is generated by using the ESP-IDF extension of Visual Studio Code to create and configure the IDF docker image for container development. Check the [docker container tutorial](./using-docker-container.md) for more information.

## Open Project in WSL

Start your development by clicking the `><` green button at the left bottom of Visual Studio Code and select `Open Folder in WSL` to start configuring the WSL and open the `Blink` example project.

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

at last, click the `flash` button and start to download the firmware.

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

Make sure to run `ESP-IDF: Add OpenOCD rules file (For Linux users)` command and `ESP-IDF: Install ESP-IDF Python Packages` command to add openOCD rules and install debug adapter python packages in the WSL before running openOCD and starting a debug session with the ESP-IDF Debug Adapter.

## Debugging

After following [USB-JTAG](#usb-jtag), press `F5` to start to debug:

<img src="../../media\tutorials\using_docker_container\container_debug.gif" alt="" height="">

# Precautions

1. When the container is created for the first time, it will prompt that the `ESP-IDF Extension` cannot be activated because it depends on the `Microsoft C++ Tools extension` extension. You only need to reopen the project in WSL again. This is because the ESP-IDF extension is dependent on the C++ Tools extension being installed first.
2. If you want to debug on Windows, you need to unplug the USB cable and re-plug in it again, otherwise the corresponding USB port cannot be found in the Windows device manager.
