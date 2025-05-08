/*********************************************************************
 * Copyright (c) 2018 QNX Software Systems and others
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *********************************************************************/
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import {
  DebugSession,
  Handles,
  InitializedEvent,
  Logger,
  logger,
  LoggingDebugSession,
  OutputEvent,
  Response,
  Scope,
  Source,
  StackFrame,
  TerminatedEvent,
} from "@vscode/debugadapter";
import { DebugProtocol } from "@vscode/debugprotocol";
import { GDBBackend } from "./GDBBackend";
import * as mi from "./mi";
import {
  sendDataReadMemoryBytes,
  sendDataWriteMemoryBytes,
} from "./mi/data";
import { StoppedEvent } from "./stoppedEvent";
import { VarObjType } from "./varManager";
import { getGdbCwd } from "./util";
import { calculateMemoryOffset } from "./util/calculateMemoryOffset";
import { getInstructions } from "./util/disassembly";

export interface RequestArguments extends DebugProtocol.LaunchRequestArguments {
  gdb?: string;
  gdbArguments?: string[];
  gdbAsync?: boolean;
  gdbNonStop?: boolean;
  // defaults to the environment of the process of the adapter
  environment?: Record<string, string | null>;
  program: string;
  // defaults to dirname of the program, if present or the cwd of the process of the adapter
  cwd?: string;
  verbose?: boolean;
  logFile?: string;
  openGdbConsole?: boolean;
  initCommands?: string[];
  hardwareBreakpoint?: boolean;
  sessionID?: string;
}

export interface LaunchRequestArguments extends RequestArguments {
  arguments?: string;
}

export interface AttachRequestArguments extends RequestArguments {
  processId: string;
}

export interface FrameReference {
  threadId: number;
  frameId: number;
}

export interface FrameVariableReference {
  type: "frame";
  frameHandle: number;
}

export interface ObjectVariableReference {
  type: "object";
  frameHandle: number;
  varobjName: string;
}

export interface RegisterVariableReference {
  type: "registers";
  frameHandle: number;
  regname?: string;
}

export type VariableReference =
  | FrameVariableReference
  | ObjectVariableReference
  | RegisterVariableReference;

export interface MemoryRequestArguments {
  address: string;
  length: number;
  offset?: number;
}

/**
 * Response for our custom 'cdt-gdb-adapter/Memory' request.
 */
export interface MemoryContents {
  /* Hex-encoded string of bytes.  */
  data: string;
  address: string;
}

export interface MemoryResponse extends Response {
  body: MemoryContents;
}

export interface CDTDisassembleArguments
  extends DebugProtocol.DisassembleArguments {
  /**
   * Memory reference to the end location containing the instructions to disassemble. When this
   * optional setting is provided, the minimum number of lines needed to get to the endMemoryReference
   * is used.
   */
  endMemoryReference: string;
}

class ThreadWithStatus implements DebugProtocol.Thread {
  id: number;
  name: string;
  running: boolean;
  constructor(id: number, name: string, running: boolean) {
    this.id = id;
    this.name = name;
    this.running = running;
  }
}

// Allow a single number for ignore count or the form '> [number]'
const ignoreCountRegex = /\s|>/g;
const arrayRegex = /.*\[[\d]+\].*/;
const arrayChildRegex = /[\d]+/;
const numberRegex = /^-?\d+(?:\.\d*)?$/; // match only numbers (integers and floats)
const cNumberTypeRegex = /\b(?:char|short|int|long|float|double)$/; // match C number types
const cBoolRegex = /\bbool$/; // match boolean

export function hexToBase64(hex: string): string {
  // The buffer will ignore incomplete bytes (unpaired digits), so we need to catch that early
  if (hex.length % 2 !== 0) {
    throw new Error("Received memory with incomplete bytes.");
  }
  const base64 = Buffer.from(hex, "hex").toString("base64");
  // If the hex input includes characters that are not hex digits, Buffer.from() will return an empty buffer, and the base64 string will be empty.
  if (base64.length === 0 && hex.length !== 0) {
    throw new Error("Received ill-formed hex input: " + hex);
  }
  return base64;
}

export function base64ToHex(base64: string): string {
  const buffer = Buffer.from(base64, "base64");
  // The caller likely passed in a value that left dangling bits that couldn't be assigned to a full byte and so
  // were ignored by Buffer. We can't be sure what the client thought they wanted to do with those extra bits, so fail here.
  if (buffer.length === 0 || !buffer.toString("base64").startsWith(base64)) {
    throw new Error("Received ill-formed base64 input: " + base64);
  }
  return buffer.toString("hex");
}

export class GDBDebugSession extends LoggingDebugSession {
  /**
   * Initial (aka default) configuration for launch/attach request
   * typically supplied with the --config command line argument.
   */
  protected static defaultRequestArguments?: any;

  /**
   * Frozen configuration for launch/attach request
   * typically supplied with the --config-frozen command line argument.
   */
  protected static frozenRequestArguments?: { request?: string };

  protected gdb: GDBBackend = this.createBackend();
  protected isAttach = false;
  // isRunning === true means there are no threads stopped.
  protected isRunning = false;

  protected supportsRunInTerminalRequest = false;
  protected supportsGdbConsole = false;

  protected isPostMortem = false;

  /* A reference to the logger to be used by subclasses */
  protected logger: Logger.Logger;

  protected frameHandles = new Handles<FrameReference>();
  protected variableHandles = new Handles<VariableReference>();
  protected functionBreakpoints: string[] = [];
  protected logPointMessages: { [key: string]: string } = {};

  protected threads: ThreadWithStatus[] = [];

  // promise that resolves once the target stops so breakpoints can be inserted
  protected waitPaused?: (value?: void | PromiseLike<void>) => void;
  // the thread id that we were waiting for
  protected waitPausedThreadId = 0;
  // set to true if the target was interrupted where inteneded, and should
  // therefore be resumed after breakpoints are inserted.
  protected waitPausedNeeded = false;
  protected isInitialized = false;

  constructor() {
    super();
    this.logger = logger;
  }

  /**
   * Main entry point
   */
  public static run(debugSession: typeof GDBDebugSession) {
    GDBDebugSession.processArgv(process.argv.slice(2));
    DebugSession.run(debugSession);
  }

  /**
   * Parse an optional config file which is a JSON string of launch/attach request arguments.
   * The config can be a response file by starting with an @.
   */
  public static processArgv(args: string[]) {
    args.forEach(function (val, _index, _array) {
      const configMatch = /^--config(-frozen)?=(.*)$/.exec(val);
      if (configMatch) {
        let configJson;
        const configStr = configMatch[2];
        if (configStr.startsWith("@")) {
          const configFile = configStr.slice(1);
          configJson = JSON.parse(fs.readFileSync(configFile).toString("utf8"));
        } else {
          configJson = JSON.parse(configStr);
        }
        if (configMatch[1]) {
          GDBDebugSession.frozenRequestArguments = configJson;
        } else {
          GDBDebugSession.defaultRequestArguments = configJson;
        }
      }
    });
  }

