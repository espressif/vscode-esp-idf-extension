// ProjectConfigurationManager.ts
import * as vscode from "vscode";
import * as utils from "../utils"; // Adjust import path as needed
import { ESP } from "../config"; // Adjust import path as needed
import { ConfserverProcess } from "../espIdf/menuconfig/confServerProcess"; // Adjust import path as needed
import { CommandKeys, createCommandDictionary } from "../cmdTreeView/cmdStore"; // Adjust import path as needed
import { createStatusBarItem } from "../statusBar"; // Adjust import path as needed
import { getIdfTargetFromSdkconfig } from "../workspaceConfig"; // Adjust import path as needed
import { Logger } from "../logger/logger"; // Adjust import path as needed
import { getProjectConfigurationElements } from "./index"; // Adjust import path as needed

export class ProjectConfigurationManager {
  private readonly configFilePath: string;
  private configVersions: string[] = [];
  private configWatcher: vscode.FileSystemWatcher;
  private statusBarItems: { [key: string]: vscode.StatusBarItem };
  private workspaceRoot: vscode.Uri;
  private context: vscode.ExtensionContext;
  private commandDictionary: any;

  constructor(
    workspaceRoot: vscode.Uri,
    context: vscode.ExtensionContext,
    statusBarItems: { [key: string]: vscode.StatusBarItem }
  ) {
    this.workspaceRoot = workspaceRoot;
    this.context = context;
    this.statusBarItems = statusBarItems;
    this.commandDictionary = createCommandDictionary();

    this.configFilePath = vscode.Uri.joinPath(
      workspaceRoot,
      ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
    ).fsPath;

    this.configWatcher = vscode.workspace.createFileSystemWatcher(
      this.configFilePath,
      false,
      false,
      false
    );

    this.initialize();
    this.registerEventHandlers();
  }

