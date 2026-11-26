// ESP-IDF writes gdbinit paths without quotes. GDB splits those arguments on
// spaces, so `add-symbol-file D:/esp-idf projects/...elf` looks up a symbol
// named "projects". `source` is intentionally left alone: this GDB keeps quote
// characters as part of that filename, and the rest of the line is the path.

const pathCommand =
  /^(\s*)(add-symbol-file|file|exec-file|symbol-file)(\s+)(\S.*)$/;

const substitutePathCommand =
  /^(\s*)(set\s+substitute-path)(\s+)(\S+)(\s+)(\S.*)$/;

// Trailing add-symbol-file options. The path itself may contain spaces, so
// these are peeled from the end instead of splitting the line on whitespace.
const symbolFileSuffix =
  /(?:\s+(?:-readnow|-readnever|-o\s+\S+|-s\s+\S+\s+0x[0-9a-fA-F]+|0x[0-9a-fA-F]+))+$/;

// gen_gdbinit.py appends `<chip>_rev<n>_rom.elf` to ESP_ROM_ELF_DIR and relies
// on that directory ending with a slash. Without the slash the version and
// filename are glued together: `20260528esp32s3_rev0_rom.elf`.
const gluedRomElfPath = /^(.*[\\/])(\d{8})([A-Za-z0-9]+_rev\d+_rom\.elf)$/;

export interface GdbinitQuoteOptions {
  /** Confirms a repaired ROM ELF path before the script is changed. */
  romElfExists?: (filePath: string) => boolean;
}

function startsWithGdbQuote(value: string): boolean {
  const trimmed = value.trimStart();
  return trimmed.startsWith('"') || trimmed.startsWith("'");
}

function quoteGdbArgument(argument: string): string {
  // Escape backslashes first so a following escaped quote is not doubled.
  const escaped = argument.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function quoteIfPathHasSpace(path: string): string | undefined {
  if (!path || startsWithGdbQuote(path) || !/\s/.test(path)) {
    return undefined;
  }
  return quoteGdbArgument(path);
}

function splitSymbolFileArgs(args: string): { path: string; suffix: string } {
  const suffixMatch = args.match(symbolFileSuffix);
  if (!suffixMatch || suffixMatch.index === undefined) {
    return { path: args.trim(), suffix: "" };
  }
  return {
    path: args.slice(0, suffixMatch.index).trim(),
    suffix: suffixMatch[0].trim(),
  };
}

function separatedRomElfPath(elfPath: string): string | undefined {
  const match = elfPath.match(gluedRomElfPath);
  if (!match) {
    return undefined;
  }
  const directory = match[1];
  const separator =
    directory.includes("\\") && !directory.includes("/") ? "\\" : "/";
  return `${directory}${match[2]}${separator}${match[3]}`;
}

function resolveRomElfPath(
  elfPath: string,
  options?: GdbinitQuoteOptions
): string {
  const separated = separatedRomElfPath(elfPath);
  const exists = options?.romElfExists;
  if (!separated || !exists || exists(elfPath) || !exists(separated)) {
    return elfPath;
  }
  return separated;
}

function quotePathCommand(line: string, options?: GdbinitQuoteOptions): string {
  const match = line.match(pathCommand);
  if (!match) {
    return line;
  }
  const indent = match[1];
  const command = match[2];
  const spacing = match[3];
  const args = match[4];
  if (startsWithGdbQuote(args)) {
    return line;
  }

  const { path, suffix } =
    command === "add-symbol-file"
      ? splitSymbolFileArgs(args)
      : { path: args.trim(), suffix: "" };
  const resolved = resolveRomElfPath(path, options);
  const quoted = quoteIfPathHasSpace(resolved);
  if (!quoted && resolved === path) {
    return line;
  }
  const rendered = quoted ?? resolved;
  return suffix
    ? `${indent}${command}${spacing}${rendered} ${suffix}`
    : `${indent}${command}${spacing}${rendered}`;
}

function quoteSubstitutePath(line: string): string {
  const match = line.match(substitutePathCommand);
  if (!match) {
    return line;
  }
  const indent = match[1];
  const command = match[2];
  const fromSpacing = match[3];
  const fromPath = match[4];
  const toSpacing = match[5];
  const toPath = match[6];
  // The substituted prefix is one token (`/COMPONENT_..._DIR`). The filesystem
  // path is the remainder and is the side that can contain spaces.
  if (startsWithGdbQuote(fromPath)) {
    return line;
  }
  const quoted = quoteIfPathHasSpace(toPath.trim());
  if (!quoted) {
    return line;
  }
  return `${indent}${command}${fromSpacing}${fromPath}${toSpacing}${quoted}`;
}

function quoteGdbinitLine(
  line: string,
  options?: GdbinitQuoteOptions
): string {
  if (line.includes("substitute-path")) {
    const quoted = quoteSubstitutePath(line);
    if (quoted !== line) {
      return quoted;
    }
  }
  return quotePathCommand(line, options);
}

export function quoteGdbinitScript(
  script: string,
  options?: GdbinitQuoteOptions
): string {
  const parts = script.split(/(\r?\n)/);
  let inPython = false;
  return parts
    .map((part) => {
      if (part === "\n" || part === "\r\n") {
        return part;
      }
      const trimmed = part.trim();
      if (!inPython && trimmed === "python") {
        inPython = true;
        return part;
      }
      if (inPython) {
        if (trimmed === "end") {
          inPython = false;
        }
        return part;
      }
      return quoteGdbinitLine(part, options);
    })
    .join("");
}

/** Keep the slash style of the gdbinit path GDB is already sourcing. */
export function withPathSeparators(filePath: string, styleFrom: string): string {
  if (!styleFrom.includes("\\")) {
    return filePath.replace(/\\/g, "/");
  }
  if (!styleFrom.includes("/")) {
    return filePath.replace(/\//g, "\\");
  }
  return filePath;
}
