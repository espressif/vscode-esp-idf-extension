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
    public cmd: string,
    public args: string[] | undefined,
    public options: SpawnOptions
  ) {}

  open(initialDimensions: vscode.TerminalDimensions | undefined) {
    this.doCommand(this.cmd, this.args);
  }
  close() {
    this.childProcess.stdin.end();
    this.childProcess = undefined;
  }

  formatText(text: string) {
    return `\r${text.split(/(\r?\n)/g).join("\r")}\r`;
  }

  private async doCommand(cmd: string, args?: string[]) {
    if (!cmd) {
      return;
    }
    const sendOutput = (data: Buffer) => {
      this.writeEmitter.fire(this.formatText(data.toString()));
    };
    const errHandler = (error: Error) => {
      sendOutput(Buffer.from(error.message));
      Logger.error(error.message, new Error(error.message));
    };
    return new Promise((resolve) => {
      this.childProcess = spawn(cmd, args, this.options);
      this.childProcess.stdout.on("data", sendOutput);
      this.childProcess.stderr.on("data", sendOutput);
      this.childProcess.on("error", errHandler);
      this.childProcess.on("exit", (code) => {
        if (code === 0) {
          this.closeEmitter.fire(code);
        } else {
          const error = new Error(`Process ended with exit code ${code}.`);
          errHandler(error);
        }
        resolve();
      });
    });
  }
}
