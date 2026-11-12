import {
  ConfigurationTarget,
  DebugConfiguration,
  Uri,
  workspace,
} from "vscode";
import {
  RuntimeGdbStubLaunchConfig,
  mergeRuntimeGdbStubLaunchConfigurations,
} from "./debugConfig";

export async function ensureRuntimeGdbStubLaunchJson(
  workspacePath: Uri
): Promise<boolean> {
  const launch = workspace.getConfiguration("launch", workspacePath);
  const current =
    launch.get<RuntimeGdbStubLaunchConfig[]>("configurations") ?? [];
  const { configurations, changed } = mergeRuntimeGdbStubLaunchConfigurations(
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
