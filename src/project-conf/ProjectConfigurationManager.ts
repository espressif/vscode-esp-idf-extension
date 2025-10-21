import {
  ExtensionContext,
  FileSystemWatcher,
  StatusBarItem,
  window,
  workspace,
  Uri,
  l10n,
  commands,
  ConfigurationTarget,
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
import {
  getProjectConfigurationElements,
  configurePresetToProjectConfElement,
  promptLegacyMigration,
  migrateLegacyConfiguration,
} from "./index";
import { pathExists } from "fs-extra";
import { configureClangSettings } from "../clang";
import { OpenOCDManager } from "../espIdf/openOcd/openOcdManager";
import { clearAdapterSerial } from "../espIdf/openOcd/adapterSerial";
import { updateOpenOcdAdapterStatusBarItem } from "../statusBar";
import * as idfConf from "../idfConfiguration";

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
  private readonly cmakePresetsFilePath: string;
  private readonly cmakeUserPresetsFilePath: string;
  private configVersions: string[] = [];
  private cmakePresetsWatcher: FileSystemWatcher;
  private cmakeUserPresetsWatcher: FileSystemWatcher;
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

    this.cmakePresetsFilePath = Uri.joinPath(
      workspaceUri,
      ESP.ProjectConfiguration.PROJECT_CONFIGURATION_FILENAME
    ).fsPath;

    this.cmakeUserPresetsFilePath = Uri.joinPath(
      workspaceUri,
      ESP.ProjectConfiguration.USER_CONFIGURATION_FILENAME
    ).fsPath;

    // Watch both CMakePresets.json and CMakeUserPresets.json
    this.cmakePresetsWatcher = workspace.createFileSystemWatcher(
      this.cmakePresetsFilePath,
      false,
      false,
      false
    );

    this.cmakeUserPresetsWatcher = workspace.createFileSystemWatcher(
      this.cmakeUserPresetsFilePath,
      false,
      false,
      false
    );

    this.registerEventHandlers();
    // Initialize asynchronously
    this.initialize();
  }

  private async initialize(): Promise<void> {
    const cmakePresetsExists = fileExists(this.cmakePresetsFilePath);
    const cmakeUserPresetsExists = fileExists(this.cmakeUserPresetsFilePath);

    if (!cmakePresetsExists && !cmakeUserPresetsExists) {
      // Neither CMakePresets.json nor CMakeUserPresets.json exists - check for legacy file
      await this.checkForLegacyFile();
      return;
    }

    try {
      // Use the updated getProjectConfigurationElements function that handles both files
      const projectConfElements = await getProjectConfigurationElements(
        this.workspaceUri,
        false // Don't resolve paths for initialization
      );

      this.configVersions = Object.keys(projectConfElements);

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
        const fileInfo = [];
        if (cmakePresetsExists) fileInfo.push("CMakePresets.json");
        if (cmakeUserPresetsExists) fileInfo.push("CMakeUserPresets.json");

        // Check if we should show no configuration selected status
        const saveLastProjectConfiguration = idfConf.readParameter("idf.saveLastProjectConfiguration", this.workspaceUri);
        
        if (saveLastProjectConfiguration !== false) {
          // When setting is enabled, show no configuration selected status
          window.showInformationMessage(
            `Loaded ${
              this.configVersions.length
            } project configuration(s) from ${fileInfo.join(
              " and "
            )}: ${this.configVersions.join(", ")}. No configuration selected.`
          );
          this.setNoConfigurationSelectedStatus();
        } else {
          // Show the current behavior when auto-selection is disabled
          window.showInformationMessage(
            `Loaded ${
              this.configVersions.length
            } project configuration(s) from ${fileInfo.join(
              " and "
            )}: ${this.configVersions.join(", ")}`
          );
          this.setNoConfigurationSelectedStatus();
        }
      } else {
        // No configurations found
        Logger.info(
          `Project configuration files loaded but contain no configurations`
        );
        this.setNoConfigurationSelectedStatus();
      }
    } catch (error) {
      Logger.errorNotify(
        `Failed to parse project configuration files`,
        error,
        "ProjectConfigurationManager initialize"
      );
      this.configVersions = []; // Ensure clean state on error
      this.setNoConfigurationSelectedStatus();
    }
  }

  private registerEventHandlers(): void {
    // Handle CMakePresets.json file changes
    const cmakePresetsChangeDisposable = this.cmakePresetsWatcher.onDidChange(
      async () => await this.handleConfigFileChange()
    );

    // Handle CMakePresets.json file deletion
    const cmakePresetsDeleteDisposable = this.cmakePresetsWatcher.onDidDelete(
      async () => await this.handleConfigFileDelete()
    );

    // Handle CMakePresets.json file creation
    const cmakePresetsCreateDisposable = this.cmakePresetsWatcher.onDidCreate(
      async () => await this.handleConfigFileCreate()
    );

    // Handle CMakeUserPresets.json file changes
    const cmakeUserPresetsChangeDisposable = this.cmakeUserPresetsWatcher.onDidChange(
      async () => await this.handleConfigFileChange()
    );

    // Handle CMakeUserPresets.json file deletion
    const cmakeUserPresetsDeleteDisposable = this.cmakeUserPresetsWatcher.onDidDelete(
      async () => await this.handleConfigFileDelete()
    );

    // Handle CMakeUserPresets.json file creation
    const cmakeUserPresetsCreateDisposable = this.cmakeUserPresetsWatcher.onDidCreate(
      async () => await this.handleConfigFileCreate()
    );

    this.context.subscriptions.push(
      cmakePresetsChangeDisposable,
      cmakePresetsDeleteDisposable,
      cmakePresetsCreateDisposable,
      cmakeUserPresetsChangeDisposable,
      cmakeUserPresetsDeleteDisposable,
      cmakeUserPresetsCreateDisposable
    );
  }

  private async handleConfigFileChange(): Promise<void> {
    try {
      // Use the updated getProjectConfigurationElements function that handles both files
      const projectConfElements = await getProjectConfigurationElements(
        this.workspaceUri,
        false // Don't resolve paths for change handling
      );

      const currentVersions = Object.keys(projectConfElements);

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
          `New configurations added: ${addedVersions.join(", ")}`
        );
      }

      if (removedVersions.length > 0) {
        window.showInformationMessage(
          `Configurations removed: ${removedVersions.join(", ")}`
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
      Logger.errorNotify(
        `Error parsing configuration files: ${error.message}`,
        error,
        "ProjectConfigurationManager handleConfigFileChange"
      );
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
    Logger.infoNotify("Project configuration file has been deleted.");
  }

  private async handleConfigFileCreate(): Promise<void> {
    try {
      // Use the updated getProjectConfigurationElements function that handles both files
      const projectConfElements = await getProjectConfigurationElements(
        this.workspaceUri,
        false // Don't resolve paths for creation handling
      );

      this.configVersions = Object.keys(projectConfElements);

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
      Logger.errorNotify(
        `Error parsing newly created configuration file: ${error.message}`,
        error,
        "ProjectConfigurationManager handleConfigFileCreate"
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
    const previousConfig = ESP.ProjectConfiguration.store.get<string>(
      ESP.ProjectConfiguration.SELECTED_CONFIG
    );
    // Treat selecting a configuration after "no selection" (e.g. after VS Code restart)
    // as a profile switch too, so adapter bindings don't leak across profiles.
    const isSwitchingProfile = previousConfig !== configName;

    if (isSwitchingProfile) {
      // Stop OpenOCD so it can't keep using the previous profile's adapter binding.
      const openOcd = OpenOCDManager.init();
      if (openOcd.isRunning()) {
        openOcd.stop();
      }

      // Clear stored adapter serial (extension workspace state).
      clearAdapterSerial(this.workspaceUri);

      // Clear adapter location from settings.json (workspace-folder scope).
      const cfg = workspace.getConfiguration("", this.workspaceUri);
      const extraVars =
        (cfg.get<{ [key: string]: any }>("idf.customExtraVars") ?? {});
      if (extraVars["OPENOCD_USB_ADAPTER_LOCATION"]) {
        const nextExtraVars = { ...extraVars };
        delete nextExtraVars["OPENOCD_USB_ADAPTER_LOCATION"];
        await cfg.update(
          "idf.customExtraVars",
          nextExtraVars,
          ConfigurationTarget.WorkspaceFolder
        );
      }

      updateOpenOcdAdapterStatusBarItem(this.workspaceUri);
    }

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
    const legacyElement = configurePresetToProjectConfElement(
      resolvedConfig[configName]
    );
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
        const legacyFilePath = Uri.joinPath(
          this.workspaceUri,
          "esp_idf_project_configuration.json"
        );

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
      Logger.errorNotify(
        `Error selecting configuration: ${error.message}`,
        error,
        "ProjectConfigurationManager selectProjectConfiguration"
      );
    }
  }

  /**
   * Checks for legacy esp_idf_project_configuration.json file and shows appropriate status
   */
  private async checkForLegacyFile(): Promise<void> {
    const legacyFilePath = Uri.joinPath(
      this.workspaceUri,
      "esp_idf_project_configuration.json"
    ).fsPath;

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
        Logger.warn(
          `Failed to parse legacy configuration file: ${error.message}`
        );
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
    const statusBarItemTooltip = `Found legacy project configurations: ${legacyConfigNames.join(
      ", "
    )}. Click to migrate to CMakePresets.json format.`;
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
  private async showLegacyMigrationNotification(
    legacyConfigNames: string[]
  ): Promise<void> {
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
      const legacyFilePath = Uri.joinPath(
        this.workspaceUri,
        "esp_idf_project_configuration.json"
      );
      await this.performDirectMigration(legacyFilePath);
    }
  }

  /**
   * Handles the legacy migration dialog when user clicks on project configuration
   */
  private async handleLegacyMigrationDialog(
    legacyFilePath: Uri
  ): Promise<void> {
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
        l10n.t("Failed to handle legacy migration: {0}", error.message),
        error,
        "ProjectConfigurationManager handleLegacyMigrationDialog"
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
        l10n.t(
          "Project configurations successfully migrated to CMakePresets.json format!"
        )
      );
    } catch (error) {
      Logger.errorNotify(
        l10n.t("Failed to migrate project configuration: {0}", error.message),
        error,
        "ProjectConfigurationManager performMigration"
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
        l10n.t(
          "Project configurations successfully migrated to CMakePresets.json format!"
        )
      );
    } catch (error) {
      Logger.errorNotify(
        l10n.t("Failed to migrate project configuration: {0}", error.message),
        error,
        "ProjectConfigurationManager performDirectMigration"
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
   * Dispose of the file system watchers
   */
  public dispose(): void {
    this.cmakePresetsWatcher.dispose();
    this.cmakeUserPresetsWatcher.dispose();
  }
}
