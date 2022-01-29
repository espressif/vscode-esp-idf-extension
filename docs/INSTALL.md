# Installation Guide

There are several ways to install this extension to your VSCode, easiest one is from VSCode Marketplace. However if you are looking to contribute to this project we suggest you to have install in [Source mode](#Build-from-Source-Code).

## Marketplace Installation

#### _[Link to the marketplace](https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension)_

Launch VSCode Quick Open (<kbd>⌘</kbd>+<kbd>P</kbd> on Mac or <kbd>Ctrl</kbd>+<kbd>P</kbd> on Windows) and then paste the following command and press enter

    ext install esp-idf-extension

## Install from `.vsix` file

To install from `.vsix` file:

1. Get vsix file

- From the [releases page](https://github.com/espressif/vscode-esp-idf-extension/releases/) pick the latest release and download the `esp-idf-extension-VERSION.vsix` file.
- Build vsix locally from source code as shown in [Build from Source Code](#Build-from-Source-Code)

2. Press <kbd>F1</kbd> and type `Install from VSIX` and then select the downloaded `.vsix` file.

## Build from Source Code

- Install [Node.js](https://nodejs.org/en/)
- Make sure have the [C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) from Visual Studio Code Marketplace.
- Clone this repository `git clone --recursive https://github.com/espressif/vscode-esp-idf-extension.git`
- Install all the dependencies, using `yarn`
- Press <kbd>F5</kbd> to Run with Debugger, this will launch a new VSCode Extension Development Host to debug the extension.
- Build the Visual Studio Code extension setup with `yarn package`.

## Configure the extension

- (OPTIONAL) Press <kbd>F1</kbd> and type **ESP-IDF: Select where to save configuration settings**, which can be User settings, Workspace settings or workspace folder settings. Please take a look at [Working with multiple projects](./MULTI_PROJECTS.md) for more information. Default is User settings.
- Please take a look at [SETUP](./SETUP.md) documentation or the [Install](./docs/tutorial/install.md) tutorial for details about the extension configuration.

## Uninstalling the plugin

- In Visual Studio Code, go to the Extensions tab.
- Click on the EspressifIDF extension lower right icon.
- Click Uninstall.
- Go to your `${VSCODE_EXTENSION_DIR}` and make sure to delete the Espressif IDF plugin folder

`${VSCODE_EXTENSION_DIR}` is the location of the extension:

- Windows: `%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION\`
- Linux & MacOSX: `$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/`
