// A runtime GDB Stub halt lands in the idle task (`esp_cpu_wait_for_intr`
// in cpu.c) once app_main has called vTaskDelay. That frame is not the
// program the user is debugging.

export interface StubStopFrame {
  func?: string;
  file?: string;
  fullname?: string;
  line?: string;
  level?: string;
}

export interface StubThreadFrames {
  id: number;
  frames: StubStopFrame[];
}

export type StubStopAction =
  | { kind: "stay"; threadId: number }
  | { kind: "continue" }
  | { kind: "break-at-line"; file: string; line: number }
  | { kind: "break-at-function"; name: string };

export function projectDirectoryFromProgram(
  program: string,
  cwd?: string
): string {
  const normalized = program.replace(/\\/g, "/");
  const marker = "/build/";
  const index = normalized.toLowerCase().lastIndexOf(marker);
  if (index > 0) {
    return program.slice(0, index);
  }
  return cwd || "";
}

export function isProjectSource(
  fullname: string | undefined,
  projectDirectory: string
): boolean {
  if (!fullname || !projectDirectory) {
    return false;
  }
  const file = fullname.replace(/\\/g, "/");
  const root = projectDirectory.replace(/\\/g, "/").replace(/\/$/, "");
  if (!file.toLowerCase().startsWith(root.toLowerCase() + "/")) {
    return false;
  }
  const lower = file.toLowerCase();
  return (
    !lower.includes("/esp-idf/components/") && !lower.includes("/build/")
  );
}

function frameLevel(frame: StubStopFrame): number {
  const level = Number(frame.level);
  return Number.isFinite(level) ? level : 999;
}

function innermostProjectFrame(
  threads: StubThreadFrames[],
  projectDirectory: string
): { threadId: number; frame: StubStopFrame } | undefined {
  let best: { threadId: number; frame: StubStopFrame; level: number } | undefined;
  for (const thread of threads) {
    for (const frame of thread.frames) {
      if (!isProjectSource(frame.fullname, projectDirectory)) {
        continue;
      }
      const level = frameLevel(frame);
      if (!best || level < best.level) {
        best = { threadId: thread.id, frame, level };
      }
    }
  }
  return best;
}

function stackContainsFunction(
  threads: StubThreadFrames[],
  name: string
): boolean {
  return threads.some((thread) =>
    thread.frames.some((frame) => frame.func === name)
  );
}

function topIsIdle(frame: StubStopFrame | undefined): boolean {
  if (!frame) {
    return false;
  }
  if (frame.func === "esp_cpu_wait_for_intr") {
    return true;
  }
  const base = (frame.fullname || "").replace(/\\/g, "/").split("/").pop();
  return base?.toLowerCase() === "cpu.c";
}

export function chooseStubStopAction(input: {
  currentThreadId: number;
  threads: StubThreadFrames[];
  projectDirectory: string;
  hasUserBreakpoint: boolean;
  entrySymbol?: string;
}): StubStopAction {
  const current =
    input.threads.find((thread) => thread.id === input.currentThreadId) ??
    input.threads[0];
  const top = current?.frames[0];
  if (top && isProjectSource(top.fullname, input.projectDirectory)) {
    return { kind: "stay", threadId: current.id };
  }
  if (input.hasUserBreakpoint) {
    return { kind: "continue" };
  }
  const projectFrame = innermostProjectFrame(
    input.threads,
    input.projectDirectory
  );
  const line = Number(projectFrame?.frame.line);
  if (projectFrame?.frame.fullname && Number.isFinite(line) && line > 0) {
    return {
      kind: "break-at-line",
      file: projectFrame.frame.fullname,
      line,
    };
  }
  if (
    input.entrySymbol &&
    !topIsIdle(top) &&
    !stackContainsFunction(input.threads, input.entrySymbol)
  ) {
    return { kind: "break-at-function", name: input.entrySymbol };
  }
  if (projectFrame) {
    return { kind: "stay", threadId: projectFrame.threadId };
  }
  return { kind: "stay", threadId: input.currentThreadId || 1 };
}
