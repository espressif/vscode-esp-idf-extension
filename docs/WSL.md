# Using this extension on Windows Subsystem for Linux (WSL)

Please review [Debugging using WSL](https://code.visualstudio.com/api/advanced-topics/remote-extensions#debugging-using-wsl) in Visual Studio Code documentation to learn how to access the WSL system from Visual Studio Code.

> **NOTE**: On WSL 1 serial ports are available so the behavior doesn't change from regular extension use.

For WSL 2, there is no serial port access by default. The [usbipd-win](https://github.com/dorssel/usbipd-win/releases) is required to bind Windows serial ports to the WSL serial ports.

## WSL 2 extension setup

In the WSL, Install ESP-IDF requirements for linux.

```
sudo apt-get install git wget flex bison gperf python3-pip python3-venv python3-setuptools cmake ninja-build ccache libffi-dev libssl-dev dfu-util
```

## usbipd

To complete the `usbipd` installation, the user needs to run the following commands on WSL with sudo privileges:

```c
apt install linux-tools-5.4.0-77-generic hwdata
update-alternatives --install /usr/local/bin/usbip usbip /usr/lib/linux-tools/5.4.0-77-generic/usbip 20
```

if errors occurred during the installation, run the following command as below:

```c
apt-get update
```

at this moment, local windows and WSL have the `usbipd`. Now check if they are working well on both side, with the following steps:

1. <span id="usbipd_instructions"></span>open PowerShell command prompt with administrator right and then type in the command `usbipd wsl list`:

   <img src="../media\tutorials\using_docker_container\usbipd_wsl_l.png" alt="" height="">

   as you can see, all USB devices from windows have been found and not attached sate.

2. To access the specify device which is from local Windows on WSL, the user needs to bind this device to WSL. Open PowerShell command prompt with administrator right and then type in the command `usbipd bind -b <BUSID>`:

   <img src="../media\tutorials\using_docker_container\usbipd_bind.png" alt="" height="">

   **Note**: this command only needs to type in only one time,unless the computer has restarted. where **1-1** is the device I would like to bind.

3. after binding,please attach the specify device to WSL with `usbipd wsl attach --busid 1-1` command. but open the Powershell command prompt with regular user permissions.

<img src="../media\tutorials\using_docker_container\usbipd_wsl_attach.png" alt="" height="">

4. Next check if it works well on both side and type in `dmesg | tail` command on WSL side.

   <img src="../media\tutorials\using_docker_container\wsl_demsg_tail.png" alt="" height="">

   as we can see above,**1-1** device has been attached to `ttyACM0`, that means WSL can access the **1-1** USB device from now on.

it means that `usbipd` tool has been installed successfully on both side if all commands above can work well.

The user might need to install/update pip in the virtual environment like:

```c
$IDF_TOOLS_PATH/python_env/idfX.X_pyX.X_env/bin/python ./get-pip.py
```

where X.X are IDF and python major-minor versions respectively.

5. Configure the extension as explained in [SETUP](./SETUP.md) documentation or the [Install](./tutorial/install.md) tutorial.

   > **NOTE:** Running the setup from WSL could override the Windows host machine configuration settings since it is using the User Settings by default. Consider saving settings to a workspace or workspace folder as described in the [working with multiple projects document](./MULTI_PROJECTS.md).

Create an ESP-IDF project and use extension features.
