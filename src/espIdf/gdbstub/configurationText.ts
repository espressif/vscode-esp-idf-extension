const componentRegisterCommand = "idf_component_register";

const componentRegisterKeywords = new Set([
  "SRCS",
  "SRC_DIRS",
  "EXCLUDE_SRCS",
  "INCLUDE_DIRS",
  "PRIV_INCLUDE_DIRS",
  "LDFRAGMENTS",
  "REQUIRES",
  "PRIV_REQUIRES",
  "REQUIRED_IDF_TARGETS",
  "EMBED_FILES",
  "EMBED_TXTFILES",
  "KCONFIG",
  "KCONFIG_PROJBUILD",
  "WHOLE_ARCHIVE",
]);

interface CommandRange {
  openParenthesis: number;
  closeParenthesis: number;
}

interface BodyToken {
  kind: "keyword" | "value";
  raw: string;
  value: string;
  start: number;
  end: number;
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

function unquote(raw: string): string {
  if (
    raw.length >= 2 &&
    ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'")))
  ) {
    return raw.slice(1, -1);
  }
  return raw;
}

function tokenizeCommandBody(body: string): BodyToken[] {
  const tokens: BodyToken[] = [];
  let index = 0;
  while (index < body.length) {
    const character = body[index];
    if (character === "#") {
      index = skipLineComment(body, index);
      continue;
    }
    if (/\s/.test(character)) {
      index++;
      continue;
    }
    if (character === '"' || character === "'") {
      const start = index;
      index = readQuoteEnd(body, index);
      const raw = body.slice(start, index);
      tokens.push({
        kind: "value",
        raw,
        value: unquote(raw),
        start,
        end: index,
      });
      continue;
    }
    const start = index;
    while (
      index < body.length &&
      !/\s/.test(body[index]) &&
      body[index] !== "#" &&
      body[index] !== '"' &&
      body[index] !== "'"
    ) {
      index++;
    }
    const raw = body.slice(start, index);
    if (!raw) {
      index++;
      continue;
    }
    tokens.push({
      kind: componentRegisterKeywords.has(raw) ? "keyword" : "value",
      raw,
      value: raw,
      start,
      end: index,
    });
  }
  return tokens;
}

function commandAlreadyRequires(
  tokens: BodyToken[],
  requirement: string
): boolean {
  let currentKeyword: string | undefined;
  for (const token of tokens) {
    if (token.kind === "keyword") {
      currentKeyword = token.raw;
      continue;
    }
    if (
      (currentKeyword === "REQUIRES" || currentKeyword === "PRIV_REQUIRES") &&
      token.value === requirement
    ) {
      return true;
    }
  }
  return false;
}

function lastPrivateRequiresToken(tokens: BodyToken[]): BodyToken | undefined {
  let currentKeyword: string | undefined;
  let keywordToken: BodyToken | undefined;
  let lastValue: BodyToken | undefined;
  for (const token of tokens) {
    if (token.kind === "keyword") {
      currentKeyword = token.raw;
      if (token.raw === "PRIV_REQUIRES") {
        keywordToken = token;
        lastValue = undefined;
      }
      continue;
    }
    if (currentKeyword === "PRIV_REQUIRES") {
      lastValue = token;
    }
  }
  return lastValue ?? keywordToken;
}

function getContinuationIndent(commandBody: string): string {
  const lines = commandBody.split(/\r?\n/);
  const continuationLine = lines
    .slice(1)
    .find((line) => line.trim().length > 0);
  return continuationLine?.match(/^\s*/)?.[0] || "  ";
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

export function addPrivateRequirement(
  cmakeText: string,
  requirement: string
): string {
  const commandRange = findComponentRegister(cmakeText);
  if (!commandRange) {
    throw new Error("idf_component_register was not found");
  }

  const commandBody = cmakeText.slice(
    commandRange.openParenthesis + 1,
    commandRange.closeParenthesis
  );
  const tokens = tokenizeCommandBody(commandBody);
  if (commandAlreadyRequires(tokens, requirement)) {
    return cmakeText;
  }

  const privateRequiresToken = lastPrivateRequiresToken(tokens);
  if (privateRequiresToken) {
    const insertionIndex =
      commandRange.openParenthesis + 1 + privateRequiresToken.end;
    return (
      cmakeText.slice(0, insertionIndex) +
      ` ${requirement}` +
      cmakeText.slice(insertionIndex)
    );
  }

  const lineEnding = cmakeText.includes("\r\n") ? "\r\n" : "\n";
  const isMultiline = commandBody.includes("\n");
  const trailingLineEnding = commandBody.match(/\r?\n[ \t]*$/);
  const insertionIndex =
    isMultiline && trailingLineEnding
      ? commandRange.closeParenthesis - trailingLineEnding[0].length
      : commandRange.closeParenthesis;
  const addition = isMultiline
    ? `${lineEnding}${getContinuationIndent(
        commandBody
      )}PRIV_REQUIRES ${requirement}`
    : ` PRIV_REQUIRES ${requirement}`;

  return (
    cmakeText.slice(0, insertionIndex) +
    addition +
    cmakeText.slice(insertionIndex)
  );
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
      ? sdkconfigText.slice(0, -lineEnding.length).split(/\r?\n/)
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
