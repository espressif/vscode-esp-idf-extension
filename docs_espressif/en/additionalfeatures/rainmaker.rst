ESP RainMaker
=============

:link_to_translation:`zh_CN:[中文]`

This tutorial shows you how to integrate the `ESP RainMaker <https://rainmaker.espressif.com>`_ feature in the ESP-IDF extension.

You need an Espressif device and an ESP RainMaker account. If you do not have these, please refer `here <https://rainmaker.espressif.com/docs/get-started.html>`_.

Click ``ESP-IDF: Explorer`` in the Visual Studio Code activity bar. In the ``RainMaker`` section, click the ``Connect RainMaker``.

.. image:: ../../../media/tutorials/rainmaker/connect.png

You will be prompted to choose an authentication method to connect with RainMaker. You can use your RainMaker account username and password or an OAuth app like Google, GitHub, or Apple.

.. note::

    For OAuth to work properly, you must grant permission to Visual Studio Code and the browser to reopen Visual Studio Code after the OAuth flow is complete.

.. image:: ../../../media/tutorials/rainmaker/auth_method.png

You will see a list of nodes associated with your account. Next to the account name, there are icons for ``Add new node`` and ``Unlink RainMaker account``. Next to each device, there is a ``Remove this node`` icon. Below, you can see the type of RainMaker device (e.g., ``Switch``) with a set of parameters you can modify (e.g., ``Name`` and ``Power``), using the ``Update param for this device`` icon.

.. image:: ../../../media/tutorials/rainmaker/nodes_info.png
