import { pathExists } from "fs-extra";
import * as path from "path";
import {
  l10n,
  Range,
  RelativePattern,
  Uri,
  window,
  workspace,
  WorkspaceEdit,
} from "vscode";
import { ConfserverProcess } from "../menuconfig/confserver/confServerProcess";
import { getSDKConfigFilePath } from "../../configuration/workspace";
import { TaskManager } from "../../taskManager/taskManager";
import { addIdfReconfigureTask } from "../reconfigure/task";
import {
  addGdbStubManifestDependency,
  enableSdkconfigOption,
  hasIdfComponentRegister,
} from "./configurationText";

const runtimeGdbStubOption = "CONFIG_ESP_SYSTEM_GDBSTUB_RUNTIME";
const runtimeGdbStubKconfigId = "ESP_SYSTEM_GDBSTUB_RUNTIME";

export type GdbStubConfigureResult = "cancelled" | "unchanged" | "updated";

export interface GdbStubProjectIo {
  pathExists(filePath: string): Promise<boolean>;
  readFile(filePath: string): Promise<string>;
  findCmakeFiles(workspacePath: Uri): Promise<Uri[]>;
  pickCmakeFile(
    items: { label: string; filePath: string }[]
  ): Promise<string | undefined>;
  replaceFileText(filePath: string, newText: string): Promise<void>;
  resolveSdkconfigPath(workspacePath: Uri): Promise<string>;
  sdkconfigEditorIsRunning(): boolean;
  setRuntimeGdbStubInEditor(): Promise<void>;
  closeSdkconfigEditor(): void;
  reconfigureProject(workspacePath: Uri): Promise<void>;
}

async function readOpenDocumentText(filePath: string): Promise<string> {
  const document = await workspace.openTextDocument(Uri.file(filePath));
  return document.getText();
}

async function replaceOpenDocumentText(
  filePath: string,
  newText: string
): Promise<void> {
  const uri = Uri.file(filePath);
  if (!(await pathExists(filePath))) {
    await workspace.fs.writeFile(uri, Buffer.from(newText, "utf8"));
    return;
  }
  const document = await workspace.openTextDocument(uri);
  const edit = new WorkspaceEdit();
  edit.replace(
    uri,
    new Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    ),
    newText
  );
  const applied = await workspace.applyEdit(edit);
  if (!applied) {
    throw new Error(l10n.t("Failed to update {file}", { file: filePath }));
  }
  if (document.isDirty) {
    await document.save();
  }
}

async function findCmakeFiles(workspacePath: Uri): Promise<Uri[]> {
  return workspace.findFiles(
    new RelativePattern(workspacePath, "**/CMakeLists.txt"),
    "**/{build,managed_components,.git}/**"
  );
}

async function pickCmakeFile(
  items: { label: string; filePath: string }[]
): Promise<string | undefined> {
  const selection = await window.showQuickPick(items, {
    placeHolder: l10n.t("Select the component that should require esp_gdbstub"),
  });
  return selection?.filePath;
}

async function setRuntimeGdbStubInEditor(): Promise<void> {
  if (!ConfserverProcess.exists()) {
    throw new Error(l10n.t("SDK Configuration Editor is not running"));
  }
  ConfserverProcess.sendUpdatedValue(
    `{"version": 2, "set": { "${runtimeGdbStubKconfigId}": true }}\n`
  );
  ConfserverProcess.saveGuiConfigValues();
}

const defaultGdbStubProjectIo: GdbStubProjectIo = {
  pathExists,
  readFile: readOpenDocumentText,
  findCmakeFiles,
  pickCmakeFile,
  replaceFileText: replaceOpenDocumentText,
  resolveSdkconfigPath: getSDKConfigFilePath,
  sdkconfigEditorIsRunning: () => ConfserverProcess.exists(),
  setRuntimeGdbStubInEditor,
  closeSdkconfigEditor: () => ConfserverProcess.dispose(),
  reconfigureProject: async (workspacePath) => {
    await addIdfReconfigureTask(workspacePath);
    await TaskManager.runTasks();
    TaskManager.disposeListeners();
  },
};

