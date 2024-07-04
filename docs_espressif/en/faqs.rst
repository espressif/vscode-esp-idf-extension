FAQs
===============================

**I have an issue or error with the Visual Studio Code extension, what can I do ?**

Take a look at the :ref:`Troubleshooting documentation <troubleshooting>` so you can see the error in the extension. You might be able to fix the issue yourself or give enough information for others to help you with the problem.

Search the `ESP-IDF extension repository <https://github.com/espressif/vscode-esp-idf-extension>`_ for Visual Studio Code first and then this forum, your issue might already be solved.

**What about questions of ESP-IDF ?**

Check out `ESP-FAQ <https://docs.espressif.com/projects/espressif-esp-faq/en/latest/>`_ or the `ESP-IDF forum <https://esp32.com>`_ itself.

**I try to build my project but there is an error and I don't know what is happening. What to do ?**

First of all, have you configure the IDE plugin/extension properly ? Make sure to review the documentation to :ref:`Install ESP-IDF and Tools <installation>`.

There was error in the setup or in your project code itself. Gather the :ref:`Troubleshooting documentation <troubleshooting>` and look for errors in these files. 

Chances are that your issue have been posted before in the `ESP-IDF github repository <https://github.com/espressif/vscode-esp-idf-extension>`_ or `ESP-IDF forum <https://esp32.com>`_ . If not, you can open a new GitHub issue or open a topic in the forum.

**How does a ESP-IDF project looks like ?**

Please take a look at the `build system documentation <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#example-project>`_ to understand how to use each file.

.. code-block::
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


**I tried flashing my project but I have an error similar to "Error: unable to open ftdi device with vid ". What to do ?**

Take a look at `Configure JTAG Interface <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/configure-ft2232h-jtag.html>`_ to make sure that your drivers are defined correctly.

On Windows, you could try using `IDF-ENV <https://github.com/espressif/idf-env>`_ just running the following command in a Powershell terminal:

.. code-block::
  Invoke-WebRequest 'https://dl.espressif.com/dl/idf-env/idf-env.exe' -OutFile .\idf-env.exe; .\idf-env.exe driver install --espressif --ftdi --silabs

Drivers are also part of the `IDF-Installer <https://dl.espressif.com/dl/esp-idf>`_.

**What is another way to maintain ESP-IDF environment?**

Using the `IDF-ENV <https://github.com/espressif/idf-env>`_ you can manage several ESP-IDF versions and launchers, install drivers, manage antivirus exclusions and more.

**While trying to debug my project I have encountered an issue. What should I do?**

First review the `ESP-IDF JTAG Debugging documentation <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/index.html#jtag-debugging-setup-openocd>`_ to understand how debugging works and the expected configuration of your device.
The debugger is connected to openOCD. Please take a look at `OpenOCD Troubleshooting FAQ <https://github.com/espressif/openocd-esp32/wiki/Troubleshooting-FAQ>`_ for any openOCD errors you might have encountered.

Check your IDE integration log files and post an issue in the respective GitHub repository if the issue is not related to openOCD itself. Take a look at the :ref:`Troubleshooting documentation <troubleshooting>` so you can see the error in the extension.

**I have an issue flashing my Espressif device, What should i do?**

Best start would be to follow the Espressif's `Esptool Troubleshooting documentation <https://docs.espressif.com/projects/esptool/en/latest/esp32/troubleshooting.html>`_.