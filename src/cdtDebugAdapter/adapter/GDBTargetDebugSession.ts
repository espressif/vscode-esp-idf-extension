/*********************************************************************
 * Copyright (c) 2019 Kichwa Coders and others
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *********************************************************************/

import { GDBDebugSession, RequestArguments } from "./GDBDebugSession";
import {
  InitializedEvent,
  Logger,
  logger,
  OutputEvent,
} from "@vscode/debugadapter";
import * as mi from "./mi";
import * as os from "os";
import { DebugProtocol } from "@vscode/debugprotocol";
import { spawn, ChildProcess } from "child_process";
import { SerialPort, ReadlineParser } from "serialport";
import { Socket } from "net";
import { createEnvValues, getGdbCwd } from "./util";

interface UARTArguments {
  // Path to the serial port connected to the UART on the board.
  serialPort?: string;
  // Target TCP port on the host machine to attach socket to print UART output (defaults to 3456)
  socketPort?: string;
  // Baud Rate (in bits/s) of the serial port to be opened (defaults to 115200).
  baudRate?: number;
  // The number of bits in each character of data sent across the serial line (defaults to 8).
  characterSize?: 5 | 6 | 7 | 8;
  // The type of parity check enabled with the transmitted data (defaults to "none" - no parity bit sent)
  parity?: "none" | "even" | "odd" | "mark" | "space";
  // The number of stop bits sent to allow the receiver to detect the end of characters and resynchronize with the character stream (defaults to 1).
  stopBits?: 1 | 1.5 | 2;
  // The handshaking method used for flow control across the serial line (defaults to "none" - no handshaking)
  handshakingMethod?: "none" | "XON/XOFF" | "RTS/CTS";
  // The EOL character used to parse the UART output line-by-line.
  eolCharacter?: "LF" | "CRLF";
}

export interface TargetAttachArguments {
  // Target type default is "remote"
  type?: string;
  // Target parameters would be something like "localhost:12345", defaults
  // to [`${host}:${port}`]
  parameters?: string[];
  // Target host to connect to, defaults to 'localhost', ignored if parameters is set
  host?: string;
  // Target port to connect to, ignored if parameters is set
  port?: string;
  // Target connect commands - if specified used in preference of type, parameters, host, target
  connectCommands?: string[];
  // Settings related to displaying UART output in the debug console
  uart?: UARTArguments;
}

export interface TargetLaunchArguments extends TargetAttachArguments {
  // The executable for the target server to launch (e.g. gdbserver or JLinkGDBServerCLExe),
  // defaults to 'gdbserver --once :0 ${args.program}' (requires gdbserver >= 7.3)
  server?: string;
  serverParameters?: string[];
  // Specifies the working directory of gdbserver, defaults to environment in RequestArguments
  environment?: Record<string, string | null>;
  // Regular expression to extract port from by examinging stdout/err of server.
  // Once server is launched, port will be set to this if port is not set.
  // defaults to matching a string like 'Listening on port 41551' which is what gdbserver provides
  // Ignored if port or parameters is set
  serverPortRegExp?: string;
  // Delay after startup before continuing launch, in milliseconds. If serverPortRegExp is
  // provided, it is the delay after that regexp is seen.
  serverStartupDelay?: number;
  // Automatically kill the launched server when client issues a disconnect (default: true)
  automaticallyKillServer?: boolean;
  // Specifies the working directory of gdbserver, defaults to cwd in RequestArguments
  cwd?: string;
}

export interface ImageAndSymbolArguments {
  // If specified, a symbol file to load at the given (optional) offset
  symbolFileName?: string;
  symbolOffset?: string;
  // If specified, an image file to load at the given (optional) offset
  imageFileName?: string;
  imageOffset?: string;
}

export interface TargetAttachRequestArguments extends RequestArguments {
  target?: TargetAttachArguments;
  imageAndSymbols?: ImageAndSymbolArguments;
  // Optional commands to issue between loading image and resuming target
  preRunCommands?: string[];
}

export interface TargetLaunchRequestArguments
  extends TargetAttachRequestArguments {
  target?: TargetLaunchArguments;
  imageAndSymbols?: ImageAndSymbolArguments;
  // Optional commands to issue between loading image and resuming target
  preRunCommands?: string[];
}

export class GDBTargetDebugSession extends GDBDebugSession {
  protected gdbserver?: ChildProcess;
  protected killGdbServer = true;

