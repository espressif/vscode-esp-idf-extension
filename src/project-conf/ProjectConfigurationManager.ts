import {
  ExtensionContext,
  FileSystemWatcher,
  StatusBarItem,
  window,
  workspace,
  Uri,
  l10n,
  commands,
} from "vscode";
import {
  fileExists,
  readFileSync,
  readJson,
  setCCppPropertiesJsonCompileCommands,
} from "../utils";
import { ESP } from "../config";
import { ConfserverProcess } from "../espIdf/menuconfig/confServerProcess";
import { CommandKeys, createCommandDictionary } from "../cmdTreeView/cmdStore";
import { createStatusBarItem } from "../statusBar";
import { getIdfTargetFromSdkconfig } from "../workspaceConfig";
import { Logger } from "../logger/logger";
import { getProjectConfigurationElements } from "./index";
import { configureClangSettings } from "../clang";

export class ProjectConfigurationManager {
  private readonly configFilePath: string;
  private configVersions: string[] = [];
  private configWatcher: FileSystemWatcher;
  private statusBarItems: { [key: string]: StatusBarItem };
  private workspaceUri: Uri;
  private context: ExtensionContext;
  private commandDictionary: any;

  constructor(
    workspaceUri: Uri,
    context: ExtensionContext,
    statusBarItems: { [key: string]: StatusBarItem }
  ) {
    this.workspaceUri = workspaceUri;
    this.context = context;
    this.statusBarItems = statusBarItems;
    this.commandDictionary = createCommandDictionary();

    this.configFilePath = Uri.joinPath(
      workspaceUri,
      ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
    ).fsPath;

    this.configWatcher = workspace.createFileSystemWatcher(
      this.configFilePath,
      false,
      false,
      false
    );

    this.initialize();
    this.registerEventHandlers();
  }