  /**
   * Apply the initial and frozen launch/attach request arguments.
   * @param request the default request type to return if request type is not frozen
   * @param args the arguments from the user to apply initial and frozen arguments to.
   * @returns resolved request type and the resolved arguments
   */
  protected applyRequestArguments(
    request: "launch" | "attach",
    args: LaunchRequestArguments | AttachRequestArguments
  ): ["launch" | "attach", LaunchRequestArguments | AttachRequestArguments] {
    const frozenRequest = GDBDebugSession.frozenRequestArguments?.request;
    if (frozenRequest === "launch" || frozenRequest === "attach") {
      request = frozenRequest;
    }

    return [
      request,
      {
        ...GDBDebugSession.defaultRequestArguments,
        ...args,
        ...GDBDebugSession.frozenRequestArguments,
      },
    ];
  }

  protected createBackend(): GDBBackend {
    return new GDBBackend();
  }

  /**
   * Handle requests not defined in the debug adapter protocol.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected customRequest(
    command: string,
    response: DebugProtocol.Response,
    args: any
  ): void {
    if (command === "cdt-gdb-adapter/Memory") {
      this.memoryRequest(response as MemoryResponse, args);
      // This custom request exists to allow tests in this repository to run arbitrary commands
      // Use at your own risk!
    } else if (command === "cdt-gdb-tests/executeCommand") {
      const consoleOutput: string[] = [];
      const consoleOutputListener = (line: string) => consoleOutput.push(line);
      // Listens the console output for test and controls purpose during the
      // test command execution. Boundry of the console output not guaranteed.
      this.gdb.addListener("consoleStreamOutput", consoleOutputListener);
      this.gdb
        .sendCommand(args.command)
        .then((result) => {
          response.body = {
            status: "Ok",
            result,
            console: consoleOutput,
          };
          this.sendResponse(response);
        })
        .catch((e) => {
          const message =
            e instanceof Error
              ? e.message
              : `Encountered a problem executing ${args.command}`;
          this.sendErrorResponse(response, 1, message);
        })
        .finally(() => {
          this.gdb.removeListener("consoleStreamOutput", consoleOutputListener);
        });
    } else {
      return super.customRequest(command, response, args);
    }
  }

  protected initializeRequest(
    response: DebugProtocol.InitializeResponse,
    args: DebugProtocol.InitializeRequestArguments
  ): void {
    this.supportsRunInTerminalRequest =
      args.supportsRunInTerminalRequest === true;
    this.supportsGdbConsole =
      os.platform() === "linux" && this.supportsRunInTerminalRequest;
    response.body = response.body || {};
    response.body.supportsConfigurationDoneRequest = true;
    response.body.supportsSetVariable = true;
    response.body.supportsConditionalBreakpoints = true;
    response.body.supportsHitConditionalBreakpoints = true;
    response.body.supportsLogPoints = true;
    response.body.supportsFunctionBreakpoints = true;
    response.body.supportsDisassembleRequest = true;
    response.body.supportsReadMemoryRequest = true;
    response.body.supportsWriteMemoryRequest = true;
    response.body.supportsSteppingGranularity = true;
    this.sendResponse(response);
  }

  protected async attachOrLaunchRequest(
    response: DebugProtocol.Response,
    request: "launch" | "attach",
    args: LaunchRequestArguments | AttachRequestArguments
  ) {
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

    await this.spawn(args);
    if (!args.program) {
      this.sendErrorResponse(
        response,
        1,
        "The program must be specified in the request arguments"
      );
      return;
    }
    await this.gdb.sendFileExecAndSymbols(args.program);
    await this.gdb.sendEnablePrettyPrint();

    if (request === "attach") {
      this.isAttach = true;
      const attachArgs = args as AttachRequestArguments;
      await mi.sendTargetAttachRequest(this.gdb, {
        pid: attachArgs.processId,
      });
      this.sendEvent(
        new OutputEvent(`attached to process ${attachArgs.processId}`)
      );
    }

    await this.gdb.sendCommands(args.initCommands);

    if (request === "launch") {
      const launchArgs = args as LaunchRequestArguments;
      if (launchArgs.arguments) {
        await mi.sendExecArguments(this.gdb, {
          arguments: launchArgs.arguments,
        });
      }
    }
    this.sendEvent(new InitializedEvent());
    this.sendResponse(response);
    this.isInitialized = true;
  }

  protected async attachRequest(
    response: DebugProtocol.AttachResponse,
    args: AttachRequestArguments
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

  protected async launchRequest(
    response: DebugProtocol.LaunchResponse,
    args: LaunchRequestArguments
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

  protected async spawn(args: LaunchRequestArguments | AttachRequestArguments) {
    if (args.openGdbConsole) {
      if (!this.supportsGdbConsole) {
        logger.warn(
          "cdt-gdb-adapter: openGdbConsole is not supported on this platform"
        );
      } else if (
        !(await this.gdb.supportsNewUi(
          args.gdb,
          getGdbCwd(args),
          args.environment
        ))
      ) {
        logger.warn(
          `cdt-gdb-adapter: new-ui command not detected (${args.gdb || "gdb"})`
        );
      } else {
        logger.warn(
          "cdt-gdb-adapter: spawning gdb console in client terminal is not supported"
        );
      }
    }
    return this.gdb.spawn(args);
  }

  protected async setBreakPointsRequest(
    response: DebugProtocol.SetBreakpointsResponse,
    args: DebugProtocol.SetBreakpointsArguments
  ): Promise<void> {
    this.waitPausedNeeded = this.isRunning;
    if (this.waitPausedNeeded) {
      // Need to pause first
      const waitPromise = new Promise<void>((resolve) => {
        this.waitPaused = resolve;
      });
      if (this.gdb.isNonStopMode()) {
        const threadInfo = await mi.sendThreadInfoRequest(this.gdb, {});

        this.waitPausedThreadId = parseInt(threadInfo["current-thread-id"], 10);
        this.gdb.pause(this.waitPausedThreadId);
      } else {
        this.gdb.pause();
      }
      await waitPromise;
    }

    try {
      // Need to get the list of current breakpoints in the file and then make sure
      // that we end up with the requested set of breakpoints for that file
      // deleting ones not requested and inserting new ones.

      const result = await mi.sendBreakList(this.gdb);
      const file = args.source.path as string;
      const gdbOriginalLocationPrefix = await mi.sourceBreakpointLocation(
        this.gdb,
        file
      );
      const gdbbps = result.BreakpointTable.body.filter((gdbbp) => {
        // Ignore "children" breakpoint of <MULTIPLE> entries
        if (gdbbp.number.includes(".")) {
          return false;
        }

        // Ignore other files
        if (!gdbbp["original-location"]) {
          return false;
        }
        if (!gdbbp["original-location"].startsWith(gdbOriginalLocationPrefix)) {
          return false;
        }

        // Ignore function breakpoints
        return this.functionBreakpoints.indexOf(gdbbp.number) === -1;
      });

      const { resolved, deletes } = this.resolveBreakpoints(
        args.breakpoints || [],
        gdbbps,
        (vsbp, gdbbp) => {
          // Always invalidate hit conditions as they have a one-way mapping to gdb ignore and temporary
          if (vsbp.hitCondition) {
            return false;
          }

          // Ensure we can compare undefined and empty strings
          const vsbpCond = vsbp.condition || undefined;
          const gdbbpCond = gdbbp.cond || undefined;

          // Check with original-location so that relocated breakpoints are properly matched
          const gdbOriginalLocation = `${gdbOriginalLocationPrefix}${vsbp.line}`;
          return !!(
            gdbbp["original-location"] === gdbOriginalLocation &&
            vsbpCond === gdbbpCond
          );
        }
      );

      // Delete before insert to avoid breakpoint clashes in gdb
      if (deletes.length > 0) {
        await mi.sendBreakDelete(this.gdb, { breakpoints: deletes });
        deletes.forEach(
          (breakpoint) => delete this.logPointMessages[breakpoint]
        );
      }

      // Reset logPoints
      this.logPointMessages = {};

      // Set up logpoint messages and return a formatted breakpoint for the response body
      const createState = (
        vsbp: DebugProtocol.SourceBreakpoint,
        gdbbp: mi.MIBreakpointInfo
      ): DebugProtocol.Breakpoint => {
        if (vsbp.logMessage) {
          this.logPointMessages[gdbbp.number] = vsbp.logMessage;
        }

        let line = 0;
        if (gdbbp.line) {
          line = parseInt(gdbbp.line, 10);
        } else if (vsbp.line) {
          line = vsbp.line;
        }

        return {
          id: parseInt(gdbbp.number, 10),
          line,
          verified: true,
        };
      };

      const actual: DebugProtocol.Breakpoint[] = [];

      for (const bp of resolved) {
        if (bp.gdbbp) {
          actual.push(createState(bp.vsbp, bp.gdbbp));
          continue;
        }

        let temporary = false;
        let ignoreCount: number | undefined;
        const vsbp = bp.vsbp;
        if (vsbp.hitCondition !== undefined) {
          ignoreCount = parseInt(
            vsbp.hitCondition.replace(ignoreCountRegex, ""),
            10
          );
          if (isNaN(ignoreCount)) {
            this.sendEvent(
              new OutputEvent(
                `Unable to decode expression: ${vsbp.hitCondition}`
              )
            );
            continue;
          }

          // Allow hit condition continuously above the count
          temporary = !vsbp.hitCondition.startsWith(">");
          if (temporary) {
            // The expression is not 'greater than', decrease ignoreCount to match
            ignoreCount--;
          }
        }

        try {
          const line = vsbp.line.toString();
          const options = await this.gdb.getBreakpointOptions(
            {
              locationType: "source",
              source: file,
              line,
            },
            {
              condition: vsbp.condition,
              temporary,
              ignoreCount,
              hardware: this.gdb.isUseHWBreakpoint(),
            }
          );
          const gdbbp = await mi.sendSourceBreakpointInsert(
            this.gdb,
            file,
            line,
            options
          );
          actual.push(createState(vsbp, gdbbp.bkpt));
        } catch (err) {
          actual.push({
            verified: false,
            message: err instanceof Error ? err.message : String(err),
          } as DebugProtocol.Breakpoint);
        }
      }

      response.body = {
        breakpoints: actual,
      };

      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }

    if (this.waitPausedNeeded) {
      if (this.gdb.isNonStopMode()) {
        mi.sendExecContinue(this.gdb, this.waitPausedThreadId);
      } else {
        mi.sendExecContinue(this.gdb);
      }
    }
  }

  protected async setFunctionBreakPointsRequest(
    response: DebugProtocol.SetFunctionBreakpointsResponse,
    args: DebugProtocol.SetFunctionBreakpointsArguments
  ) {
    this.waitPausedNeeded = this.isRunning;
    if (this.waitPausedNeeded) {
      // Need to pause first
      const waitPromise = new Promise<void>((resolve) => {
        this.waitPaused = resolve;
      });
      if (this.gdb.isNonStopMode()) {
        const threadInfo = await mi.sendThreadInfoRequest(this.gdb, {});

        this.waitPausedThreadId = parseInt(threadInfo["current-thread-id"], 10);
        this.gdb.pause(this.waitPausedThreadId);
      } else {
        this.gdb.pause();
      }
      await waitPromise;
    }

    try {
      const result = await mi.sendBreakList(this.gdb);
      const gdbbps = result.BreakpointTable.body.filter((gdbbp) => {
        // Only function breakpoints
        return this.functionBreakpoints.indexOf(gdbbp.number) > -1;
      });

      const { resolved, deletes } = this.resolveBreakpoints(
        args.breakpoints,
        gdbbps,
        (vsbp, gdbbp) => {
          // Always invalidate hit conditions as they have a one-way mapping to gdb ignore and temporary
          if (vsbp.hitCondition) {
            return false;
          }

          // Ensure we can compare undefined and empty strings
          const vsbpCond = vsbp.condition || undefined;
          const gdbbpCond = gdbbp.cond || undefined;

          const originalLocation = mi.functionBreakpointLocation(
            this.gdb,
            vsbp.name
          );
          return !!(
            gdbbp["original-location"] === originalLocation &&
            vsbpCond === gdbbpCond
          );
        }
      );

      // Delete before insert to avoid breakpoint clashes in gdb
      if (deletes.length > 0) {
        await mi.sendBreakDelete(this.gdb, { breakpoints: deletes });
        this.functionBreakpoints = this.functionBreakpoints.filter(
          (fnbp) => deletes.indexOf(fnbp) === -1
        );
      }

      const createActual = (
        breakpoint: mi.MIBreakpointInfo
      ): DebugProtocol.Breakpoint => ({
        id: parseInt(breakpoint.number, 10),
        verified: true,
      });

      const actual: DebugProtocol.Breakpoint[] = [];

      for (const bp of resolved) {
        if (bp.gdbbp) {
          actual.push(createActual(bp.gdbbp));
          continue;
        }

        try {
          const options = await this.gdb.getBreakpointOptions(
            {
              locationType: "function",
              fn: bp.vsbp.name,
            },
            {
              hardware: this.gdb.isUseHWBreakpoint(),
            }
          );
          const gdbbp = await mi.sendFunctionBreakpointInsert(
            this.gdb,
            bp.vsbp.name,
            options
          );
          this.functionBreakpoints.push(gdbbp.bkpt.number);
          actual.push(createActual(gdbbp.bkpt));
        } catch (err) {
          actual.push({
            verified: false,
            message: err instanceof Error ? err.message : String(err),
          } as DebugProtocol.Breakpoint);
        }
      }

      response.body = {
        breakpoints: actual,
      };

      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }

    if (this.waitPausedNeeded) {
      if (this.gdb.isNonStopMode()) {
        mi.sendExecContinue(this.gdb, this.waitPausedThreadId);
      } else {
        mi.sendExecContinue(this.gdb);
      }
    }
  }

  /**
   * Resolved which VS breakpoints needs to be installed, which
   * GDB breakpoints need to be deleted and which VS breakpoints
   * are already installed with which matching GDB breakpoint.
   * @param vsbps VS DAP breakpoints
   * @param gdbbps GDB breakpoints
   * @param matchFn matcher to compare VS and GDB breakpoints
   * @returns resolved -> array maintaining order of vsbps that identifies whether
   * VS breakpoint has a cooresponding GDB breakpoint (gdbbp field set) or needs to be
   * inserted (gdbbp field empty)
   * deletes -> GDB bps ids that should be deleted because they don't match vsbps
   */
  protected resolveBreakpoints<T>(
    vsbps: T[],
    gdbbps: mi.MIBreakpointInfo[],
    matchFn: (vsbp: T, gdbbp: mi.MIBreakpointInfo) => boolean
  ): {
    resolved: Array<{ vsbp: T; gdbbp?: mi.MIBreakpointInfo }>;
    deletes: string[];
  } {
    const resolved: Array<{ vsbp: T; gdbbp?: mi.MIBreakpointInfo }> = vsbps.map(
      (vsbp) => {
        return {
          vsbp,
          gdbbp: gdbbps.find((gdbbp) => matchFn(vsbp, gdbbp)),
        };
      }
    );

    const deletes = gdbbps
      .filter((gdbbp) => {
        return !vsbps.find((vsbp) => matchFn(vsbp, gdbbp));
      })
      .map((gdbbp) => gdbbp.number);

    return { resolved, deletes };
  }

