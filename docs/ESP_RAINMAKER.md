# ESP Rainmaker VSCode Support

ESP-IDF VSCode Extension comes pre package with [ESP Rainmaker](https://rainmaker.espressif.com) support, and you can start using it out of the box

## Prerequisites

You need to have a ESP32-S2 board and ESP Rainmaker Account, if you don't have these please [refer here](https://rainmaker.espressif.com/docs/get-started.html)

## Connect your account from VSCode

- Click on Espressif Logo on vscode (left)
- Inside ESP Rainmaker Section, click `Connect Account`
- You need to select user id and password based login or you can use OAuth for accessing your account as well (_currently we support __Google, Apple & Github__ as our OAuth Provider_)
- Once login is successful you can view your devices and nodes associated with the account

> For OAuth you will be asked to provide permission to vscode to open url and you also need to provide permission to the broswer to open vscode back once the OAuth flow is done.

## Update device params

- Click on the edit button next to param name inside a device
- A popup will appear with current value filled in
- Update that value to desired value, and press enter

> Update params just post update request to the ESP32-S2 device via cloud and actual reflection might take some time

## Upcoming features

- Auto provisioning of chip and connect with Rainmaker Backend from vscode itself
- OTA update mechanism from vscode
