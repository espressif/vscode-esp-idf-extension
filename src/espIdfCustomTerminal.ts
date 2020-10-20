import * as vscode from "vscode";
import { ChildProcess, spawn, SpawnOptions } from "child_process";
import { Logger } from "./logger/logger";

export default class EspIdfCustomTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  private closeEmitter = new vscode.EventEmitter<number>();
  onDidClose: vscode.Event<number> = this.closeEmitter.event;
  private childProcess: ChildProcess;
  private terminalBuffer: string;

  // Input keys
  private defaultLine = "$ ";
  private keys = {
    backspace: "\x7f",
    clear: "\x0C",
    enter: "\r",
    escape: "\x1B",
  };
  private actions = {
    cursorBack: "\x1b[D",
    deleteChar: "\x1b[P",
    clear: "\x1b[2J\x1b[3J\x1b[;H",
  };

  constructor(
    public initialCmd: string,
    public args: string[] | undefined,
    public options: SpawnOptions
  ) {}

  open(initialDimensions: vscode.TerminalDimensions | undefined) {
    this.terminalBuffer = this.defaultLine;
    this.writeEmitter.fire("\x1b[32mESP-IDF Custom Terminal\x1b[0m\r\n");
    if (this.initialCmd) {
      this.spawnCmd(this.initialCmd, this.args, true);
    }
  }
  close() {
    this.childProcess.stdin.end();
    this.childProcess = undefined;
  }

  formatText(text: string) {
    return `\r${text.split(/(\r?\n)/g).join("\r")}\r`;
  }

  async handleInput(input: string) {
    if (input.length > 1 && input.endsWith("\r")) {
      if (input === "clear\r") {
        this.writeEmitter.fire(this.actions.clear);
        return;
      }
      await this.spawnCmd(input.substr(0, input.lastIndexOf("\r")));
      return;
    }
    switch (input) {
      case this.keys.backspace:
        if (this.terminalBuffer.length <= this.defaultLine.length) {
          return;
        }
        this.terminalBuffer = this.terminalBuffer.substr(
          0,
          this.terminalBuffer.length - 1
        );
        this.writeEmitter.fire(this.actions.cursorBack);
        this.writeEmitter.fire(this.actions.deleteChar);
        break;
      case this.keys.clear:
        this.writeEmitter.fire(this.actions.clear);
        this.addNewLine();
        break;
      case this.keys.enter:
        if (this.terminalBuffer.length <= this.defaultLine.length) {
          this.writeEmitter.fire(`\r${this.defaultLine}`);
          return;
        }
        if (
          this.terminalBuffer === this.defaultLine + "clear" ||
          this.terminalBuffer === this.defaultLine + "cls"
        ) {
          this.writeEmitter.fire(this.actions.clear);
          this.addNewLine();
          return;
        }
        if (this.terminalBuffer === this.defaultLine + "exit") {
          this.closeEmitter.fire(0);
          return;
        }
        await this.spawnCmd(this.terminalBuffer.slice(this.defaultLine.length));
        break;
      case this.keys.escape:
        this.closeEmitter.fire(0);
        break;
      default:
        this.terminalBuffer += input;
        this.writeEmitter.fire(input);
        break;
    }
  }

  private addNewLine() {
    this.terminalBuffer = this.defaultLine;
    this.writeEmitter.fire(`\r${this.terminalBuffer}`);
  }

  async spawnCmd(
    input: string,
    args?: string[],
    closeAfterExecution: boolean = false
  ) {
    const sendOutput = (data: Buffer) => {
      this.writeEmitter.fire(this.formatText(data.toString()));
    };
    const errHandler = (error: Error) => {
      sendOutput(Buffer.from(error.message));
      Logger.error(error.message, new Error(error.message));
    };
    this.writeEmitter.fire(`\r${this.defaultLine}${input}\r\n`);
    return new Promise((resolve) => {
      this.childProcess = spawn(input, args, this.options);
      this.childProcess.stdout.on("data", sendOutput);
      this.childProcess.stderr.on("data", sendOutput);
      this.childProcess.on("error", errHandler);
      this.childProcess.on("exit", (code) => {
        if (code === 0 && closeAfterExecution) {
          this.closeEmitter.fire(code);
        } else if (code !== 0) {
          const error = new Error(
            `ESP-IDF Terminal process ended with exit code ${code}.`
          );
          Logger.error(error.message, new Error(error.message));
        }
        this.addNewLine();
        this.childProcess = undefined;
        resolve(code);
      });
    });
  }
}
