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