export async function configureProjectForRuntimeGdbStub(
  workspacePath: Uri,
  io: GdbStubProjectIo = defaultGdbStubProjectIo
): Promise<GdbStubConfigureResult> {
  const componentCmake = await selectComponentCmakeFile(workspacePath, io);
  if (!componentCmake) {
    return "cancelled";
  }

  const manifestPath = path.join(
    path.dirname(componentCmake.filePath),
    "idf_component.yml"
  );
  const manifestText = (await io.pathExists(manifestPath))
    ? await io.readFile(manifestPath)
    : "";
  const updatedManifestText = addGdbStubManifestDependency(manifestText);
  const manifestChanged = updatedManifestText !== manifestText;

  const sdkconfigPath = await io.resolveSdkconfigPath(workspacePath);
  const sdkconfigText = (await io.pathExists(sdkconfigPath))
    ? await io.readFile(sdkconfigPath)
    : "";
  const updatedSdkconfigText = enableSdkconfigOption(
    sdkconfigText,
    runtimeGdbStubOption
  );
  const sdkconfigNeedsUpdate = updatedSdkconfigText !== sdkconfigText;

  if (!manifestChanged && !sdkconfigNeedsUpdate) {
    return "unchanged";
  }

  if (manifestChanged) {
    await io.replaceFileText(manifestPath, updatedManifestText);
  }

  // The running editor loaded Kconfig before esp_gdbstub was in the build, so
  // it rejects ESP_SYSTEM_GDBSTUB_RUNTIME as not visible. Write sdkconfig
  // directly unless the dependency was already present and the editor can
  // update its current model.
  let wroteSdkconfig = false;
  if (sdkconfigNeedsUpdate) {
    const editorHasSymbol = !manifestChanged && io.sdkconfigEditorIsRunning();
    if (editorHasSymbol) {
      try {
        await io.setRuntimeGdbStubInEditor();
      } catch {
        await io.replaceFileText(sdkconfigPath, updatedSdkconfigText);
        wroteSdkconfig = true;
      }
    } else {
      await io.replaceFileText(sdkconfigPath, updatedSdkconfigText);
      wroteSdkconfig = true;
    }
  }

  if (manifestChanged || wroteSdkconfig) {
    if (io.sdkconfigEditorIsRunning()) {
      io.closeSdkconfigEditor();
    }
    await io.reconfigureProject(workspacePath);
  }

  return "updated";
}

async function selectComponentCmakeFile(
  workspacePath: Uri,
  io: GdbStubProjectIo
): Promise<{ filePath: string; text: string } | undefined> {
  const mainCmakePath = path.join(
    workspacePath.fsPath,
    "main",
    "CMakeLists.txt"
  );
  if (await io.pathExists(mainCmakePath)) {
    const mainText = await io.readFile(mainCmakePath);
    if (hasIdfComponentRegister(mainText)) {
      return { filePath: mainCmakePath, text: mainText };
    }
  }

  const cmakeFiles = await io.findCmakeFiles(workspacePath);
  const componentCmakeFiles = (
    await Promise.all(
      cmakeFiles.map(async (cmakeFile) => ({
        filePath: cmakeFile.fsPath,
        text: await io.readFile(cmakeFile.fsPath),
      }))
    )
  ).filter((cmakeFile) => hasIdfComponentRegister(cmakeFile.text));

  if (componentCmakeFiles.length === 0) {
    throw new Error(
      l10n.t("No CMakeLists.txt containing idf_component_register was found.")
    );
  }
  if (componentCmakeFiles.length === 1) {
    return componentCmakeFiles[0];
  }

  const selection = await io.pickCmakeFile(
    componentCmakeFiles
      .map((cmakeFile) => ({
        label: path.relative(workspacePath.fsPath, cmakeFile.filePath),
        filePath: cmakeFile.filePath,
      }))
      .sort((left, right) => left.label.localeCompare(right.label))
  );
  return componentCmakeFiles.find(
    (cmakeFile) => cmakeFile.filePath === selection
  );
}
