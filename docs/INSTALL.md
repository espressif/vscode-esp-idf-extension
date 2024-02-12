# Installation Guide

There are several ways to install this extension to your VS Code, easiest one is from VSCode Marketplace. However if you are looking to contribute to this project we suggest you to have install in [Source Mode](#Build-from-Source-Code).

## Marketplace Installation

#### _[Link to the Marketplace](https://marketplace.visualstudio.com/items?itemName=espressif.esp-idf-extension)_

Launch VS Code Quick Open (<kbd>⌘</kbd>+<kbd>P</kbd> on Mac or <kbd>Ctrl</kbd>+<kbd>P</kbd> on Windows) and then paste the following command and press enter

    ext install esp-idf-extension

## Install from `.vsix` File

To install from `.vsix` File:

1. Get the .vsix File

- From the [releases page](https://github.com/espressif/vscode-esp-idf-extension/releases/) pick the latest release and download the `esp-idf-extension-VERSION.vsix` file.
- Build .vsix locally from source code as shown in [Build from Source Code](#Build-from-Source-Code)

2. Press <kbd>F1</kbd> and type `Install from VSIX` and then select the downloaded `.vsix` file.

## Build from Source Code

- Install [Node.js](https://nodejs.org/en/)
- Clone this repository `git clone --recursive https://github.com/espressif/vscode-esp-idf-extension.git`
- Install all the dependencies, using `yarn`
- Press <kbd>F5</kbd> to Run with Debugger, this will launch a new VS Code Extension Development Host to debug the extension.
- Build the Visual Studio Code extension setup with `yarn package`.

## Configure the Extension

- (OPTIONAL) Press <kbd>F1</kbd> and type **ESP-IDF: Select Where to Save Configuration Settings**, which can be User Settings, Workspace Settings or Workspace Folder Settings. Please take a look at [Working with Multiple Projects](./MULTI_PROJECTS.md) for more information. Default is User Settings.
- Please take a look at [SETUP](./SETUP.md) documentation or the [Install](./docs/tutorial/install.md) tutorial for details about the extension configuration.

## Uninstalling the Plugin

- In Visual Studio Code, go to the Extensions tab.
- Click on the ESP-IDF extension lower right icon.
- Click Uninstall.
- Go to your `${VSCODE_EXTENSION_DIR}` and make sure to delete the ESP-IDF plugin folder

`${VSCODE_EXTENSION_DIR}` is the location of the extension:

- Windows: `%USERPROFILE%\.vscode\extensions\espressif.esp-idf-extension-VERSION\`
- Linux & MacOSX: `$HOME/.vscode/extensions/espressif.esp-idf-extension-VERSION/`