  private initialize(): void {
    if (!utils.fileExists(this.configFilePath)) {
      // File doesn't exist - this is expected, so initialize cleanly.
      this.configVersions = [];
      return;
    }
    // File EXISTS, now try to read and parse it.
    try {
      const configContent = utils.readFileSync(this.configFilePath);

      // Handle edge case: File exists but is empty
      if (!configContent || configContent.trim() === "") {
        Logger.warn(
          `Project configuration file is empty: ${this.configFilePath}`
        );
        this.configVersions = [];
        return;
      }

      const configData = JSON.parse(configContent);
      this.configVersions = Object.keys(configData);

      // Show message only if configurations were successfully loaded
      if (this.configVersions.length > 0) {
        vscode.window.showInformationMessage(
          `Loaded ${
            this.configVersions.length
          } project configuration(s): ${this.configVersions.join(", ")}`
        );
      } else {
        Logger.info(
          `Project configuration file loaded but contains no configurations: ${this.configFilePath}`
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error reading or parsing project configuration file (${this.configFilePath}): ${error.message}`
      );
      Logger.errorNotify(
        `Failed to parse project configuration file: ${this.configFilePath}`,
        error,
        "ProjectConfigurationmanager initialize"
      );
      this.configVersions = []; // Ensure clean state on error
    }
  }

  private registerEventHandlers(): void {
    // Handle file changes
    const changeDisposable = this.configWatcher.onDidChange(
      async () => await this.handleConfigFileChange()
    );

    // Handle file deletion
    const deleteDisposable = this.configWatcher.onDidDelete(
      async () => await this.handleConfigFileDelete()
    );

    // Handle file creation
    const createDisposable = this.configWatcher.onDidCreate(
      async () => await this.handleConfigFileCreate()
    );

    this.context.subscriptions.push(
      changeDisposable,
      deleteDisposable,
      createDisposable
    );
  }

  private async handleConfigFileChange(): Promise<void> {
    try {
      const configData = JSON.parse(utils.readFileSync(this.configFilePath));
      const currentVersions = Object.keys(configData);

      // Find added versions
      const addedVersions = currentVersions.filter(
        (v) => !this.configVersions.includes(v)
      );

      // Find removed versions
      const removedVersions = this.configVersions.filter(
        (v) => !currentVersions.includes(v)
      );

      if (addedVersions.length > 0) {
        vscode.window.showInformationMessage(
          `New versions added: ${addedVersions.join(", ")}`
        );
      }

      if (removedVersions.length > 0) {
        vscode.window.showInformationMessage(
          `Versions removed: ${removedVersions.join(", ")}`
        );
      }

      // Update versions for next comparison
      this.configVersions = currentVersions;

      // Get the current selected configuration
      const currentSelectedConfig = ESP.ProjectConfiguration.store.get<string>(
        ESP.ProjectConfiguration.SELECTED_CONFIG
      );

      // Update the configuration in store if it still exists
      if (
        currentSelectedConfig &&
        currentVersions.includes(currentSelectedConfig)
      ) {
        await this.updateConfiguration(
          currentSelectedConfig,
          configData[currentSelectedConfig]
        );
      } else {
        this.setInvalidConfigurationStatus();
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error parsing config file: ${error.message}`
      );
    }
  }

  private async handleConfigFileDelete(): Promise<void> {
    // When the config file is deleted, we should show an invalid configuration
    this.setInvalidConfigurationStatus();
  }

  private async handleConfigFileCreate(): Promise<void> {
    // When the config file is created, we should reload it
    try {
      const configData = JSON.parse(utils.readFileSync(this.configFilePath));
      this.configVersions = Object.keys(configData);

      // If we have versions, select the first one or keep the previous selection if valid
      if (this.configVersions.length > 0) {
        const currentSelectedConfig = ESP.ProjectConfiguration.store.get<
          string
        >(ESP.ProjectConfiguration.SELECTED_CONFIG);

        if (
          currentSelectedConfig &&
          this.configVersions.includes(currentSelectedConfig)
        ) {
          await this.updateConfiguration(
            currentSelectedConfig,
            configData[currentSelectedConfig]
          );
        } else {
          // Select first configuration if current selection is invalid
          await this.updateConfiguration(
            this.configVersions[0],
            configData[this.configVersions[0]]
          );
        }
      } else {
        this.setInvalidConfigurationStatus();
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error parsing newly created config file: ${error.message}`
      );
      this.setInvalidConfigurationStatus();
    }
  }

  private setInvalidConfigurationStatus(): void {
    const statusBarItemName = "Invalid Configuration";
    const statusBarItemTooltip =
      "Invalid configuration path. Click to modify project configuration";

    if (this.statusBarItems["projectConf"]) {
      this.statusBarItems["projectConf"].dispose();
    }

    this.statusBarItems["projectConf"] = createStatusBarItem(
      `$(${
        this.commandDictionary[CommandKeys.SelectProjectConfiguration].iconId
      }) ${statusBarItemName}`,
      statusBarItemTooltip,
      "espIdf.projectConf",
      99,
      this.commandDictionary[CommandKeys.SelectProjectConfiguration]
        .checkboxState
    );
  }

  private async updateConfiguration(
    configName: string,
    configData: any
  ): Promise<void> {
    // Update the configuration in store
    ESP.ProjectConfiguration.store.set(
      ESP.ProjectConfiguration.SELECTED_CONFIG,
      configName
    );

    // Update the configuration data
    ESP.ProjectConfiguration.store.set(configName, configData);

    // Update UI
    if (this.statusBarItems["projectConf"]) {
      this.statusBarItems["projectConf"].dispose();
    }

    this.statusBarItems["projectConf"] = createStatusBarItem(
      `$(${
        this.commandDictionary[CommandKeys.SelectProjectConfiguration].iconId
      }) ${configName}`,
      this.commandDictionary[CommandKeys.SelectProjectConfiguration].tooltip,
      CommandKeys.SelectProjectConfiguration,
      99,
      this.commandDictionary[CommandKeys.SelectProjectConfiguration]
        .checkboxState
    );

    // Update related configurations
    await getIdfTargetFromSdkconfig(
      this.workspaceRoot,
      this.statusBarItems["target"]
    );
    await utils.setCCppPropertiesJsonCompileCommands(this.workspaceRoot);
    ConfserverProcess.dispose();
  }

  /**
   * Method to select a project configuration via command
   */
  public async selectProjectConfiguration(): Promise<void> {
    try {
      const projectConfigurations = await getProjectConfigurationElements(
        this.workspaceRoot
      );

      if (
        !projectConfigurations ||
        Object.keys(projectConfigurations).length === 0
      ) {
        const emptyOption = await vscode.window.showInformationMessage(
          vscode.l10n.t("No project configuration found"),
          "Open editor"
        );

        if (emptyOption === "Open editor") {
          vscode.commands.executeCommand("espIdf.projectConfigurationEditor");
        }
        return;
      }

      const selectConfigMsg = vscode.l10n.t("Select configuration to use:");
      let quickPickItems = Object.keys(projectConfigurations).map((k) => {
        return {
          description: k,
          label: `Configuration ${k}`,
          target: k,
        };
      });

      const option = await vscode.window.showQuickPick(quickPickItems, {
        placeHolder: selectConfigMsg,
      });

      if (!option) {
        const noOptionMsg = vscode.l10n.t("No option selected.");
        Logger.infoNotify(noOptionMsg);
        return;
      }

      await this.updateConfiguration(
        option.target,
        projectConfigurations[option.target]
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Error selecting configuration: ${error.message}`
      );
    }
  }

  /**
   * Register the configuration selection command
   */
  public registerConfigSelectionCommand(): vscode.Disposable {
    return vscode.commands.registerCommand(
      "espIdf.projectConf",
      async () => await this.selectProjectConfiguration()
    );
  }

  /**
   * Dispose of the file system watcher
   */
  public dispose(): void {
    this.configWatcher.dispose();
  }
}
