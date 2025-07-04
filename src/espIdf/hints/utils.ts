import * as path from "path";
import { pathExists } from "fs-extra";
import { Logger } from "../../logger/logger";

/**
 * Gets the path to the OpenOCD hints YAML file for the specified version.
 * @param toolsPath - The base path where IDF tools are installed.
 * @param version - The specific OpenOCD version string (e.g., "v0.12.0-esp32-20250226").
 * @returns The full path to the hints file, or null if not found or an error occurs.
 */
export async function getOpenOcdHintsYmlPath(
  toolsPath: string,
  version: string
): Promise<string | null> {
  if (!toolsPath || !version) {
    Logger.warn("Missing toolsPath or OpenOCD version for getting hints path.", "getOpenOcdHintsYmlPath");
    return null;
  }
  try {
    const hintsPath = path.join(
      toolsPath,
      "tools",
      "openocd-esp32",
      version,
      "openocd-esp32",
      "share",
      "openocd",
      "espressif",
      "tools",
      "esp_problems_hints.yml"
    );

    if (!(await pathExists(hintsPath))) {
      Logger.info(
        `OpenOCD hints file not found at expected location: ${hintsPath}. Hints may require a specific OpenOCD version or setup.`, "getOpenOcdHintsYmlPath"
      );
      return null;
    }

    return hintsPath;
  } catch (error) {
    Logger.errorNotify(
      `Error determining OpenOCD hints path: ${error.message}`,
      error,
      "getOpenOcdHintsYmlPath"
    );
    return null;
  }
}