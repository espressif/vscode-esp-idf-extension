CMakeLists.txt Editor
=====================

.. warning::

    This will override any existing code in the file with the one generated in the editor. If you have any code not included in the schema (or single line comments), use a regular text editor instead.

When you right-click any ``CMakeLists.txt`` file, this extension provides a custom ``CMakeLists.txt`` editor to fill an ESP-IDF project and component registration as specified in:

- `Project CMakeLists File <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#project-cmakelists-file>`_
- `Component CMakeLists Files <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#component-cmakelists-files>`_

You need to choose which kind of ``CMakeLists.txt`` file (project or component) to edit. There are two types of input: a simple string and an array of strings, such as Component Sources (SRCS).

.. note::

    * All inputs are described in the `CMakeLists.txt schema <https://github.com/espressif/vscode-esp-idf-extension/blob/master/cmakeListsSchema.json>`_.
    * This editor doesn't support all CMake functions and syntaxes. Use this editor only for simple ``CMakeLists.txt`` options such as component registration (using idf_component_register) and basic project elements. For more customization or advanced ``CMakeLists.txt``, consider reviewing `ESP-IDF Build System <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html>`_. Also, review **CMakeLists.txt editor schema** for a list of supported code.

For this tutorial we will use the blink example.

1.  Right-click the ``<project_path>/blink/CMakeLists.txt``, click ``ESP-IDF: CMakeLists.txt Editor`` and select ``Project CMakeLists.txt``.

    .. image:: ../../../media/tutorials/cmakelists_editor/cmakelists_editor.png

2.  Add new elements by selecting them from the ``New Element`` dropdown and clicking the ``Add`` button. For simplicity, change the project name and save changes with the ``Save`` button.

    When re-opening the file in a regular text editor, changes are reflected.

3.  Create a new ESP-IDF component in this project to modify its ``CMakeLists.txt``. Go to menu ``View`` > ``Command Palette``, type ``ESP-IDF: Create New ESP-IDF Component``, and enter the new component name.

4.  A new component will be created in ``<project_path>/blink/components/<component_name>``. Open ``CMakeLists.txt`` in the regular text editor, you will see an ``idf_component_register`` method with:

    .. code-block:: C

        idf_component_register(SRCS "my_component.c"
                               INCLUDE_DIRS "include")

    Right-click ``<project_path>/blink/components/<component_name>/CMakeLists.txt``, click ``ESP-IDF: CMakeLists.txt Editor`` and select ``Component CMakeLists.txt``.

    .. image:: ../../../media/tutorials/cmakelists_editor/components_editor.png

5.  Observe that some fields are of array types such as **Component Sources (SRCS)** since you can add several paths, while others are just string input fields (as described in ``cmakeListsSchema.json``).

    .. note::

        While using this extension, source files are added and deleted automatically from the same directory where ``CMakeLists.txt`` is located without user intervention.

6.  Add a new element ``Public Component Requirements for the Component (REQUIRES)`` and click the ``Add`` button. A new array field will appear.

7.  As described in `Component CMakeLists Files <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#component-cmakelists-files>`_, ``REQUIRES`` is used to list the component dependencies. Type ``mbedtls`` and click the ``+`` button (you can also press enter after typing).

8.  Click the ``Save`` button and close the ``CMakeLists.txt`` editor. If you open ``<project_path>/blink/components/<component_name>/CMakeLists.txt`` in a regular text editor, you will see:

    .. code-block:: C
  
        idf_component_register(SRCS "my_component.c"
                               INCLUDE_DIRS "include"
                               REQUIRES "mbedtls")

Reference Links
---------------

To review all fields used in the ``CMakeLists.txt`` editor, go to:

- `ESP-IDF Project CMakeLists Files <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#project-cmakelists-file>`_ 

- `ESP-IDF Component CMakeLists Files <https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/build-system.html#component-cmakelists-files>`_
