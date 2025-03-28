Using WSL in Windows
====================

:link_to_translation:`zh_CN:[中文]`

This tutorial guides you on developing projects using Visual Studio Code with **ESP-IDF extension** and **Remote - WSL** to implement all features of these extensions in WSL.

Install the following tools before starting the project:

1. Windows WSL (see installation steps below)
2. `Visual Studio Code <https://code.visualstudio.com>`_
3. `usbipd-win <https://github.com/dorssel/usbipd-win/releases>`_

Installing Ubuntu on Windows (WSL)
----------------------------------

To install WSL, run:

.. code-block::

    wsl --install

Update the WSL kernel with:

.. code-block::

    wsl --update

Check the available WSL distributions using the ``Powershell`` command prompt:

.. code-block::

    wsl -l -o

.. image:: ../../../media/tutorials/using_docker_container/wsl-l-o.png

To install a Ubuntu distribution in WSL on Windows, type the following command:

.. code-block::

    wsl --install --distribution Ubuntu

``usbipd-win`` in WSL
---------------------

To access USB, serial, and JTAG devices from the local Windows system, you must install ``usbipd-win``. Without it, downloading, monitoring, and debugging on the IDF Docker image is not possible. The installation process is similar to other Windows applications and will not be detailed here.

After installing all the required tools, configure WSL as follows:

Check Ubuntu on Windows (WSL)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1.  Verify that the current WSL version is 2.

    .. code-block::

        wsl -l -v

    .. image:: ../../../media/tutorials/using_docker_container/wsl-l-v.png

2.  If the version is not 2, upgrade to version 2.

    .. code-block::

        wsl --set-version Ubuntu 2

3.  Set the Ubuntu distribution as the default.

    .. code-block::

        wsl -s Ubuntu

4.  Confirm the settings using the ``wsl --status`` command.

    .. image:: ../../../media/tutorials/using_docker_container/wsl-status.png

Adding the Required Linux Packages in WSL
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Install `ESP-IDF Requirements for Linux <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/get-started/linux-setup.html#install-prerequisites>`_.

.. code-block::

    sudo apt-get install git wget flex bison gperf python3-pip python3-venv python3-setuptools cmake ninja-build ccache libffi-dev libssl-dev dfu-util

1.  Install ``usbipd`` in the Powershell command prompt:

    .. code-block::

        winget install usbipd

2.  Configure the USB serial device to connect to WSL using ``usbipd``.

3.  Open the PowerShell command prompt with administrator rights and then enter the following command to get a list of USB serial devices.

    .. code-block::

        usbipd list

4.  To access a specified device from Windows on WSL locally, bind the device with ``usbipd``. Open the PowerShell command prompt with administrator rights and enter the following command.

    .. code-block::

        usbipd bind --busid <BUSID>

    .. note::

        Use this command only once unless the computer restarts. **1-1** is the device’s ``<BUSID>`` you want to bind.

5.  After binding, attach the specified device to WSL with the following command in the PowerShell command prompt.

    .. code-block::

        usbipd attach --wsl --busid <BUSID>

6.  Finally, verify the connection on the WSL side by entering the following command.

    .. code-block::

        dmesg | tail

    .. image:: ../../../media/tutorials/using_docker_container/wsl_demsg_tail.png

As shown above, the **1-1** device is attached to ``ttyACM0``, indicating that WSL can now access the **1-1** USB device.

Install Remote WSL Extension in Visual Studio Code
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Install the **Remote - WSL**, **Remote Development** and **ESP-IDF** extensions as shown below.

.. image:: ../../../media/tutorials/using_docker_container/remote_wsl.png

.. image:: ../../../media/tutorials/using_docker_container/remote_development.png

.. image:: ../../../media/tutorials/using_docker_container/esp-idf.png

Open Project in WSL
~~~~~~~~~~~~~~~~~~~

Start your development by clicking the ``><`` button at the bottom left of Visual Studio Code. Select **Open Folder in WSL** to configure the WSL and open the ``Blink`` example project.

Configure the ESP-IDF extension inside WSL as described in :ref:`Install ESP-IDF and Tools <installation>`.

.. note::

    Running the setup from WSL could override the Windows host machine configuration settings since it uses **User Settings** by default. Consider saving settings to a **workspace** or **workspace folder**.

You can now use the ``Blink`` example project for building, flashing, monitoring, debugging, etc.

Building Your Project
~~~~~~~~~~~~~~~~~~~~~

For example, to use ESP32-C3, change the target device from ``esp32`` to ``esp32c3`` as shown below:

.. image:: ../../../media/tutorials/using_docker_container/device_target_esp32_c3.png

Next, start building the example project:

.. image:: ../../../media/tutorials/using_docker_container/container_build.gif

Flashing to your Device
~~~~~~~~~~~~~~~~~~~~~~~

After building, flash the firmware using one of the following methods.

External USB-to-Serial
~~~~~~~~~~~~~~~~~~~~~~

Follow the ``usbipd`` instructions as described. Here, ``Silicon Labs CP210x USB to UART Bridge`` is used as an example and is attached to the Docker image.

.. image:: ../../../media/tutorials/using_docker_container/wsl_demsg_tail_usb_serial.png

This device is attached to ``ttyUSB0``, so you need to update ``idf.port`` accordingly.

.. image:: ../../../media/tutorials/using_docker_container/ttyUSB0.png

The container does not recognize the configuration change immediately.

.. image:: ../../../media/tutorials/using_docker_container/unkown_ttyUSB0.png

Reopen the container by selecting ``Reopen Folder Locally`` to reload the new configuration.

.. image:: ../../../media/tutorials/using_docker_container/container_reopen.gif

Finally, click the ``Flash`` button to download the firmware.

.. image:: ../../../media/tutorials/using_docker_container/container_flash_uart.gif

Internal USB-to-Serial
~~~~~~~~~~~~~~~~~~~~~~

Similar to `External USB-to-Serial`_, the only difference is the device name attached, where the external USB-to-Serial is ``ttyUSBx``, while the internal USB-to-Serial is ``ttyACMx``.

.. image:: ../../../media/tutorials/using_docker_container/container_flash_uart_internal.gif

USB-to-JTAG
~~~~~~~~~~~

Same as `External USB-to-Serial`_ and `Internal USB-to-Serial`_, but it needs to configure the following extra parameters:

.. image:: ../../../media/tutorials/using_docker_container/extra_parameters.png

The interface is the same as `Internal USB-to-Serial`_, which is ``ttyACMx``:

.. image:: ../../../media/tutorials/using_docker_container/container_flash_jtag.gif

Additional Steps for Debugging
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Copy `OpenOCD udev rules files <https://github.com/espressif/openocd-esp32/blob/master/contrib/60-openocd.rules>`_ and paste them to the ``/etc/udev/rules.d`` directory before running OpenOCD and starting a debug session.

Debugging
~~~~~~~~~

After configuring `USB-to-JTAG`_, press ``F5`` to start to debugging:

.. image:: ../../../media/tutorials/using_docker_container/container_debug.gif

Precautions
~~~~~~~~~~~

1. To debug on Windows, unplug and re-plug the USB cable to ensure the USB port is recognized in the Windows Device Manager.
2. Keep Docker Desktop for Windows open during container development.
