import * as path from "path";
import { pathExists } from "fs-extra";
import { Logger } from "../../logger/logger";
import { isBinInPath } from "../../utils";
import { readParameter } from "../../idfConfiguration";
import { configureEnvVariables } from "../../common/prepareEnv";
import { Uri } from "vscode";

/**
 * Gets the path to the OpenOCD hints YAML file for the specified version.
 * @param toolsPath - The base path where IDF tools are installed.
 * @param version - The specific OpenOCD version string (e.g., "v0.12.0-esp32-20250226").
 * @returns The full path to the hints file, or null if not found or an error occurs.
 */
export async function getOpenOcdHintsYmlPath(
  workspace: Uri
): Promise<string | null> {
  const modifiedEnv = await configureEnvVariables(workspace);
  const openOcdPath = await isBinInPath("openocd", modifiedEnv, [
    "openocd-esp32",
  ]);
  if (!openOcdPath) {
    Logger.warn(
      "Missing OpenOCD path for getting hints path.",
      "getOpenOcdHintsYmlPath"
    );
    return null;
  }
  try {
    const hintsPath = path.join(
      openOcdPath,
      "..",
      "..",
      "share",
      "openocd",
      "espressif",
      "tools",
      "esp_problems_hints.yml"
    );

    if (!(await pathExists(hintsPath))) {
      Logger.info(
        `OpenOCD hints file not found at expected location: ${hintsPath}. Hints may require a specific OpenOCD version or setup.`,
        "getOpenOcdHintsYmlPath"
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

export async function resolveIdfHintsYmlPath(
  espIdfPath: string,
  workspace: Uri
): Promise<string> {
  const legacy = path.join(
    espIdfPath,
    "tools",
    "idf_py_actions",
    "hints.yml"
  );
  let buildDir = readParameter("idf.buildPath", workspace) as string;
  if (!buildDir) {
    buildDir = path.join(workspace.fsPath, "build");
  } else if (!path.isAbsolute(buildDir)) {
    buildDir = path.join(workspace.fsPath, buildDir);
  }
  const aggregated = path.join(buildDir, "hints.yml");
  if (await pathExists(aggregated)) {
    return aggregated;
  }
  if (await pathExists(legacy)) {
    return legacy;
  }
  return aggregated;
}
