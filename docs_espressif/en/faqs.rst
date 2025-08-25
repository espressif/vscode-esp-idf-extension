FAQs
====

I have an issue or error with the Visual Studio Code extension. What can I do?
-------------------------------------------------------------------------------

Refer to the :ref:`Troubleshooting documentation <troubleshooting-section>` to identify the error in the extension. You might resolve the issue yourself or provide enough information for others to assist you.

Search the `ESP-IDF extension repository <https://github.com/espressif/vscode-esp-idf-extension>`_ for Visual Studio Code first, and then check the forum. Your issue might already be resolved.

--------------

What about questions regarding ESP-IDF?
---------------------------------------

Consult the `ESP-FAQ <https://docs.espressif.com/projects/espressif-esp-faq/en/latest/>`_ or the `ESP-IDF forum <https://esp32.com>`_.

--------------

I try to build my project, but there is an error, and I don't know what is happening. What should I do?
---------------------------------------------------------------------------------------------------------

Ensure you have configured the IDE plugin/extension properly. Review the documentation to :ref:`Install ESP-IDF and Tools <installation>`.

The error might be in the setup or your project code. Refer to the :ref:`Troubleshooting documentation <troubleshooting-section>` and check for errors in these files.

Your issue might have been posted before in the `ESP-IDF GitHub repository <https://github.com/espressif/vscode-esp-idf-extension>`_ or `ESP-IDF forum <https://esp32.com>`_. If not, you can open a new GitHub issue or start a topic in the forum.

--------------

How does an ESP-IDF project look?
----------------------------------

Review the `build system documentation <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#example-project>`_ to understand how to use each file.

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

--------------

I tried flashing my project but encountered an error similar to "Error: unable to open ftdi device with vid." What should I do?
-------------------------------------------------------------------------------------------------------------------------------

Check the `Configure JTAG Interface <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/configure-ft2232h-jtag.html>`_ to ensure your drivers are correctly defined.

On Windows, try using `IDF-ENV <https://github.com/espressif/idf-env>`_ by running the following command in a PowerShell terminal:

.. code-block::

    Invoke-WebRequest 'https://dl.espressif.com/dl/idf-env/idf-env.exe' -OutFile .\idf-env.exe; .\idf-env.exe driver install --espressif --ftdi --silabs

Drivers are also included in the `IDF-Installer <https://dl.espressif.com/dl/esp-idf>`_.

--------------

What is another way to maintain the ESP-IDF environment?
-----------------------------------------------------------

Using `IDF-ENV <https://github.com/espressif/idf-env>`_, you can manage several ESP-IDF versions and launchers, install drivers, manage antivirus exclusions, and more.

--------------

While trying to debug my project, I encountered an issue. What should I do?
-----------------------------------------------------------------------------

First, review the `ESP-IDF JTAG Debugging documentation <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/jtag-debugging/index.html#jtag-debugging-setup-openocd>`_ to understand how debugging works and the expected configuration of your device. The debugger connects to OpenOCD. Check the `OpenOCD Troubleshooting FAQ <https://github.com/espressif/openocd-esp32/wiki/Troubleshooting-FAQ>`_ for any OpenOCD errors you might have encountered.

Check your IDE integration log files and post an issue in the respective GitHub repository if the issue is not related to OpenOCD. Refer to the :ref:`Troubleshooting documentation <troubleshooting-section>` to identify the error in the extension.

--------------

I have an issue flashing my Espressif device. What should I do?
------------------------------------------------------------------

Start by following Espressif's `Esptool Troubleshooting documentation <https://docs.espressif.com/projects/esptool/en/latest/esp32/troubleshooting.html>`_.
