# Contributing to ESP-IDF Visual Studio Code Extension

:tada: Welcome and thank you for taking time to contribute to this project.

There are many ways that you can contribute, and this document will provide you a bird eye view of how to get going about it.

## Build from Source Code

- Install [Node.js](https://nodejs.org/en/)
- Make sure have the [C/C++ Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.cpptools) from Visual Studio Code Marketplace.
- Clone this repository `git clone --recursive https://github.com/espressif/vscode-esp-idf-extension.git`
- Install all the dependencies using `yarn`.
- Open the project in Visual Studio Code and press <kbd>F5</kbd> to Run with Debugger, this will launch a new VSCode Extension Development Host to debug the extension.
- Compile project with `yarn package` to generate a [visual studio code installer (vsix)](https://code.visualstudio.com/docs/editor/extension-gallery#_install-from-a-vsix).

## Build .vsix Locally

- Build the Visual Studio Code extension setup with `yarn package`.

## Language Contribution (i18N contribution)

Currently we support `Chinese`, `English`, `Spanish` and `Russian` and planning to add many other languages.

If you are willing to contribute a language translation, please read the [language contribution guideline](./LANG_CONTRIBUTE.md).

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [vscode@espressif.com](mailto:vscode@espressif.com).

## Reporting Issues

When you are about to open a new issue please make sure that you have scanned through the already opened issues to see if the issue or the feature request is already filed.

### Already Existing Issue

If you find your issue or feature request is already filed then properly comment or add reaction like "+1", furthermore you can subscribe to the issue to keep yourself up to date about the progress.

### Issue Not Existing

If you can't find the issue in the already opened issues then please make sure to file a [bug report or feature request](https://github.com/espressif/vscode-esp-idf-extension/issues), while opening a issue or feature request please follow the templates presented to you.

### Git Commit Messages

- Reference the issue in the commit message just after the first line
- Consider starting the commit message with an [applicable emoji](https://gitmoji.carloscuesta.me)
  - :art: `:art:` Improving structure / format of the code.
  - :pencil2: `:pencil2:` Fixing typos.
  - :zap: `:zap:` Improving performance.
  - :fire: `:fire:` Removing files.
  - :bug: `:bug:` Fixing a bug.
  - :sparkles: `:sparkles:` Introducing new feature.
  - :pencil: `:pencil:` Writing docs.
  - :lipstick: `:lipstick:` Updating the web-view UI or style files
  - :white_check_mark: `:white_check_mark:` Updating tests.
  - :lock: `:lock:` Fixing security issues including node dependencies audit.
  - :apple: `:apple:` Fixing something on macOS.
  - :penguin: `:penguin:` Fixing something on Linux.
  - :checkered_flag: `:checkered_flag:` Fixing something on Windows.
  - :construction: `:construction:` Work in progress.
  - :see_no_evil: `:see_no_evil:` Adding or updating a .gitignore file
  - :twisted_rightwards_arrows: `:twisted_rightwards_arrows:` Merging branches.
  - :rewind: `:rewind:` Reverting changes.
  - :bookmark: `:bookmark:` Releasing / Version tags.
  - :heavy_plus_sign: `:heavy_plus_sign:` Adding a dependency.
  - :heavy_minus_sign: `:heavy_minus_sign:` Removing a dependency.
  - :poop: `:poop:` Writing bad code that needs to be improved, just kidding please try to avoid this!

## Forum

If you are lost at any point you can always ask question, help and suggestion in the [ESP32 forum](https://esp32.com/viewforum.php?f=40), besides creating Github Issues. For all the [ESP-IDF](https://github.com/espressif/esp-idf) related concerns please follow [their suggested channel](https://esp32.com) of communications.
