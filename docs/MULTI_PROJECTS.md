# Working with Multiple Projects

For big projects, a user will typically have one or more projects to build, flash or monitor. The ESP-IDF Extension follows the [Visual Studio Code Workspace File Schema](https://code.visualstudio.com/docs/editor/multi-root-workspaces#_workspace-file-schema) to identify all projects folders inside the current workspace (which would be the root folder). Please take a look at [Creating User and Workspace Settings](https://code.visualstudio.com/docs/getstarted/settings#_creating-user-and-workspace-settings).

Configuration settings are overriden as:

1. Workspace folder configuration settings in `${workspaceFolder}/.vscode/settings.json`
2. Workspace configuration settings defined in the workspace's `<name>.code-workspace` file as shown below.
3. User settings defined in
   - **Windows** `%APPDATA%\Code\User\settings.json`
   - **MacOS** `$HOME/Library/Application Support/Code/User/settings.json`
   - **Linux** `$HOME/.config/Code/User/settings.json`

This extension uses the `idf.saveScope` configuration setting to determine where to save configuration settings in features such as the Setup Wizard.

You can select the current project by clicking the **ESP-IDF Current Project** Item in the Visual Studio Code Status bar or by pressing F1 and typing **ESP-IDF: Pick a Workspace Folder for IDF Commands** which will determine the folder where to obtain the ESP-IDF Settings such as current device USB port, ESP-IDF path, etc.

Projects folders and workspace level settings are defined in some `<name>.code-workspace` file such as:

```JSON
{
  "folders": [
    {
      "path": "./project1"
    },
    {
      "path": "./project2"
    }
  ],
  "settings": {
    "idf.port": "/dev/ttyUSB1",
    "idf.espIdfPath": "${env:HOME}/esp/esp-idf"
  }
}
```

Settings in the root folder's `.code-workspace` can be used when your **ESP-IDF Current Project** directory doesn't contain a `.vscode/settings.json` file.

If you want to open a project with multiple subprojects in Visual Studio Code, click Menu **File** then **Open Workspace** which will open a window to select the `.code-workspace` file describing your workspace.
You can either manually create this `.code-workspace` file and define all sub folders (projects) or when you click Menu **File** --> **Save Workspace as...** which doesn't automatically add any folder inside the current directory.
You can add a folder to the workspace when you click Menu **File** --> **Add Folder to Workspace...**.

> **NOTE:** You still need to manually select the corresponding debug configuration in the Debug tab of your current workspace folder. There is a project directory suffix on each debug configuration.

## Example

Consider the following multiple projects directory tree example:

```
---> /my-projects-root
------> /my-projects-root/project1
------> /my-projects-root/project2
------------> /my-projects-root/project2/.vscode/settings.json
```

and `my-ws.code-workspace`:

```json
{
  "folders": [
    {
      "path": "/my-projects-root/project1"
    },
    {
      "path": "/my-projects-root/project2"
    }
  ],
  "settings": {
    "idf.port": "/dev/ttyUSB1",
    "idf.espIdfPath": "${env:HOME}/esp/esp-idf"
  }
}
```

1. If you open Visual Studio Code, click Menu **File** and run **Open Workspace** and open `my-ws.code-workspace` you will see just the folders defined in this workspace (`/my-projects-root/project1` and `/my-projects-root/project2`).
   - For `project1`, Visual Studio Code will use the settings from `my-ws.code-workspace` first then other required settings from the User Settings.
   - For `project2`, Visual Studio Code will use those settings from `/my-projects-root/project2/.vscode/settings.json` first, then all required (and not found) settings from `my-ws.code-workspace` and finally in the Visual Studio Code User settings.
2. If you just open the `/my-projects-root` or `/my-projects-root/project1` directory Visual Studio Code will use the User Settings.
   - If you just open the `/my-projects-root/project2` directory Visual Studio Code will use the `/my-projects-root/project2/.vscode/settings.json` then other required settings from the User Settings.
     > **NOTE:** If you open `/my-projects-root`, any of the sub projects will not be recognized as Workspace Folders, you need to add them to `my-ws.code-workspace` (manually or using **File** --> **Add Folder to Workspace...**) and open this workspace as specified before.
