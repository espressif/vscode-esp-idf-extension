import {
  BottomBarPanel,
  InputBox,
  Workbench,
} from "vscode-extension-tester";
import { expect } from "chai";
import { resolve } from "path";
import { pathExists } from "fs-extra";

describe("Build testing", async () => {
  let panel: BottomBarPanel;

  before(async function () {
    this.timeout(100000);
    await openTestProject();
  });

  it("Build bin is generated", async () => {
    await new Workbench().executeCommand("ESP-IDF: Build your project");
    await new Promise((res) => setTimeout(res, 5000));
    // get names of all available terminals
    panel = new BottomBarPanel();
    await new Promise((res) => setTimeout(res, 2000));
    const terminalView = await panel.openTerminalView();
    await new Promise((res) => setTimeout(res, 100000));
    await terminalView.getCurrentChannel();
    const text = await terminalView.getText();
    console.log(text);
    const testBinPath = resolve(
      __dirname,
      "..",
      "..",
      "testFiles",
      "testWorkspace",
      "build",
      "hello-world.bin"
    );
    const binExists = await pathExists(testBinPath);
    expect(binExists).to.be.true;
  }).timeout(999999);
});

export async function openTestProject() {
  await new Promise((res) => setTimeout(res, 5000));
  await new Workbench().executeCommand("file: open folder");
  const testWorkspaceDir = resolve(
    __dirname,
    "..",
    "..",
    "testFiles",
    "testWorkspace"
  );
  await new Promise((res) => setTimeout(res, 1000));
  const input = await InputBox.create();
  await input.setText(testWorkspaceDir);
  await input.confirm();
  await new Promise((res) => setTimeout(res, 4000));
}