  // Serial Port to capture UART output across the serial line
  protected serialPort?: SerialPort;
  // Socket to listen on a TCP port to capture UART output
  protected socket?: Socket;

  /**
   * Define the target type here such that we can run the "disconnect"
   * command when servicing the disconnect request if the target type
   * is remote.
   */
  protected targetType?: string;

  protected async attachOrLaunchRequest(
    response: DebugProtocol.Response,
    request: "launch" | "attach",
    args: TargetLaunchRequestArguments | TargetAttachRequestArguments
  ) {
    this.setupCommonLoggerAndHandlers(args);

    if (
      args.sessionID === "gdbstub.debug.session.ws" ||
      args.sessionID === "core-dump.debug.session.ws"
    ) {
      this.isPostMortem = true;
    }

    if (request === "launch") {
      const launchArgs = args as TargetLaunchRequestArguments;
      if (
        launchArgs.target?.serverParameters === undefined &&
        !launchArgs.program
      ) {
        this.sendErrorResponse(
          response,
          1,
          "The program must be specified in the launch request arguments"
        );
        return;
      }
      await this.startGDBServer(launchArgs);
    }

    await this.startGDBAndAttachToTarget(response, args);
  }

  protected async launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: TargetLaunchRequestArguments
  ): Promise<void> {
    try {
      const [request, resolvedArgs] = this.applyRequestArguments(
        "launch",
        args
      );
      await this.attachOrLaunchRequest(response, request, resolvedArgs);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected async attachRequest(
    response: DebugProtocol.AttachResponse,
    args: TargetAttachRequestArguments
  ): Promise<void> {
    try {
      const [request, resolvedArgs] = this.applyRequestArguments(
        "attach",
        args
      );
      await this.attachOrLaunchRequest(response, request, resolvedArgs);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected setupCommonLoggerAndHandlers(args: TargetLaunchRequestArguments) {
    logger.setup(
      args.verbose ? Logger.LogLevel.Verbose : Logger.LogLevel.Warn,
      args.logFile || false
    );

    this.gdb.on("consoleStreamOutput", (output, category) => {
      this.sendEvent(new OutputEvent(output, category));
    });

    this.gdb.on("execAsync", (resultClass, resultData) =>
      this.handleGDBAsync(resultClass, resultData)
    );
    this.gdb.on("notifyAsync", (resultClass, resultData) =>
      this.handleGDBNotify(resultClass, resultData)
    );
  }

  protected async startGDBServer(
    args: TargetLaunchRequestArguments
  ): Promise<void> {
    if (args.target === undefined) {
      args.target = {};
    }
    const target = args.target;
    const serverExe = target.server !== undefined ? target.server : "gdbserver";
    const serverCwd = target.cwd !== undefined ? target.cwd : getGdbCwd(args);
    const serverParams =
      target.serverParameters !== undefined
        ? target.serverParameters
        : ["--once", ":0", args.program];

    this.killGdbServer = target.automaticallyKillServer !== false;

    const gdbEnvironment = args.environment
      ? createEnvValues(process.env, args.environment)
      : process.env;
    const serverEnvironment = target.environment
      ? createEnvValues(gdbEnvironment, target.environment)
      : gdbEnvironment;
    // Wait until gdbserver is started and ready to receive connections.
    await new Promise<void>((resolve, reject) => {
      this.gdbserver = spawn(serverExe, serverParams, {
        cwd: serverCwd,
        env: serverEnvironment,
      });
      let gdbserverStartupResolved = false;
      let accumulatedStdout = "";
      let accumulatedStderr = "";
      let checkTargetPort = (_data: any) => {
        // do nothing by default
      };
      if (target.port && target.serverParameters) {
        setTimeout(
          () => {
            gdbserverStartupResolved = true;
            resolve();
          },
          target.serverStartupDelay !== undefined
            ? target.serverStartupDelay
            : 0
        );
      } else {
        checkTargetPort = (data: any) => {
          const regex = new RegExp(
            target.serverPortRegExp
              ? target.serverPortRegExp
              : "Listening on port ([0-9]+)\r?\n"
          );
          const m = regex.exec(data);
          if (m !== null) {
            target.port = m[1];
            checkTargetPort = (_data: any) => {
              // do nothing now that we have our port
            };
            setTimeout(
              () => {
                gdbserverStartupResolved = true;
                resolve();
              },
              target.serverStartupDelay !== undefined
                ? target.serverStartupDelay
                : 0
            );
          }
        };
      }
      if (this.gdbserver.stdout) {
        this.gdbserver.stdout.on("data", (data) => {
          const out = data.toString();
          if (!gdbserverStartupResolved) {
            accumulatedStdout += out;
          }
          this.sendEvent(new OutputEvent(out, "server"));
          checkTargetPort(accumulatedStdout);
        });
      } else {
        throw new Error("Missing stdout in spawned gdbserver");
      }

      if (this.gdbserver.stderr) {
        this.gdbserver.stderr.on("data", (data) => {
          const err = data.toString();
          if (!gdbserverStartupResolved) {
            accumulatedStderr += err;
          }
          this.sendEvent(new OutputEvent(err, "server"));
          checkTargetPort(accumulatedStderr);
        });
      } else {
        throw new Error("Missing stderr in spawned gdbserver");
      }

      this.gdbserver.on("exit", (code, signal) => {
        let exitmsg: string;
        if (code === null) {
          exitmsg = `${serverExe} is killed by signal ${signal}`;
        } else {
          exitmsg = `${serverExe} has exited with code ${code}`;
        }
        this.sendEvent(new OutputEvent(exitmsg, "server"));
        if (!gdbserverStartupResolved) {
          gdbserverStartupResolved = true;
          reject(new Error(exitmsg + "\n" + accumulatedStderr));
        }
      });

      this.gdbserver.on("error", (err) => {
        const errmsg = `${serverExe} has hit error ${err}`;
        this.sendEvent(new OutputEvent(errmsg, "server"));
        if (!gdbserverStartupResolved) {
          gdbserverStartupResolved = true;
          reject(new Error(errmsg + "\n" + accumulatedStderr));
        }
      });
    });
  }

  protected initializeUARTConnection(
    uart: UARTArguments,
    host: string | undefined
  ): void {
    if (uart.serialPort !== undefined) {
      // Set the path to the serial port
      this.serialPort = new SerialPort({
        path: uart.serialPort,
        // If the serial port path is defined, then so will the baud rate.
        baudRate: uart.baudRate ?? 115200,
        // If the serial port path is deifned, then so will the number of data bits.
        dataBits: uart.characterSize ?? 8,
        // If the serial port path is defined, then so will the number of stop bits.
        stopBits: uart.stopBits ?? 1,
        // If the serial port path is defined, then so will the parity check type.
        parity: uart.parity ?? "none",
        // If the serial port path is defined, then so will the type of handshaking method.
        rtscts: uart.handshakingMethod === "RTS/CTS" ? true : false,
        xon: uart.handshakingMethod === "XON/XOFF" ? true : false,
        xoff: uart.handshakingMethod === "XON/XOFF" ? true : false,
        autoOpen: false,
      });

      this.serialPort.on("open", () => {
        this.sendEvent(
          new OutputEvent(
            `listening on serial port ${this.serialPort?.path}${os.EOL}`,
            "Serial Port"
          )
        );
      });

      const SerialUartParser = new ReadlineParser({
        delimiter: uart.eolCharacter === "CRLF" ? "\r\n" : "\n",
        encoding: "utf8",
      });

      this.serialPort.pipe(SerialUartParser).on("data", (line: string) => {
        this.sendEvent(new OutputEvent(line + os.EOL, "Serial Port"));
      });

      this.serialPort.on("close", () => {
        this.sendEvent(
          new OutputEvent(
            `closing serial port connection${os.EOL}`,
            "Serial Port"
          )
        );
      });

      this.serialPort.on("error", (err) => {
        this.sendEvent(
          new OutputEvent(
            `error on serial port connection${os.EOL} - ${err}`,
            "Serial Port"
          )
        );
      });

      this.serialPort.open();
    } else if (uart.socketPort !== undefined) {
      this.socket = new Socket();
      this.socket.setEncoding("utf-8");

      let tcpUartData = "";
      this.socket.on("data", (data: string) => {
        for (const char of data) {
          if (char === "\n") {
            this.sendEvent(new OutputEvent(tcpUartData + "\n", "Socket"));
            tcpUartData = "";
          } else {
            tcpUartData += char;
          }
        }
      });
      this.socket.on("close", () => {
        this.sendEvent(new OutputEvent(tcpUartData + os.EOL, "Socket"));
        this.sendEvent(
          new OutputEvent(`closing socket connection${os.EOL}`, "Socket")
        );
      });
      this.socket.on("error", (err) => {
        this.sendEvent(
          new OutputEvent(
            `error on socket connection${os.EOL} - ${err}`,
            "Socket"
          )
        );
      });
      this.socket.connect(
        // Putting a + (unary plus operator) infront of the string converts it to a number.
        +uart.socketPort,
        // Default to localhost if target.host is undefined.
        host ?? "localhost",
        () => {
          this.sendEvent(
            new OutputEvent(
              `listening on tcp port ${uart?.socketPort}${os.EOL}`,
              "Socket"
            )
          );
        }
      );
    }
  }

  protected async startGDBAndAttachToTarget(
    response: DebugProtocol.AttachResponse | DebugProtocol.LaunchResponse,
    args: TargetAttachRequestArguments
  ): Promise<void> {
    if (args.target === undefined) {
      args.target = {};
    }
    const target = args.target;
    try {
      this.isAttach = true;
      await this.spawn(args);
      await this.gdb.sendFileExecAndSymbols(args.program);
      await this.gdb.sendEnablePrettyPrint();
      if (args.imageAndSymbols) {
        if (args.imageAndSymbols.symbolFileName) {
          if (args.imageAndSymbols.symbolOffset) {
            await this.gdb.sendAddSymbolFile(
              args.imageAndSymbols.symbolFileName,
              args.imageAndSymbols.symbolOffset
            );
          } else {
            await this.gdb.sendFileSymbolFile(
              args.imageAndSymbols.symbolFileName
            );
          }
        }
      }

      if (target.connectCommands === undefined) {
        this.targetType = target.type !== undefined ? target.type : "remote";
        let defaultTarget: string[];
        if (target.port !== undefined) {
          defaultTarget = [
            target.host !== undefined
              ? `${target.host}:${target.port}`
              : `localhost:${target.port}`,
          ];
        } else {
          defaultTarget = [];
        }
        const targetParameters =
          target.parameters !== undefined ? target.parameters : defaultTarget;
        await mi.sendTargetSelectRequest(this.gdb, {
          type: this.targetType,
          parameters: targetParameters,
        });
        this.sendEvent(
          new OutputEvent(
            `connected to ${this.targetType} target ${targetParameters.join(
              " "
            )}`
          )
        );
      } else {
        await this.gdb.sendCommands(target.connectCommands);
        this.sendEvent(
          new OutputEvent("connected to target using provided connectCommands")
        );
      }

      await this.gdb.sendCommands(args.initCommands);

      if (target.uart !== undefined) {
        this.initializeUARTConnection(target.uart, target.host);
      }

      if (args.imageAndSymbols) {
        if (args.imageAndSymbols.imageFileName) {
          await this.gdb.sendLoad(
            args.imageAndSymbols.imageFileName,
            args.imageAndSymbols.imageOffset
          );
        }
      }
      await this.gdb.sendCommands(args.preRunCommands);
      this.sendEvent(new InitializedEvent());
      this.sendResponse(response);
      this.isInitialized = true;
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected async stopGDBServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.gdbserver || this.gdbserver.exitCode !== null) {
        resolve();
      } else {
        this.gdbserver.on("exit", () => {
          resolve();
        });
        this.gdbserver?.kill();
      }
      setTimeout(() => {
        reject();
      }, 1000);
    });
  }

  protected async disconnectRequest(
    response: DebugProtocol.DisconnectResponse,
    _args: DebugProtocol.DisconnectArguments
  ): Promise<void> {
    try {
      if (this.serialPort !== undefined && this.serialPort.isOpen)
        this.serialPort.close();

      if (this.targetType === "remote") {
        if (this.gdb.getAsyncMode() && this.isRunning) {
          // See #295 - this use of "then" is to try to slightly delay the
          // call to disconnect. A proper solution that waits for the
          // interrupt to be successful is needed to avoid future
          // "Cannot execute this command while the target is running"
          // errors
          this.gdb
            .sendCommand("interrupt")
            .then(() => this.gdb.sendCommand("disconnect"));
        } else {
          await this.gdb.sendCommand("disconnect");
        }
      }

      await this.gdb.sendGDBExit();
      if (this.killGdbServer) {
        await this.stopGDBServer();
        this.sendEvent(new OutputEvent("gdbserver stopped", "server"));
      }
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }
}
