# Using this Extension on Windows Subsystem for Linux (WSL)

# Required tools

1. WSL 2
2. Ubuntu on Windows using WSL (Next section)
3. [Visual Studio Code](https://code.visualstudio.com/)
4. [usbipd-win](https://github.com/dorssel/usbipd-win/releases)

# Ubuntu on Windows

If you don't have WSL installed run

```c
wsl --install
```

Update the WSL kernel with

```c
wsl --update
```

Check WSL available distributions list with the `Powershell` command prompt, as below:

```c
wsl -l -o
```

<img src="../../media\tutorials\using_docker_container\wsl-l-o.png" alt="" height="">

You can install Ubuntu as below:

```c
wsl --install --distribution　Ubuntu
```

Make sure to upgrade the distribution to WSL version 2 with:

```c
wsl --set-version Ubuntu 2
```

Set the distribution as default:

```c
wsl -s Ubuntu
```

Inside the WSL, Install ESP-IDF requirements for [Linux](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/linux-setup.html#install-prerequisites).

```c
sudo apt-get install git wget flex bison gperf python3-pip python3-venv python3-setuptools cmake ninja-build ccache libffi-dev libssl-dev dfu-util
```

# usbipd

Install usbipd in Powershell command prompt:

```c
winget install usbipd
```

Now configure the USB serial device to be able to connect to the WSL with `usbipd`:

1. Open PowerShell command prompt with administrator rights and then type in the command `usbipd list` for a list of USB serial devices.

2. To access the specify device which is from local Windows on WSL, the user needs to bind this device to WSL. Open PowerShell command prompt with administrator right and then type in the command `usbipd bind -b <BUSID>`:

    > **Note**: this command only needs to type in only one time,unless the computer has restarted.

3. Attach the specify device to WSL with `usbipd attach --wsl --busid <BUSID>` command. but open the Powershell command prompt with regular user permissions.

4. Check if it works well by typing in `dmesg | tail` command on WSL side.

   <img src="../media\tutorials\using_docker_container\wsl_demsg_tail.png" alt="" height="">

   as we can see above,**1-1** device has been attached to `ttyACM0`, that means WSL can access the **1-1** USB device `<BUSID>` from now on.

it means that `usbipd` tool has been installed successfully on both side if all commands above can work well.

The user might need to install/update pip in the virtual environment like:

# Visual Studio Code

To develop in WSL, install the [Remote - WSL](ttps://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl) and [ESP-IDF](https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension) extensions which are shown below:

<img src="../media\tutorials\using_docker_container\remote_wsl.png" alt="" width="400">

<img src="../media\tutorials\using_docker_container\esp-idf.png" alt="" width="400">


# **Configure the ESP-IDF extension as explained in the [Install](./tutorial/install.md) tutorial or in [Setup](./SETUP.md) documentation.**

   > **Note**: Running the setup from WSL could override the Windows host machine configuration settings since it is using the User Settings by default. Consider saving settings to a workspace or workspace folder with the **ESP-IDF: Select where to Save Configuration Settings** command as described in the [working with multiple projects document](./MULTI_PROJECTS.md).

Create an ESP-IDF Project and use ESP-IDF extension features. You can follow the [WSL Tutorial](./tutorial/wsl.md#practice) for an example.
