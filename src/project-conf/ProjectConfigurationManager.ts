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
import { getProjectConfigurationElements, configurePresetToProjectConfElement, promptLegacyMigration, migrateLegacyConfiguration } from "./index";
import { pathExists } from "fs-extra";
import { configureClangSettings } from "../clang";

export function clearSelectedProjectConfiguration(): void {
  if (ESP.ProjectConfiguration.store) {
    const currentSelectedConfig = ESP.ProjectConfiguration.store.get<string>(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );
    if (currentSelectedConfig) {
      ESP.ProjectConfiguration.store.clear(currentSelectedConfig);
      ESP.ProjectConfiguration.store.clear(
        ESP.ProjectConfiguration.SELECTED_CONFIG
      );
    }
  }
}

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

    this.registerEventHandlers();
    // Initialize asynchronously
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (!fileExists(this.configFilePath)) {
      // CMakePresets.json doesn't exist - check for legacy file
      await this.checkForLegacyFile();
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
    
    // Convert ConfigurePreset to ProjectConfElement for store compatibility
    const legacyElement = configurePresetToProjectConfElement(resolvedConfig[configName]);
    ESP.ProjectConfiguration.store.set(configName, legacyElement);

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
        // Check if we have legacy configurations to migrate
        const legacyFilePath = Uri.joinPath(this.workspaceUri, "esp_idf_project_configuration.json");
        
        if (await pathExists(legacyFilePath.fsPath)) {
          // Show migration dialog
          await this.handleLegacyMigrationDialog(legacyFilePath);
          return;
        }

        const emptyOption = await window.showInformationMessage(
          l10n.t("No CMakePresets configure presets found"),
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
   * Checks for legacy esp_idf_project_configuration.json file and shows appropriate status
   */
  private async checkForLegacyFile(): Promise<void> {
    const legacyFilePath = Uri.joinPath(this.workspaceUri, "esp_idf_project_configuration.json").fsPath;
    
    if (fileExists(legacyFilePath)) {
      // Legacy file exists - show status bar with migration option
      this.configVersions = [];
      
      try {
        const legacyContent = readFileSync(legacyFilePath);
        if (legacyContent && legacyContent.trim() !== "") {
          const legacyData = JSON.parse(legacyContent);
          const legacyConfigNames = Object.keys(legacyData);
          
          if (legacyConfigNames.length > 0) {
            // Show status bar indicating legacy configurations are available
            this.setLegacyConfigurationStatus(legacyConfigNames);
            
            // Show migration notification
            this.showLegacyMigrationNotification(legacyConfigNames);
            return;
          }
        }
      } catch (error) {
        Logger.warn(`Failed to parse legacy configuration file: ${error.message}`);
      }
    }
    
    // No configuration files found - clear everything
    this.clearConfigurationState();
  }

  /**
   * Sets status bar to indicate legacy configurations are available
   */
  private setLegacyConfigurationStatus(legacyConfigNames: string[]): void {
    const statusBarItemName = `Legacy Configs (${legacyConfigNames.length})`;
    const statusBarItemTooltip = `Found legacy project configurations: ${legacyConfigNames.join(", ")}. Click to migrate to CMakePresets.json format.`;
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

  /**
   * Shows notification about legacy configurations
   */
  private async showLegacyMigrationNotification(legacyConfigNames: string[]): Promise<void> {
    const message = l10n.t(
      "Found {0} legacy project configuration(s): {1}. Would you like to migrate them to the new CMakePresets.json format? Your original file will remain unchanged.",
      legacyConfigNames.length,
      legacyConfigNames.join(", ")
    );
    
    const migrateOption = l10n.t("Migrate Now");
    const laterOption = l10n.t("Later");
    
    const choice = await window.showInformationMessage(
      message,
      migrateOption,
      laterOption
    );
    
    if (choice === migrateOption) {
      // Directly perform migration without additional popup
      const legacyFilePath = Uri.joinPath(this.workspaceUri, "esp_idf_project_configuration.json");
      await this.performDirectMigration(legacyFilePath);
    }
  }

  /**
   * Handles the legacy migration dialog when user clicks on project configuration
   */
  private async handleLegacyMigrationDialog(legacyFilePath: Uri): Promise<void> {
    try {
      const legacyContent = readFileSync(legacyFilePath.fsPath);
      const legacyData = JSON.parse(legacyContent);
      const legacyConfigNames = Object.keys(legacyData);
      
      const message = l10n.t(
        "Found {0} legacy project configuration(s): {1}. Would you like to migrate them to the new CMakePresets.json format?",
        legacyConfigNames.length,
        legacyConfigNames.join(", ")
      );
      
      const migrateOption = l10n.t("Migrate Now");
      const cancelOption = l10n.t("Cancel");
      
      const choice = await window.showInformationMessage(
        message,
        { modal: true },
        migrateOption,
        cancelOption
      );
      
      if (choice === migrateOption) {
        await this.performMigration(legacyFilePath);
      }
    } catch (error) {
      Logger.errorNotify(
        "Failed to handle legacy migration",
        error,
        "handleLegacyMigrationDialog"
      );
      window.showErrorMessage(
        l10n.t("Failed to process legacy configuration file: {0}", error.message)
      );
    }
  }

  /**
   * Performs the actual migration and updates UI (with confirmation dialog)
   */
  private async performMigration(legacyFilePath: Uri): Promise<void> {
    try {
      await promptLegacyMigration(this.workspaceUri, legacyFilePath);
      
      // After migration, reinitialize to show the new configurations
      await this.initialize();
      
      window.showInformationMessage(
        l10n.t("Project configurations successfully migrated to CMakePresets.json format!")
      );
    } catch (error) {
      Logger.errorNotify(
        "Failed to perform migration",
        error,
        "performMigration"
      );
      window.showErrorMessage(
        l10n.t("Failed to migrate project configuration: {0}", error.message)
      );
    }
  }

  /**
   * Performs direct migration without additional confirmation (for notification)
   */
  private async performDirectMigration(legacyFilePath: Uri): Promise<void> {
    try {
      await migrateLegacyConfiguration(this.workspaceUri, legacyFilePath);
      
      // After migration, reinitialize to show the new configurations
      await this.initialize();
      
      window.showInformationMessage(
        l10n.t("Project configurations successfully migrated to CMakePresets.json format!")
      );
    } catch (error) {
      Logger.errorNotify(
        "Failed to perform direct migration",
        error,
        "performDirectMigration"
      );
      window.showErrorMessage(
        l10n.t("Failed to migrate project configuration: {0}", error.message)
      );
    }
  }

  /**
   * Clears all configuration state
   */
  private clearConfigurationState(): void {
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
  }

  /**
   * Dispose of the file system watcher
   */
  public dispose(): void {
    this.configWatcher.dispose();
  }
}
