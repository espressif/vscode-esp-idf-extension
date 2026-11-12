const componentRegisterCommand = "idf_component_register";

interface CommandRange {
  openParenthesis: number;
  closeParenthesis: number;
}

function isIdentifierChar(character: string | undefined): boolean {
  return !!character && /[A-Za-z0-9_]/.test(character);
}

function skipLineComment(text: string, hashIndex: number): number {
  const newline = text.indexOf("\n", hashIndex);
  return newline === -1 ? text.length : newline + 1;
}

function readQuoteEnd(text: string, quoteIndex: number): number {
  const quote = text[quoteIndex];
  for (let index = quoteIndex + 1; index < text.length; index++) {
    if (text[index] === "\\" && index + 1 < text.length) {
      index++;
      continue;
    }
    if (text[index] === quote) {
      return index + 1;
    }
  }
  return text.length;
}

function findMatchingParen(
  text: string,
  openIndex: number
): number | undefined {
  let depth = 1;
  let index = openIndex + 1;
  while (index < text.length) {
    const character = text[index];
    if (character === "#") {
      index = skipLineComment(text, index);
      continue;
    }
    if (character === '"' || character === "'") {
      index = readQuoteEnd(text, index);
      continue;
    }
    if (character === "(") {
      depth++;
    } else if (character === ")") {
      depth--;
      if (depth === 0) {
        return index;
      }
    }
    index++;
  }
  return undefined;
}

function findComponentRegister(text: string): CommandRange | undefined {
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === "#") {
      index = skipLineComment(text, index);
      continue;
    }
    if (character === '"' || character === "'") {
      index = readQuoteEnd(text, index);
      continue;
    }
    if (
      text.startsWith(componentRegisterCommand, index) &&
      !isIdentifierChar(text[index - 1])
    ) {
      let afterCommand = index + componentRegisterCommand.length;
      if (isIdentifierChar(text[afterCommand])) {
        index++;
        continue;
      }
      while (afterCommand < text.length && /\s/.test(text[afterCommand])) {
        afterCommand++;
      }
      if (text[afterCommand] === "(") {
        const closeParenthesis = findMatchingParen(text, afterCommand);
        if (closeParenthesis === undefined) {
          return undefined;
        }
        return {
          openParenthesis: afterCommand,
          closeParenthesis,
        };
      }
    }
    index++;
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hasIdfComponentRegister(text: string): boolean {
  try {
    return findComponentRegister(text) !== undefined;
  } catch {
    return false;
  }
}

const gdbStubManifestPath = "${IDF_PATH}/components/esp_gdbstub";

export function manifestHasGdbStubDependency(manifestText: string): boolean {
  return manifestText
    .split(/\r?\n/)
    .some(
      (line) =>
        !line.trim().startsWith("#") && /^[ \t]*esp_gdbstub[ \t]*:/.test(line)
    );
}

function manifestLineEnding(text: string): "\n" | "\r\n" {
  return text.includes("\r\n") ? "\r\n" : "\n";
}

function leadingWhitespace(line: string): string {
  return line.match(/^[ \t]*/)?.[0] ?? "";
}

function isIgnorableManifestLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || trimmed.startsWith("#");
}

function dependencyBlock(indent: string): string[] {
  return [
    `${indent}esp_gdbstub:`,
    `${indent}  path: ${gdbStubManifestPath}`,
    `${indent}  require: private`,
  ];
}

function splitManifestLines(text: string): {
  lines: string[];
  lineEnding: "\n" | "\r\n";
  hadTrailingLineEnding: boolean;
} {
  const lineEnding = manifestLineEnding(text);
  const hadTrailingLineEnding = /\r?\n$/.test(text);
  const body =
    text === "" ? "" : hadTrailingLineEnding ? text.replace(/\r?\n$/, "") : text;
  return {
    lines: body === "" ? [] : body.split(/\r?\n/),
    lineEnding,
    hadTrailingLineEnding,
  };
}

function joinManifestLines(
  lines: string[],
  lineEnding: string,
  hadTrailingLineEnding: boolean
): string {
  const joined = lines.join(lineEnding);
  return hadTrailingLineEnding ? joined + lineEnding : joined;
}

function dependenciesHeaderIndex(lines: string[]): number {
  return lines.findIndex((line) =>
    /^dependencies[ \t]*:[ \t]*(?:#.*)?$/.test(line)
  );
}

function childIndent(lines: string[], headerIndex: number): string {
  const headerIndent = leadingWhitespace(lines[headerIndex]);
  for (let index = headerIndex + 1; index < lines.length; index++) {
    const line = lines[index];
    if (isIgnorableManifestLine(line)) {
      continue;
    }
    const indent = leadingWhitespace(line);
    if (indent.length > headerIndent.length) {
      return indent;
    }
    break;
  }
  return `${headerIndent}  `;
}

function dependenciesSectionEnd(lines: string[], headerIndex: number): number {
  const headerIndent = leadingWhitespace(lines[headerIndex]);
  for (let index = headerIndex + 1; index < lines.length; index++) {
    const line = lines[index];
    if (isIgnorableManifestLine(line)) {
      continue;
    }
    if (leadingWhitespace(line).length <= headerIndent.length) {
      return index;
    }
  }
  return lines.length;
}

/** Adds a private Component Manager dependency on the ESP-IDF copy of esp_gdbstub. */
export function addGdbStubManifestDependency(manifestText: string): string {
  if (manifestHasGdbStubDependency(manifestText)) {
    return manifestText;
  }

  const { lines, lineEnding, hadTrailingLineEnding } =
    splitManifestLines(manifestText);
  const headerIndex = dependenciesHeaderIndex(lines);
  if (headerIndex === -1) {
    const block = ["dependencies:", ...dependencyBlock("  ")];
    if (lines.length === 0) {
      return block.join(lineEnding) + lineEnding;
    }
    if (!hadTrailingLineEnding) {
      lines.push("");
    }
    lines.push(...block);
    return joinManifestLines(lines, lineEnding, true);
  }

  lines.splice(
    dependenciesSectionEnd(lines, headerIndex),
    0,
    ...dependencyBlock(childIndent(lines, headerIndex))
  );
  return joinManifestLines(lines, lineEnding, hadTrailingLineEnding);
}

export function enableSdkconfigOption(
  sdkconfigText: string,
  option: string
): string {
  const lineEnding = sdkconfigText.includes("\r\n") ? "\r\n" : "\n";
  const enabledLine = `${option}=y`;
  const optionPattern = new RegExp(
    `^(?:${escapeRegExp(option)}=.*|#\\s*${escapeRegExp(
      option
    )}\\s+is not set.*)$`
  );
  const hadTrailingLineEnding = /\r?\n$/.test(sdkconfigText);
  const lines =
    sdkconfigText === ""
      ? []
      : hadTrailingLineEnding
      ? sdkconfigText.replace(/\r?\n$/, "").split(/\r?\n/)
      : sdkconfigText.split(/\r?\n/);

  let replaced = false;
  const updatedLines: string[] = [];
  for (const line of lines) {
    if (!optionPattern.test(line)) {
      updatedLines.push(line);
      continue;
    }
    if (!replaced) {
      updatedLines.push(enabledLine);
      replaced = true;
    }
  }
  if (!replaced) {
    updatedLines.push(enabledLine);
  }

  return (
    updatedLines.join(lineEnding) +
    (hadTrailingLineEnding || sdkconfigText === "" ? lineEnding : "")
  );
}
