import * as vscode from "vscode";
import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { Logger } from "./logger/logger";

export default class EspIdfCustomTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  private closeEmitter = new vscode.EventEmitter<number>();
  onDidClose: vscode.Event<number> = this.closeEmitter.event;
  private childProcess: ChildProcess;

  constructor(
    public args: string[],
    public cmd: string,
    public options: SpawnOptions,
    private getSharedState?: () => string | undefined,
    private setShareState?: (state: string) => void
  ) {}

  open(initialDimensions: vscode.TerminalDimensions | undefined) {
    this.doCommand();
  }
  close() {
    this.childProcess.stdin.end();
    this.childProcess = undefined;
  }

  errHandler(error: Error) {
    this.writeEmitter.fire(error.message);
    Logger.error(error.message, new Error(error.message));
  }

  handleInput(data: string) {
    this.writeEmitter.fire(data);
    // Execute extension commands based on input here.
    // TODO Add commands here ?
  }

  private async doCommand() {
    let buff = Buffer.alloc(0);
    const sendOutput = (data: Buffer) => {
      buff = Buffer.concat([buff, data]);
      const some = data.toString();
      this.writeEmitter.fire(data.toString());
    };
    return new Promise((resolve) => {
      this.childProcess = spawn(this.cmd, this.args, this.options);
      this.childProcess.stdout.on("data", sendOutput);
      this.childProcess.stderr.on("data", sendOutput);
      this.childProcess.on("error", this.errHandler);
      this.childProcess.on("exit", (code) => {
        if (code === 0) {
          this.closeEmitter.fire(code);
        } else {
          this.errHandler(new Error(buff.toString()));
        }
        resolve();
      });
    });
  }
}
