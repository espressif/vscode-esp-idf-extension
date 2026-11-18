import {
  ConfigurationTarget,
  DebugConfiguration,
  Uri,
  workspace,
} from "vscode";
import {
  RuntimeGdbStubLaunchConfig,
  applyDebugConnectionMode,
  applyGdbstubUartLaunchConfiguration,
} from "./debugConfig";

export async function ensureRuntimeGdbStubLaunchJson(
  workspacePath: Uri
): Promise<boolean> {
  const launch = workspace.getConfiguration("launch", workspacePath);
  const current =
    launch.get<RuntimeGdbStubLaunchConfig[]>("configurations") ?? [];
  const { configurations, changed } = applyGdbstubUartLaunchConfiguration(
    current
  );
  if (!changed) {
    return false;
  }
  await launch.update(
    "configurations",
    configurations as DebugConfiguration[],
    ConfigurationTarget.WorkspaceFolder
  );
  return true;
}

export async function setDebugConnectionMode(
  workspacePath: Uri,
  connectionMode: string
): Promise<boolean> {
  const launch = workspace.getConfiguration("launch", workspacePath);
  const current =
    launch.get<RuntimeGdbStubLaunchConfig[]>("configurations") ?? [];
  const { configurations, changed } = applyDebugConnectionMode(
    current,
    connectionMode
  );
  if (!changed) {
    return false;
  }
  await launch.update(
    "configurations",
    configurations as DebugConfiguration[],
    ConfigurationTarget.WorkspaceFolder
  );
  return true;
}