  private initialize(): void {
    if (!fileExists(this.configFilePath)) {
      // File doesn't exist - this is normal for projects without multiple configurations
      this.configVersions = [];

      // If configuration status bar item exists, remove it
      if (this.statusBarItems["projectConf"]) {
        this.statusBarItems["projectConf"].dispose();
        this.statusBarItems["projectConf"] = undefined;
      }

      // Clear any potentially stale configuration
      const currentSelectedConfig = ESP.ProjectConfiguration.store.get<string>(
        ESP.ProjectConfiguration.SELECTED_CONFIG
      );
      if (currentSelectedConfig) {
        ESP.ProjectConfiguration.store.clear(currentSelectedConfig);
        ESP.ProjectConfiguration.store.clear(
          ESP.ProjectConfiguration.SELECTED_CONFIG
        );
      }

      return;
    }

    try {
      const configContent = readFileSync(this.configFilePath);

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

      // Check if the currently selected configuration is valid
      const currentSelectedConfig = ESP.ProjectConfiguration.store.get<string>(
        ESP.ProjectConfiguration.SELECTED_CONFIG
      );

      if (
        currentSelectedConfig &&
        this.configVersions.includes(currentSelectedConfig)
      ) {
        // Current selection is valid, keep it
        this.updateConfiguration(currentSelectedConfig);
      } else if (currentSelectedConfig) {
        // Current selection is invalid, clear it
        ESP.ProjectConfiguration.store.clear(currentSelectedConfig);
        ESP.ProjectConfiguration.store.clear(
          ESP.ProjectConfiguration.SELECTED_CONFIG
        );
        this.setNoConfigurationSelectedStatus();
      } else if (this.configVersions.length > 0) {
        // No current selection but configurations exist
        window.showInformationMessage(
          `Loaded ${
            this.configVersions.length
          } project configuration(s): ${this.configVersions.join(", ")}`
        );
        this.setNoConfigurationSelectedStatus();
      } else {
        // Empty configuration file
        Logger.info(
          `Project configuration file loaded but contains no configurations: ${this.configFilePath}`
        );
        this.setNoConfigurationSelectedStatus();
      }
    } catch (error) {
      window.showErrorMessage(
        `Error reading or parsing project configuration file (${this.configFilePath}): ${error.message}`
      );
      Logger.errorNotify(
        `Failed to parse project configuration file: ${this.configFilePath}`,
        error,
        "ProjectConfigurationManager initialize"
      );
      this.configVersions = []; // Ensure clean state on error
      this.setNoConfigurationSelectedStatus();
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
      const configData = await readJson(this.configFilePath);
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
        window.showInformationMessage(
          `New versions added: ${addedVersions.join(", ")}`
        );
      }

      if (removedVersions.length > 0) {
        window.showInformationMessage(
          `Versions removed: ${removedVersions.join(", ")}`
        );
      }

      // Update versions for next comparison
      this.configVersions = currentVersions;

      // Get the current selected configuration
      const currentSelectedConfig = ESP.ProjectConfiguration.store.get<string>(
        ESP.ProjectConfiguration.SELECTED_CONFIG
      );

      // Handle the status based on whether current selection is valid
      if (
        currentSelectedConfig &&
        currentVersions.includes(currentSelectedConfig)
      ) {
        // Current selection is still valid
        await this.updateConfiguration(currentSelectedConfig);
      } else if (currentSelectedConfig) {
        // Current selection no longer exists, clear it
        ESP.ProjectConfiguration.store.clear(currentSelectedConfig);
        ESP.ProjectConfiguration.store.clear(
          ESP.ProjectConfiguration.SELECTED_CONFIG
        );
        this.setNoConfigurationSelectedStatus();
      } else {
        // No configuration is selected
        this.setNoConfigurationSelectedStatus();
      }
    } catch (error) {
      window.showErrorMessage(`Error parsing config file: ${error.message}`);
      this.setNoConfigurationSelectedStatus();
    }
  }

  private async handleConfigFileDelete(): Promise<void> {
    // When the config file is deleted, clear all configurations
    this.configVersions = [];

    // Clear any selected configuration
    const currentSelectedConfig = ESP.ProjectConfiguration.store.get<string>(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );

    if (currentSelectedConfig) {
      ESP.ProjectConfiguration.store.clear(currentSelectedConfig);
      ESP.ProjectConfiguration.store.clear(
        ESP.ProjectConfiguration.SELECTED_CONFIG
      );
    }

    // Remove the status bar item completely when the config file is deleted
    if (this.statusBarItems["projectConf"]) {
      this.statusBarItems["projectConf"].dispose();
      this.statusBarItems["projectConf"] = undefined;
    }

    // Optionally notify the user
    window.showInformationMessage(
      "Project configuration file has been deleted."
    );
  }

  private async handleConfigFileCreate(): Promise<void> {
    try {
      const configData = await readJson(this.configFilePath);
      this.configVersions = Object.keys(configData);

      // If we have versions, check if current selection is valid
      if (this.configVersions.length > 0) {
        const currentSelectedConfig = ESP.ProjectConfiguration.store.get<
          string
        >(ESP.ProjectConfiguration.SELECTED_CONFIG);

        if (
          currentSelectedConfig &&
          this.configVersions.includes(currentSelectedConfig)
        ) {
          // Current selection is valid
          await this.updateConfiguration(currentSelectedConfig);
        } else {
          // No valid selection, show "No Configuration Selected"
          if (currentSelectedConfig) {
            ESP.ProjectConfiguration.store.clear(currentSelectedConfig);
            ESP.ProjectConfiguration.store.clear(
              ESP.ProjectConfiguration.SELECTED_CONFIG
            );
          }
          this.setNoConfigurationSelectedStatus();

          // Notify the user about available configurations
          window.showInformationMessage(
            `Project configuration file created with ${this.configVersions.length} configuration(s). Select one to use.`
          );
        }
      } else {
        // Empty configuration file
        this.setNoConfigurationSelectedStatus();
      }
    } catch (error) {
      window.showErrorMessage(
        `Error parsing newly created config file: ${error.message}`
      );
      this.setNoConfigurationSelectedStatus();
    }
  }

  /**
   * Sets the status bar to indicate no configuration is selected
   */
  private setNoConfigurationSelectedStatus(): void {
    const statusBarItemName = "No Configuration Selected";
    const statusBarItemTooltip =
      "No project configuration selected. Click to select one";
    const commandToUse = "espIdf.projectConf";

    if (this.statusBarItems["projectConf"]) {
      this.statusBarItems["projectConf"].dispose();
    }

    this.statusBarItems["projectConf"] = createStatusBarItem(
      `$(${
        this.commandDictionary[CommandKeys.SelectProjectConfiguration].iconId
      }) ${statusBarItemName}`,
      statusBarItemTooltip,
      commandToUse,
      99,
      this.commandDictionary[CommandKeys.SelectProjectConfiguration]
        .checkboxState
    );
  }

  private async updateConfiguration(configName: string): Promise<void> {
    // Update the configuration in store
    ESP.ProjectConfiguration.store.set(
      ESP.ProjectConfiguration.SELECTED_CONFIG,
      configName
    );

    // Update the configuration data with resolved paths for building
    const resolvedConfig = await getProjectConfigurationElements(
      this.workspaceUri,
      true // Resolve paths for building
    );
    ESP.ProjectConfiguration.store.set(configName, resolvedConfig[configName]);

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
      this.workspaceUri,
      this.statusBarItems["target"]
    );
    await setCCppPropertiesJsonCompileCommands(this.workspaceUri);
    await configureClangSettings(this.workspaceUri);
    ConfserverProcess.dispose();
  }

  /**
   * Method to select a project configuration via command
   */
  public async selectProjectConfiguration(): Promise<void> {
    try {
      const projectConfigurations = await getProjectConfigurationElements(
        this.workspaceUri,
        false // Don't resolve paths for display
      );

      if (
        !projectConfigurations ||
        Object.keys(projectConfigurations).length === 0
      ) {
        const emptyOption = await window.showInformationMessage(
          l10n.t("No project configuration found"),
          "Open editor"
        );

        if (emptyOption === "Open editor") {
          commands.executeCommand("espIdf.projectConfigurationEditor");
        }
        return;
      }

      const selectConfigMsg = l10n.t("Select configuration to use:");
      let quickPickItems = Object.keys(projectConfigurations).map((k) => {
        return {
          description: k,
          label: `Configuration ${k}`,
          target: k,
        };
      });

      const option = await window.showQuickPick(quickPickItems, {
        placeHolder: selectConfigMsg,
      });

      if (!option) {
        const noOptionMsg = l10n.t("No option selected.");
        Logger.infoNotify(noOptionMsg);
        return;
      }

      await this.updateConfiguration(option.target);
    } catch (error) {
      window.showErrorMessage(
        `Error selecting configuration: ${error.message}`
      );
    }
  }

  /**
   * Dispose of the file system watcher
   */
  public dispose(): void {
    this.configWatcher.dispose();
  }
}