  protected async configurationDoneRequest(
    response: DebugProtocol.ConfigurationDoneResponse,
    _args: DebugProtocol.ConfigurationDoneArguments
  ): Promise<void> {
    try {
      this.sendEvent(
        new OutputEvent(
          "\n" +
            "In the Debug Console view you can interact directly with GDB.\n" +
            "To display the value of an expression, type that expression which can reference\n" +
            "variables that are in scope. For example type '2 + 3' or the name of a variable.\n" +
            "Arbitrary commands can be sent to GDB by prefixing the input with a '>',\n" +
            "for example type '>show version' or '>help'.\n" +
            "\n",
          "console"
        )
      );
      if (!this.isPostMortem) {
        if (this.isAttach) {
          await mi.sendExecContinue(this.gdb);
        } else {
          await mi.sendExecRun(this.gdb);
        }
      } else {
        this.sendEvent(new StoppedEvent("exception", 1, true));
      }
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        100,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected convertThread(thread: mi.MIThreadInfo) {
    let name = thread.name || thread.id;

    if (thread.details) {
      name += ` (${thread.details})`;
    }

    const running = thread.state === "running";

    return new ThreadWithStatus(parseInt(thread.id, 10), name, running);
  }

  protected async threadsRequest(
    response: DebugProtocol.ThreadsResponse
  ): Promise<void> {
    try {
      if (!this.isRunning) {
        const result = await mi.sendThreadInfoRequest(this.gdb, {});
        this.threads = result.threads
          .map((thread) => this.convertThread(thread))
          .sort((a, b) => a.id - b.id);
      }

      response.body = {
        threads: this.threads,
      };

      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected async stackTraceRequest(
    response: DebugProtocol.StackTraceResponse,
    args: DebugProtocol.StackTraceArguments
  ): Promise<void> {
    try {
      const threadId = args.threadId;
      const depthResult = await mi.sendStackInfoDepth(this.gdb, {
        maxDepth: 100,
        threadId,
      });
      const depth = parseInt(depthResult.depth, 10);
      const levels = args.levels
        ? args.levels > depth
          ? depth
          : args.levels
        : depth;
      const lowFrame = args.startFrame || 0;
      const highFrame = lowFrame + levels - 1;
      const listResult = await mi.sendStackListFramesRequest(this.gdb, {
        lowFrame,
        highFrame,
        threadId,
      });

      const stack = listResult.stack.map((frame) => {
        let source;
        if (frame.fullname) {
          source = new Source(
            path.basename(frame.file || frame.fullname),
            frame.fullname
          );
        }
        let line;
        if (frame.line) {
          line = parseInt(frame.line, 10);
        }
        const frameHandle = this.frameHandles.create({
          threadId: args.threadId,
          frameId: parseInt(frame.level, 10),
        });
        const name = frame.func || frame.fullname || "";
        const sf = new StackFrame(
          frameHandle,
          name,
          source,
          line
        ) as DebugProtocol.StackFrame;
        sf.instructionPointerReference = frame.addr;
        return sf;
      });

      response.body = {
        stackFrames: stack,
        totalFrames: depth,
      };

      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected async nextRequest(
    response: DebugProtocol.NextResponse,
    args: DebugProtocol.NextArguments
  ): Promise<void> {
    try {
      await (args.granularity === "instruction"
        ? mi.sendExecNextInstruction(this.gdb, args.threadId)
        : mi.sendExecNext(this.gdb, args.threadId));
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected async stepInRequest(
    response: DebugProtocol.StepInResponse,
    args: DebugProtocol.StepInArguments
  ): Promise<void> {
    try {
      await (args.granularity === "instruction"
        ? mi.sendExecStepInstruction(this.gdb, args.threadId)
        : mi.sendExecStep(this.gdb, args.threadId));
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected async stepOutRequest(
    response: DebugProtocol.StepOutResponse,
    args: DebugProtocol.StepOutArguments
  ): Promise<void> {
    try {
      await mi.sendExecFinish(this.gdb, args.threadId);
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected async continueRequest(
    response: DebugProtocol.ContinueResponse,
    args: DebugProtocol.ContinueArguments
  ): Promise<void> {
    try {
      await mi.sendExecContinue(this.gdb, args.threadId);
      let isAllThreadsContinued;
      if (this.gdb.isNonStopMode()) {
        isAllThreadsContinued = args.threadId ? false : true;
      } else {
        isAllThreadsContinued = true;
      }
      response.body = {
        allThreadsContinued: isAllThreadsContinued,
      };
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected async pauseRequest(
    response: DebugProtocol.PauseResponse,
    args: DebugProtocol.PauseArguments
  ): Promise<void> {
    try {
      this.gdb.pause(args.threadId);
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected scopesRequest(
    response: DebugProtocol.ScopesResponse,
    args: DebugProtocol.ScopesArguments
  ): void {
    const frame: FrameVariableReference = {
      type: "frame",
      frameHandle: args.frameId,
    };

    const registers: RegisterVariableReference = {
      type: "registers",
      frameHandle: args.frameId,
    };

    response.body = {
      scopes: [
        new Scope("Local", this.variableHandles.create(frame), false),
        new Scope("Registers", this.variableHandles.create(registers), true),
      ],
    };

    this.sendResponse(response);
  }

  protected async variablesRequest(
    response: DebugProtocol.VariablesResponse,
    args: DebugProtocol.VariablesArguments
  ): Promise<void> {
    const variables = new Array<DebugProtocol.Variable>();
    response.body = {
      variables,
    };
    try {
      const ref = this.variableHandles.get(args.variablesReference);
      if (!ref) {
        this.sendResponse(response);
        return;
      }
      if (ref.type === "registers") {
        response.body.variables = await this.handleVariableRequestRegister(ref);
      } else if (ref.type === "frame") {
        response.body.variables = await this.handleVariableRequestFrame(ref);
      } else if (ref.type === "object") {
        response.body.variables = await this.handleVariableRequestObject(ref);
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

  protected async setVariableRequest(
    response: DebugProtocol.SetVariableResponse,
    args: DebugProtocol.SetVariableArguments
  ): Promise<void> {
    try {
      const ref = this.variableHandles.get(args.variablesReference);
      if (!ref) {
        this.sendResponse(response);
        return;
      }
      const frame = this.frameHandles.get(ref.frameHandle);
      if (!frame) {
        this.sendResponse(response);
        return;
      }
      const parentVarname = ref.type === "object" ? ref.varobjName : "";
      const varname =
        parentVarname +
        (parentVarname === "" ? "" : ".") +
        args.name.replace(/^\[(\d+)\]/, "$1");
      const stackDepth = await mi.sendStackInfoDepth(this.gdb, {
        maxDepth: 100,
      });
      const depth = parseInt(stackDepth.depth, 10);
      let varobj = this.gdb.varManager.getVar(
        frame.frameId,
        frame.threadId,
        depth,
        varname,
        ref.type
      );
      if (!varobj && ref.type === "registers") {
        const varCreateResponse = await mi.sendVarCreate(this.gdb, {
          expression: "$" + args.name,
          frameId: frame.frameId,
          threadId: frame.threadId,
        });
        varobj = this.gdb.varManager.addVar(
          frame.frameId,
          frame.threadId,
          depth,
          args.name,
          false,
          false,
          varCreateResponse,
          ref.type
        );
        await mi.sendVarSetFormatToHex(this.gdb, varobj.varname);
      }
      let assign;
      if (varobj) {
        assign = await mi.sendVarAssign(this.gdb, {
          varname: varobj.varname,
          expression: args.value,
        });
      } else {
        try {
          assign = await mi.sendVarAssign(this.gdb, {
            varname,
            expression: args.value,
          });
        } catch (err) {
          if (parentVarname === "") {
            throw err; // no recovery possible
          }
          const children = await mi.sendVarListChildren(this.gdb, {
            name: parentVarname,
            printValues: mi.MIVarPrintValues.all,
          });
          for (const child of children.children) {
            if (this.isChildOfClass(child)) {
              const grandchildVarname =
                child.name + "." + args.name.replace(/^\[(\d+)\]/, "$1");
              varobj = this.gdb.varManager.getVar(
                frame.frameId,
                frame.threadId,
                depth,
                grandchildVarname
              );
              try {
                assign = await mi.sendVarAssign(this.gdb, {
                  varname: grandchildVarname,
                  expression: args.value,
                });
                break;
              } catch (err) {
                continue; // try another child
              }
            }
          }
          if (!assign) {
            throw err; // no recovery possible
          }
        }
      }
      response.body = {
        value: assign.value,
        type: varobj ? varobj.type : undefined,
        variablesReference:
          varobj && parseInt(varobj.numchild, 10) > 0
            ? this.variableHandles.create({
                type: "object",
                frameHandle: ref.frameHandle,
                varobjName: varobj.varname,
              })
            : 0,
      };
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
    this.sendResponse(response);
  }

  protected async evaluateRequest(
    response: DebugProtocol.EvaluateResponse,
    args: DebugProtocol.EvaluateArguments
  ): Promise<void> {
    response.body = {
      result: "Error: could not evaluate expression",
      variablesReference: 0,
    }; // default response
    try {
      if (args.frameId === undefined) {
        throw new Error(
          "Evaluation of expression without frameId is not supported."
        );
      }

      const frame = this.frameHandles.get(args.frameId);
      if (!frame) {
        this.sendResponse(response);
        return;
      }

      if (args.expression.startsWith(">") && args.context === "repl") {
        if (args.expression[1] === "-") {
          await this.gdb.sendCommand(args.expression.slice(1));
        } else {
          await mi.sendInterpreterExecConsole(this.gdb, {
            threadId: frame.threadId,
            frameId: frame.frameId,
            command: args.expression.slice(1),
          });
        }
        response.body = {
          result: "\r",
          variablesReference: 0,
        };
        this.sendResponse(response);
        return;
      }

      const stackDepth = await mi.sendStackInfoDepth(this.gdb, {
        maxDepth: 100,
      });
      const depth = parseInt(stackDepth.depth, 10);
      let varobj = this.gdb.varManager.getVar(
        frame.frameId,
        frame.threadId,
        depth,
        args.expression
      );
      if (!varobj) {
        const varCreateResponse = await mi.sendVarCreate(this.gdb, {
          expression: args.expression,
          frameId: frame.frameId,
          threadId: frame.threadId,
        });
        varobj = this.gdb.varManager.addVar(
          frame.frameId,
          frame.threadId,
          depth,
          args.expression,
          false,
          false,
          varCreateResponse
        );
      } else {
        const vup = await mi.sendVarUpdate(this.gdb, {
          name: varobj.varname,
        });
        const update = vup.changelist[0];
        if (update) {
          if (update.in_scope === "true") {
            if (update.name === varobj.varname) {
              varobj.value = update.value;
            }
          } else {
            this.gdb.varManager.removeVar(
              frame.frameId,
              frame.threadId,
              depth,
              varobj.varname
            );
            await mi.sendVarDelete(this.gdb, {
              varname: varobj.varname,
            });
            const varCreateResponse = await mi.sendVarCreate(this.gdb, {
              expression: args.expression,
              frameId: frame.frameId,
              threadId: frame.threadId,
            });
            varobj = this.gdb.varManager.addVar(
              frame.frameId,
              frame.threadId,
              depth,
              args.expression,
              false,
              false,
              varCreateResponse
            );
          }
        }
      }
      if (varobj) {
        const result =
          args.context === "variables" && Number(varobj.numchild)
            ? await this.getChildElements(varobj, args.frameId)
            : varobj.value;
        response.body = {
          result,
          type: varobj.type,
          variablesReference:
            parseInt(varobj.numchild, 10) > 0
              ? this.variableHandles.create({
                  type: "object",
                  frameHandle: args.frameId,
                  varobjName: varobj.varname,
                })
              : 0,
        };
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

  protected async getChildElements(varobj: VarObjType, frameHandle: number) {
    if (Number(varobj.numchild) > 0) {
      const objRef: ObjectVariableReference = {
        type: "object",
        frameHandle: frameHandle,
        varobjName: varobj.varname,
      };
      const childVariables: DebugProtocol.Variable[] = await this.handleVariableRequestObject(
        objRef
      );
      const value = arrayChildRegex.test(varobj.type)
        ? childVariables.map<string | number | boolean>((child) =>
            this.convertValue(child)
          )
        : childVariables.reduce<Record<string, string | number | boolean>>(
            (accum, child) => (
              (accum[child.name] = this.convertValue(child)), accum
            ),
            {}
          );
      return JSON.stringify(value, null, 2);
    }
    return varobj.value;
  }

  protected convertValue(variable: DebugProtocol.Variable) {
    const varValue = variable.value;
    const varType = String(variable.type);
    if (cNumberTypeRegex.test(varType)) {
      if (numberRegex.test(varValue)) {
        return Number(varValue);
      } else {
        // probably a string/other representation
        return String(varValue);
      }
    } else if (cBoolRegex.test(varType)) {
      return Boolean(varValue);
    } else {
      return varValue;
    }
  }

  /**
   * Implement the cdt-gdb-adapter/Memory request.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async memoryRequest(response: MemoryResponse, args: any) {
    try {
      if (typeof args.address !== "string") {
        throw new Error(
          `Invalid type for 'address', expected string, got ${typeof args.address}`
        );
      }

      if (typeof args.length !== "number") {
        throw new Error(
          `Invalid type for 'length', expected number, got ${typeof args.length}`
        );
      }

      if (
        typeof args.offset !== "number" &&
        typeof args.offset !== "undefined"
      ) {
        throw new Error(
          `Invalid type for 'offset', expected number or undefined, got ${typeof args.offset}`
        );
      }

      const typedArgs = args as MemoryRequestArguments;

      const result = await sendDataReadMemoryBytes(
        this.gdb,
        typedArgs.address,
        typedArgs.length,
        typedArgs.offset
      );
      response.body = {
        data: result.memory[0].contents,
        address: result.memory[0].begin,
      };
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected async disassembleRequest(
    response: DebugProtocol.DisassembleResponse,
    args: CDTDisassembleArguments
  ) {
    try {
      if (!args.memoryReference) {
          throw new Error('Target memory reference is not specified!');
      }
      const instructionStartOffset = args.instructionOffset ?? 0;
      const instructionEndOffset =
          args.instructionCount + instructionStartOffset;
      const instructions: DebugProtocol.DisassembledInstruction[] = [];
      const memoryReference =
          args.offset === undefined
              ? args.memoryReference
              : calculateMemoryOffset(args.memoryReference, args.offset);

      if (instructionStartOffset < 0) {
          // Getting lower memory area
          const list = await getInstructions(
              this.gdb,
              memoryReference,
              instructionStartOffset
          );

          // Add them to instruction list
          instructions.push(...list);
      }

      if (instructionEndOffset > 0) {
          // Getting higher memory area
          const list = await getInstructions(
              this.gdb,
              memoryReference,
              instructionEndOffset
          );

          // Add them to instruction list
          instructions.push(...list);
      }

      response.body = {
          instructions,
      };
      this.sendResponse(response);
  } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.sendEvent(new OutputEvent(`Error: ${message}`));
      this.sendErrorResponse(response, 1, message);
  }
  }

  protected async readMemoryRequest(
    response: DebugProtocol.ReadMemoryResponse,
    args: DebugProtocol.ReadMemoryArguments
  ): Promise<void> {
    try {
      if (args.count) {
        const result = await sendDataReadMemoryBytes(
          this.gdb,
          args.memoryReference,
          args.count,
          args.offset
        );
        response.body = {
          data: hexToBase64(result.memory[0].contents),
          address: result.memory[0].begin,
        };
        this.sendResponse(response);
      } else {
        this.sendResponse(response);
      }
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  /**
   * Implement the memoryWrite request.
   */
  protected async writeMemoryRequest(
    response: DebugProtocol.WriteMemoryResponse,
    args: DebugProtocol.WriteMemoryArguments
  ) {
    try {
      const { memoryReference, data } = args;
      const typeofAddress = typeof memoryReference;
      const typeofContent = typeof data;
      if (typeofAddress !== "string") {
        throw new Error(
          `Invalid type for 'address', expected string, got ${typeofAddress}`
        );
      }
      if (typeofContent !== "string") {
        throw new Error(
          `Invalid type for 'content', expected string, got ${typeofContent}`
        );
      }
      const hexContent = base64ToHex(data);
      await sendDataWriteMemoryBytes(this.gdb, memoryReference, hexContent);
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected async disconnectRequest(
    response: DebugProtocol.DisconnectResponse,
    _args: DebugProtocol.DisconnectArguments
  ): Promise<void> {
    try {
      await this.gdb.sendGDBExit();
      this.sendResponse(response);
    } catch (err) {
      this.sendErrorResponse(
        response,
        1,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  protected sendStoppedEvent(
    reason: string,
    threadId: number,
    allThreadsStopped?: boolean
  ) {
    // Reset frame handles and variables for new context
    this.frameHandles.reset();
    this.variableHandles.reset();
    // Send the event
    this.sendEvent(new StoppedEvent(reason, threadId, allThreadsStopped));
  }

  protected handleGDBStopped(result: any) {
    const getThreadId = (resultData: any) =>
      parseInt(resultData["thread-id"], 10);
    const getAllThreadsStopped = (resultData: any) => {
      return (
        !!resultData["stopped-threads"] &&
        resultData["stopped-threads"] === "all"
      );
    };

    switch (result.reason) {
      case "exited":
      case "exited-normally":
        this.sendEvent(new TerminatedEvent());
        break;
      case "breakpoint-hit":
        if (this.logPointMessages[result.bkptno]) {
          this.sendEvent(new OutputEvent(this.logPointMessages[result.bkptno]));
          mi.sendExecContinue(this.gdb);
        } else {
          const reason =
            this.functionBreakpoints.indexOf(result.bkptno) > -1
              ? "function breakpoint"
              : "breakpoint";
          this.sendStoppedEvent(
            reason,
            getThreadId(result),
            getAllThreadsStopped(result)
          );
        }
        break;
      case "end-stepping-range":
      case "function-finished":
        this.sendStoppedEvent(
          "step",
          getThreadId(result),
          getAllThreadsStopped(result)
        );
        break;
      case "signal-received": {
        const name = result["signal-name"] || "signal";
        this.sendStoppedEvent(
          name,
          getThreadId(result),
          getAllThreadsStopped(result)
        );
        break;
      }
      default:
        this.sendStoppedEvent(
          "generic",
          getThreadId(result),
          getAllThreadsStopped(result)
        );
    }
  }

  protected handleGDBAsync(resultClass: string, resultData: any) {
    const updateIsRunning = () => {
      this.isRunning = this.threads.length ? true : false;
      for (const thread of this.threads) {
        if (!thread.running) {
          this.isRunning = false;
        }
      }
    };
    switch (resultClass) {
      case "running":
        if (this.gdb.isNonStopMode()) {
          const id = parseInt(resultData["thread-id"], 10);
          for (const thread of this.threads) {
            if (thread.id === id) {
              thread.running = true;
            }
          }
        } else {
          for (const thread of this.threads) {
            thread.running = true;
          }
        }
        updateIsRunning();
        break;
      case "stopped": {
        let suppressHandleGDBStopped = false;
        if (this.gdb.isNonStopMode()) {
          const id = parseInt(resultData["thread-id"], 10);
          for (const thread of this.threads) {
            if (thread.id === id) {
              thread.running = false;
            }
          }
          if (
            this.waitPaused &&
            resultData.reason === "signal-received" &&
            this.waitPausedThreadId === id
          ) {
            suppressHandleGDBStopped = true;
          }
        } else {
          for (const thread of this.threads) {
            thread.running = false;
          }
          if (this.waitPaused && resultData.reason === "signal-received") {
            suppressHandleGDBStopped = true;
          }
        }

        if (this.waitPaused) {
          if (!suppressHandleGDBStopped) {
            // if we aren't suppressing the stopped event going
            // to the client, then we also musn't resume the
            // target after inserting the breakpoints
            this.waitPausedNeeded = false;
          }
          this.waitPaused();
          this.waitPaused = undefined;
        }

        const wasRunning = this.isRunning;
        updateIsRunning();
        if (
          !suppressHandleGDBStopped &&
          (this.gdb.isNonStopMode() || (wasRunning && !this.isRunning))
        ) {
          if (this.isInitialized) {
            this.handleGDBStopped(resultData);
          }
        }
        break;
      }
      default:
        logger.warn(
          `GDB unhandled async: ${resultClass}: ${JSON.stringify(resultData)}`
        );
    }
  }

  protected handleGDBNotify(notifyClass: string, notifyData: any) {
    switch (notifyClass) {
      case "thread-created":
        this.threads.push(this.convertThread(notifyData));
        break;
      case "thread-exited": {
        const thread: mi.MIThreadInfo = notifyData;
        const exitId = parseInt(thread.id, 10);
        this.threads = this.threads.filter((t) => t.id !== exitId);
        break;
      }
      case "thread-selected":
      case "thread-group-added":
      case "thread-group-started":
      case "thread-group-exited":
      case "library-loaded":
      case "breakpoint-modified":
      case "breakpoint-deleted":
      case "cmd-param-changed":
        // Known unhandled notifies
        break;
      default:
        logger.warn(
          `GDB unhandled notify: ${notifyClass}: ${JSON.stringify(notifyData)}`
        );
    }
  }

  protected async handleVariableRequestFrame(
    ref: FrameVariableReference
  ): Promise<DebugProtocol.Variable[]> {
    // initialize variables array and dereference the frame handle
    const variables: DebugProtocol.Variable[] = [];
    const frame = this.frameHandles.get(ref.frameHandle);
    if (!frame) {
      return Promise.resolve(variables);
    }

    // vars used to determine if we should call sendStackListVariables()
    let callStack = false;
    let numVars = 0;

    // stack depth necessary for differentiating between similarly named variables at different stack depths
    const stackDepth = await mi.sendStackInfoDepth(this.gdb, {
      maxDepth: 100,
    });
    const depth = parseInt(stackDepth.depth, 10);

    // array of varnames to delete. Cannot delete while iterating through the vars array below.
    const toDelete = new Array<string>();

    // get the list of vars we need to update for this frameId/threadId/depth tuple
    const vars = this.gdb.varManager.getVars(
      frame.frameId,
      frame.threadId,
      depth
    );
    if (vars) {
      for (const varobj of vars) {
        // ignore expressions and child entries
        if (varobj.isVar && !varobj.isChild) {
          // request update from GDB
          const vup = await mi.sendVarUpdate(this.gdb, {
            name: varobj.varname,
          });
          // if changelist is length 0, update is undefined
          const update = vup.changelist[0];
          let pushVar = true;
          if (update) {
            if (update.in_scope === "true") {
              numVars++;
              if (update.name === varobj.varname) {
                // don't update the parent value to a child's value
                varobj.value = update.value;
              }
            } else {
              // var is out of scope, delete it and call sendStackListVariables() later
              callStack = true;
              pushVar = false;
              toDelete.push(update.name);
            }
          } else if (varobj.value) {
            // value hasn't updated but it's still in scope
            numVars++;
          }
          // only push entries to the result that aren't being deleted
          if (pushVar) {
            let value = varobj.value;
            // if we have an array parent entry, we need to display the address.
            if (arrayRegex.test(varobj.type)) {
              value = await this.getAddr(varobj);
            }
            variables.push({
              name: varobj.expression,
              evaluateName: varobj.expression,
              value,
              type: varobj.type,
              memoryReference: `&(${varobj.expression})`,
              variablesReference:
                parseInt(varobj.numchild, 10) > 0
                  ? this.variableHandles.create({
                      type: "object",
                      frameHandle: ref.frameHandle,
                      varobjName: varobj.varname,
                    })
                  : 0,
            });
          }
        }
      }
      // clean up out of scope entries
      for (const varname of toDelete) {
        await this.gdb.varManager.removeVar(
          frame.frameId,
          frame.threadId,
          depth,
          varname
        );
      }
    }
    // if we had out of scope entries or no entries in the frameId/threadId/depth tuple, query GDB for new ones
    if (callStack === true || numVars === 0) {
      const result = await mi.sendStackListVariables(this.gdb, {
        thread: frame.threadId,
        frame: frame.frameId,
        printValues: "simple-values",
      });
      for (const variable of result.variables) {
        let varobj = this.gdb.varManager.getVar(
          frame.frameId,
          frame.threadId,
          depth,
          variable.name
        );
        if (!varobj) {
          // create var in GDB and store it in the varMgr
          const varCreateResponse = await mi.sendVarCreate(this.gdb, {
            expression: variable.name,
            frameId: frame.frameId,
            threadId: frame.threadId,
          });
          varobj = this.gdb.varManager.addVar(
            frame.frameId,
            frame.threadId,
            depth,
            variable.name,
            true,
            false,
            varCreateResponse
          );
        } else {
          // var existed as an expression before. Now it's a variable too.
          varobj = await this.gdb.varManager.updateVar(
            frame.frameId,
            frame.threadId,
            depth,
            varobj
          );
          varobj.isVar = true;
        }
        let value = varobj.value;
        // if we have an array parent entry, we need to display the address.
        if (arrayRegex.test(varobj.type)) {
          value = await this.getAddr(varobj);
        }
        variables.push({
          name: varobj.expression,
          evaluateName: varobj.expression,
          value,
          type: varobj.type,
          memoryReference: `&(${varobj.expression})`,
          variablesReference:
            parseInt(varobj.numchild, 10) > 0
              ? this.variableHandles.create({
                  type: "object",
                  frameHandle: ref.frameHandle,
                  varobjName: varobj.varname,
                })
              : 0,
        });
      }
    }
    return Promise.resolve(variables);
  }

  protected async handleVariableRequestObject(
    ref: ObjectVariableReference
  ): Promise<DebugProtocol.Variable[]> {
    // initialize variables array and dereference the frame handle
    const variables: DebugProtocol.Variable[] = [];
    const frame = this.frameHandles.get(ref.frameHandle);
    if (!frame) {
      return Promise.resolve(variables);
    }

    // fetch stack depth to obtain frameId/threadId/depth tuple
    const stackDepth = await mi.sendStackInfoDepth(this.gdb, {
      maxDepth: 100,
    });
    const depth = parseInt(stackDepth.depth, 10);
    // we need to keep track of children and the parent varname in GDB
    let children;
    let parentVarname = ref.varobjName;

    // if a varobj exists, use the varname stored there
    const varobj = this.gdb.varManager.getVarByName(
      frame.frameId,
      frame.threadId,
      depth,
      ref.varobjName
    );
    if (varobj) {
      children = await mi.sendVarListChildren(this.gdb, {
        name: varobj.varname,
        printValues: mi.MIVarPrintValues.all,
      });
      parentVarname = varobj.varname;
    } else {
      // otherwise use the parent name passed in the variable reference
      children = await mi.sendVarListChildren(this.gdb, {
        name: ref.varobjName,
        printValues: mi.MIVarPrintValues.all,
      });
    }
    // Grab the full path of parent.
    const topLevelPathExpression =
      varobj?.expression ?? (await this.getFullPathExpression(parentVarname));

    // iterate through the children
    for (const child of children.children) {
      // check if we're dealing with a C++ object. If we are, we need to fetch the grandchildren instead.
      const isClass = this.isChildOfClass(child);
      if (isClass) {
        const name = `${parentVarname}.${child.exp}`;
        const objChildren = await mi.sendVarListChildren(this.gdb, {
          name,
          printValues: mi.MIVarPrintValues.all,
        });
        // Append the child path to the top level full path.
        const parentClassName = `${topLevelPathExpression}.${child.exp}`;
        for (const objChild of objChildren.children) {
          const childName = `${name}.${objChild.exp}`;
          variables.push({
            name: objChild.exp,
            evaluateName: `${parentClassName}.${objChild.exp}`,
            value: objChild.value ? objChild.value : objChild.type,
            type: objChild.type,
            variablesReference:
              parseInt(objChild.numchild, 10) > 0
                ? this.variableHandles.create({
                    type: "object",
                    frameHandle: ref.frameHandle,
                    varobjName: childName,
                  })
                : 0,
          });
        }
      } else {
        // check if we're dealing with an array
        let name = `${ref.varobjName}.${child.exp}`;
        let varobjName = name;
        let value = child.value ? child.value : child.type;
        const isArrayParent = arrayRegex.test(child.type);
        const isArrayChild =
          varobj !== undefined
            ? arrayRegex.test(varobj.type) && arrayChildRegex.test(child.exp)
            : false;
        if (isArrayChild) {
          // update the display name for array elements to have square brackets
          name = `[${child.exp}]`;
        }
        if (isArrayParent || isArrayChild) {
          // can't use a relative varname (eg. var1.a.b.c) to create/update a new var so fetch and track these
          // vars by evaluating their path expression from GDB
          const fullPath = await this.getFullPathExpression(child.name);
          // create or update the var in GDB
          let arrobj = this.gdb.varManager.getVar(
            frame.frameId,
            frame.threadId,
            depth,
            fullPath
          );
          if (!arrobj) {
            const varCreateResponse = await mi.sendVarCreate(this.gdb, {
              expression: fullPath,
              frameId: frame.frameId,
              threadId: frame.threadId,
            });
            arrobj = this.gdb.varManager.addVar(
              frame.frameId,
              frame.threadId,
              depth,
              fullPath,
              true,
              false,
              varCreateResponse
            );
          } else {
            arrobj = await this.gdb.varManager.updateVar(
              frame.frameId,
              frame.threadId,
              depth,
              arrobj
            );
          }
          // if we have an array parent entry, we need to display the address.
          if (isArrayParent) {
            value = await this.getAddr(arrobj);
          }
          arrobj.isChild = true;
          varobjName = arrobj.varname;
        }
        const variableName = isArrayChild ? name : child.exp;
        const evaluateName =
          isArrayParent || isArrayChild
            ? await this.getFullPathExpression(child.name)
            : `${topLevelPathExpression}.${child.exp}`;
        variables.push({
          name: variableName,
          evaluateName,
          value,
          type: child.type,
          variablesReference:
            parseInt(child.numchild, 10) > 0
              ? this.variableHandles.create({
                  type: "object",
                  frameHandle: ref.frameHandle,
                  varobjName,
                })
              : 0,
        });
      }
    }
    return Promise.resolve(variables);
  }

  /** Query GDB using varXX name to get complete variable name */
  protected async getFullPathExpression(inputVarName: string) {
    const exprResponse = await mi.sendVarInfoPathExpression(
      this.gdb,
      inputVarName
    );
    // result from GDB looks like (parentName).field so remove ().
    return exprResponse.path_expr.replace(/[()]/g, "");
  }

  // Register view
  // Assume that the register name are unchanging over time, and the same across all threadsf
  private registerMap = new Map<string, number>();
  private registerMapReverse = new Map<number, string>();
  protected async handleVariableRequestRegister(
    ref: RegisterVariableReference
  ): Promise<DebugProtocol.Variable[]> {
    // initialize variables array and dereference the frame handle
    const variables: DebugProtocol.Variable[] = [];
    const frame = this.frameHandles.get(ref.frameHandle);
    if (!frame) {
      return Promise.resolve(variables);
    }

    if (this.registerMap.size === 0) {
      const result_names = await mi.sendDataListRegisterNames(this.gdb, {
        frameId: frame.frameId,
        threadId: frame.threadId,
      });
      let idx = 0;
      const registerNames = result_names["register-names"];
      for (const regs of registerNames) {
        if (regs !== "") {
          this.registerMap.set(regs, idx);
          this.registerMapReverse.set(idx, regs);
        }
        idx++;
      }
    }

    const result_values = await mi.sendDataListRegisterValues(this.gdb, {
      fmt: "x",
      frameId: frame.frameId,
      threadId: frame.threadId,
    });
    const reg_values = result_values["register-values"];
    for (const n of reg_values) {
      const id = n.number;
      const reg = this.registerMapReverse.get(parseInt(id));
      if (reg) {
        const val = n.value;
        const res: DebugProtocol.Variable = {
          name: reg,
          evaluateName: "$" + reg,
          value: val,
          variablesReference: 0,
        };
        variables.push(res);
      } else {
        throw new Error("Unable to parse response for reg. values");
      }
    }

    return Promise.resolve(variables);
  }

  protected async getAddr(varobj: VarObjType) {
    const addr = await mi.sendDataEvaluateExpression(
      this.gdb,
      `&(${varobj.expression})`
    );
    return addr.value ? addr.value : varobj.value;
  }

  protected isChildOfClass(child: mi.MIVarChild): boolean {
    return (
      child.type === undefined &&
      child.value === "" &&
      (child.exp === "public" ||
        child.exp === "protected" ||
        child.exp === "private")
    );
  }
}
