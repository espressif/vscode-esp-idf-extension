// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  CompletionItem,
  CompletionItemKind,
  createConnection,
  Diagnostic,
  DiagnosticSeverity,
  DidChangeConfigurationNotification,
  InitializeParams,
  ProposedFeatures,
  TextDocument,
  TextDocumentPositionParams,
  TextDocuments,
} from "vscode-languageserver";
import { Stack } from "../stack";

const connection = createConnection(ProposedFeatures.all);

const documents: TextDocuments = new TextDocuments();

let hasConfigCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInfoCapability: boolean = false;
const problemSourceName = "esp-idf";

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  hasConfigCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );

  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  hasDiagnosticRelatedInfoCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  return {
    capabilities: {
      completionProvider: {
        resolveProvider: true,
      },
      textDocumentSync: documents.syncKind,
    },
  };
});

connection.onInitialized(() => {
  if (hasConfigCapability) {
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((event) => {
      connection.console.log("Workspace folder change received.");
    });
  }
});

// Kconfig Settings interface
interface IKconfigSettings {
  maxNumberOfProblems: number;
  useIDFKconfigStyle: boolean;
}

const defaultSettings: IKconfigSettings = {
  maxNumberOfProblems: 1000,
  useIDFKconfigStyle: false,
};
let globalSettings: IKconfigSettings = defaultSettings;

// Cache of open documents settings
const docsSettings: Map<string, Thenable<IKconfigSettings>> = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigCapability) {
    docsSettings.clear();
  } else {
    globalSettings = (change.settings.kconfigServer ||
      defaultSettings) as IKconfigSettings;
  }
  documents.all().forEach(validateKConfigDocument);
});

function getDocumentsSettings(resource: string): Thenable<IKconfigSettings> {
  if (!hasConfigCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = docsSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: "idf",
    });
    docsSettings.set(resource, result);
  }
  return result;
}

documents.onDidClose((e) => {
  docsSettings.delete(e.document.uri);
});

// The document content has changed, which triggers the next method
documents.onDidChangeContent((change) => {
  validateKConfigDocument(change.document);
});

async function validateKConfigDocument(
  kconfigDocument: TextDocument
): Promise<void> {
  // This method would perform a lot of syntax validation ensuring file is ok.
  // const settings = await getDocumentsSettings(kconfigDocument.uri);

  const menuPattern = /^(\s*)\bmenu\b/g;
  const endmenuPattern = /^(\s*)\bendmenu\b/gm;

  const choicePattern = /^(\s*)\bchoice\b/g;
  const endChoicePattern = /^(\s*)\bendchoice\b/gm;

  const settings = await getDocumentsSettings(kconfigDocument.uri);

  const diagnostics: Diagnostic[] = [];

  diagnostics.push(
    ...getBlockDiagnosticsFor(menuPattern, endmenuPattern, kconfigDocument, [
      "menu",
      "endmenu",
    ])
  );
  diagnostics.push(
    ...getBlockDiagnosticsFor(
      choicePattern,
      endChoicePattern,
      kconfigDocument,
      ["choice", "enchoice"]
    )
  );

  // Use ESP-IDF Kconfig Style validation
  if (settings.useIDFKconfigStyle) {
    diagnostics.push(...getStringDiagnostics(kconfigDocument));
    diagnostics.push(...getLineDiagnostics(kconfigDocument));
    diagnostics.push(...getTreeIndentDiagnostics(kconfigDocument));
    diagnostics.push(...getEmptyBlocksDiagnostics(kconfigDocument));
  }

  connection.sendDiagnostics({ uri: kconfigDocument.uri, diagnostics });
}

function getLineDiagnostics(kconfigDocument: TextDocument) {
  const MAX_LINE_SIZE = 120;
  const text = kconfigDocument.getText();
  const diagnostics: Diagnostic[] = [];

  const lines = text.split("\n");
  let textPosition = 0;
  let lineNum = 0;

  for (const line of lines) {
    lineNum += 1;
    // Check line size is bigger than MAX_LINE_SIZE
    if (line.length > MAX_LINE_SIZE) {
      const diagnostic: Diagnostic = {
        message: `Line ${lineNum} text should be 120 chars max. (${line.length})`,
        range: {
          end: kconfigDocument.positionAt(textPosition + line.length),
          start: kconfigDocument.positionAt(textPosition),
        },
        severity: DiagnosticSeverity.Warning,
        source: `${problemSourceName}`,
      };
      diagnostics.push(diagnostic);
    }

    // Check text is not wrapped with backslash (\)
    const backslashWrappedPattern = /\\(.*)\\/g;
    let backslashMatch = backslashWrappedPattern.exec(line);
    while (backslashMatch !== null) {
      const diagnostic: Diagnostic = {
        message: `Line ${lineNum} wrapped by \\ is not valid.`,
        range: {
          end: kconfigDocument.positionAt(
            textPosition + backslashMatch.index + backslashMatch.input.length
          ),
          start: kconfigDocument.positionAt(
            textPosition + backslashMatch.index
          ),
        },
        severity: DiagnosticSeverity.Error,
        source: `${problemSourceName}`,
      };
      diagnostics.push(diagnostic);
      backslashMatch = backslashWrappedPattern.exec(line);
    }

    // Check text doesn't start with \
    const badStartPattern = /^(\\)(.*)/g;
    let badStartMatch = badStartPattern.exec(line);
    while (badStartMatch !== null) {
      const diagnostic: Diagnostic = {
        message: `Line ${lineNum} should not start with \\`,
        range: {
          end: kconfigDocument.positionAt(
            textPosition + badStartMatch.index + badStartMatch.input.length
          ),
          start: kconfigDocument.positionAt(textPosition + badStartMatch.index),
        },
        severity: DiagnosticSeverity.Warning,
        source: `${problemSourceName}`,
      };
      diagnostics.push(diagnostic);
      badStartMatch = badStartPattern.exec(line);
    }

    // Check there is no trailing space in each line.
    const hasTrailingSpace = line[line.length - 1] === " ";
    if (hasTrailingSpace) {
      const diagnostic: Diagnostic = {
        message: `Line ${lineNum} should not have trailing whitespace`,
        range: {
          end: kconfigDocument.positionAt(textPosition + line.length),
          start: kconfigDocument.positionAt(textPosition + line.length - 1),
        },
        severity: DiagnosticSeverity.Error,
        source: `${problemSourceName}`,
      };
      diagnostics.push(diagnostic);
    }

    textPosition += line.length + "\n".length;
  }

  return diagnostics;
}

function getTreeIndentDiagnostics(kconfigDocument: TextDocument) {
  const indentSize = 4; // connection.workspace.getConfiguration("editor.tabSize");
  const text = kconfigDocument.getText();
  const diagnostics: Diagnostic[] = [];

  const lines = text.split("\n");
  let textPosition = 0;
  const parentStack = new Stack();
  let lineNum = 0;

  for (const line of lines) {
    lineNum++;
    const indentRegex = /^(?!=\n)([ ]+)/g;
    const lineMatch = indentRegex.exec(line);
    const openingMatches = /^(\s*)\b(menu|choice|config|menuconfig|endmenu|endchoice|help|mainmenu)\b/g.exec(
      line
    );

    if (
      parentStack.size() > 0 &&
      openingMatches &&
      (openingMatches[0].trim() === "menu" ||
        openingMatches[0].trim() === "menuconfig" ||
        openingMatches[0].trim() === "choice" ||
        openingMatches[0].trim() === "config")
    ) {
      if (parentStack.peek() === "help") {
        parentStack.pop();
        if (parentStack.peek() !== "choice") {
          parentStack.pop();
        }
      } else if (
        parentStack.peek() === "config" ||
        parentStack.peek() === "menuconfig"
      ) {
        parentStack.pop();
      }
    } else if (
      parentStack.size() > 0 &&
      openingMatches &&
      (openingMatches[0].trim() === "endmenu" ||
        openingMatches[0].trim() === "endchoice")
    ) {
      while (parentStack.size() > 0) {
        const startingWord = parentStack.pop();
        if (
          (startingWord === "menu" && openingMatches[0].trim() === "endmenu") ||
          (startingWord === "choice" &&
            openingMatches[0].trim() === "endchoice")
        ) {
          break;
        }
      }
    }

    if (
      lineMatch &&
      ((parentStack.peek() !== "help" &&
        lineMatch[1].length !== indentSize * parentStack.size()) ||
        (parentStack.peek() === "help" &&
          lineMatch[1].length < indentSize * parentStack.size()))
    ) {
      const diagnostic: Diagnostic = {
        message: `Line ${lineNum} has ${lineMatch[1].length}.
                    Expect indent ${indentSize * parentStack.size()}`,
        range: {
          end: kconfigDocument.positionAt(
            textPosition + lineMatch.index + lineMatch[1].length
          ),
          start: kconfigDocument.positionAt(textPosition),
        },
        severity: DiagnosticSeverity.Warning,
        source: `${problemSourceName}`,
      };
      diagnostics.push(diagnostic);
    }

    if (openingMatches) {
      if (
        openingMatches[0].trim() !== "endmenu" &&
        openingMatches[0].trim() !== "endchoice"
      ) {
        parentStack.push(openingMatches[0].trim());
      }
    }

    textPosition += line.length + "\n".length;
  }
  return diagnostics;
}

function getStringDiagnostics(kconfigDocument: TextDocument): Diagnostic[] {
  // Resolve diagnostics for keywords that take double quoted strings
  // Example: menu "mymenu"
  const textPattern = /^(\s*)\b(prompt|menu|mainmenu|source|comment)\b\s(?:\")(.*)(?:\")/g;
  const keyPattern = /^(\s*)\b(prompt|menu|mainmenu|source|comment)\b/g;
  const text = kconfigDocument.getText();
  const lines = text.split("\n");
  const diagnostics: Diagnostic[] = [];
  let textPosition = 0;

  for (const line of lines) {
    const keyMatch = keyPattern.exec(line);
    const stringMatch = textPattern.exec(line);
    if (keyMatch !== null && stringMatch === null) {
      const diagnostic: Diagnostic = {
        message: `${keyMatch[0].trim()} text should be enclosed like \"some text\"`,
        range: {
          end: kconfigDocument.positionAt(textPosition + line.length),
          start: kconfigDocument.positionAt(
            textPosition + keyMatch.index + keyMatch[1].length
          ),
        },
        severity: DiagnosticSeverity.Warning,
        source: `${problemSourceName}`,
      };
      diagnostics.push(diagnostic);
    }
    textPosition += line.length + "\n".length;
  }

  return diagnostics;
}

function getBlockDiagnosticsFor(
  openingPattern: RegExp,
  closingPattern: RegExp,
  kconfigDocument: TextDocument,
  blockName: string[]
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const openIndices = [];
  const closeIndices = [];
  const text = kconfigDocument.getText();
  let openMatch = openingPattern.exec(text);
  const openWordLength = blockName[0].length;
  let closeMatch = closingPattern.exec(text);

  while (openMatch !== null) {
    openIndices.push(openMatch.index);
    openMatch = openingPattern.exec(text);
  }

  while (closeMatch !== null) {
    closeIndices.push(closeMatch.index);
    closeMatch = closingPattern.exec(text);
  }

  for (let i = 0; i < openIndices.length; i++) {
    if (closeIndices.length === 0) {
      const diagnostic: Diagnostic = {
        message: `${blockName[0]} statement doesn't have corresponding ${blockName[1]}`,
        range: {
          end: kconfigDocument.positionAt(openIndices[i] + openWordLength),
          start: kconfigDocument.positionAt(openIndices[i]),
        },
        severity: DiagnosticSeverity.Error,
        source: `${problemSourceName}`,
      };
      diagnostics.push(diagnostic);
      continue;
    }

    let isCloseFound = false;
    for (const closingIndex of closeIndices) {
      if (closingIndex > openIndices[i] && closingIndex < openIndices[i + 1]) {
        isCloseFound = true;
        break;
      } else if (
        i === openIndices.length - 1 &&
        closingIndex > openIndices[i]
      ) {
        isCloseFound = true;
        break;
      }
    }
    if (!isCloseFound) {
      const diagnostic: Diagnostic = {
        message: `${blockName[0]} statement doesn't have corresponding ${blockName[1]}`,
        range: {
          end: kconfigDocument.positionAt(openIndices[i] + openWordLength),
          start: kconfigDocument.positionAt(openIndices[i]),
        },
        severity: DiagnosticSeverity.Error,
        source: `${problemSourceName}`,
      };
      diagnostics.push(diagnostic);
    }
  }
  return diagnostics;
}

function getEmptyBlocksDiagnostics(
  kconfigDocument: TextDocument
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  const menuPattern = /^menu \"(.*)\"([\s\S]+?)endmenu$/gm;
  const choicePattern = /^choice (.*)([\s\S]+?)endchoice$/gm;
  const ifBlockPattern = /^if (.*)([\s\S]+?)endif$/gm;
  const text = kconfigDocument.getText();
  let menuMatch = menuPattern.exec(text);
  let choiceMatch = choicePattern.exec(text);
  let ifBlockMatch = ifBlockPattern.exec(text);

  while (menuMatch !== null) {
    if (menuMatch[2] && menuMatch[2].length > 0 && menuMatch[2] === "\n") {
      const diagnostic: Diagnostic = {
        message: `menu statement doesn't have corresponding any sub-settings.`,
        range: {
          end: kconfigDocument.positionAt(
            menuMatch.index +
              `menu ""`.length +
              menuMatch[1].length +
              menuMatch[2].length
          ),
          start: kconfigDocument.positionAt(
            menuMatch.index + menuMatch[1].length
          ),
        },
        severity: DiagnosticSeverity.Error,
        source: `${problemSourceName}`,
      };
      diagnostics.push(diagnostic);
    }
    menuMatch = menuPattern.exec(text);
  }

  while (choiceMatch !== null) {
    if (
      choiceMatch[2] &&
      choiceMatch[2].length > 0 &&
      choiceMatch[2] === "\n"
    ) {
      const diagnostic: Diagnostic = {
        message: `choice statement doesn't have any config options.`,
        range: {
          end: kconfigDocument.positionAt(
            choiceMatch.index +
              `choice `.length +
              choiceMatch[1].length +
              choiceMatch[2].length
          ),
          start: kconfigDocument.positionAt(
            choiceMatch.index + choiceMatch[1].length
          ),
        },
        severity: DiagnosticSeverity.Error,
        source: `${problemSourceName}`,
      };
      diagnostics.push(diagnostic);
    }
    choiceMatch = choicePattern.exec(text);
  }

  while (ifBlockMatch !== null) {
    if (
      ifBlockMatch[2] &&
      ifBlockMatch[2].length > 0 &&
      ifBlockMatch[2] === "\n"
    ) {
      const diagnostic: Diagnostic = {
        message: `if statement doesn't have any config options.`,
        range: {
          end: kconfigDocument.positionAt(
            ifBlockMatch.index +
              `if `.length +
              ifBlockMatch[1].length +
              ifBlockMatch[2].length
          ),
          start: kconfigDocument.positionAt(
            ifBlockMatch.index + ifBlockMatch[1].length
          ),
        },
        severity: DiagnosticSeverity.Error,
        source: `${problemSourceName}`,
      };
      diagnostics.push(diagnostic);
    }
    ifBlockMatch = ifBlockPattern.exec(text);
  }

  return diagnostics;
}

// This handler provides a list of completion items
connection.onCompletion(
  (kconfigDocumentPosition: TextDocumentPositionParams) => {
    return [
      {
        data: 1,
        kind: CompletionItemKind.Text,
        label: "config ",
      },
      {
        data: 2,
        kind: CompletionItemKind.Text,
        label: "menu ",
      },
      {
        data: 3,
        kind: CompletionItemKind.Text,
        label: "endmenu",
      },
      {
        data: 4,
        kind: CompletionItemKind.Text,
        label: "bool ",
      },
      {
        data: 5,
        kind: CompletionItemKind.Text,
        label: "depends on ",
      },
      {
        data: 6,
        kind: CompletionItemKind.Text,
        label: "help ",
      },
      {
        data: 7,
        kind: CompletionItemKind.Text,
        label: "hex ",
      },
      {
        data: 8,
        kind: CompletionItemKind.Text,
        label: "tristate ",
      },
      {
        data: 9,
        kind: CompletionItemKind.Text,
        label: "int ",
      },
      {
        data: 10,
        kind: CompletionItemKind.Text,
        label: "string ",
      },
      {
        data: 11,
        kind: CompletionItemKind.Text,
        label: "prompt ",
      },
      {
        data: 12,
        kind: CompletionItemKind.Text,
        label: "default ",
      },
      {
        data: 13,
        kind: CompletionItemKind.Text,
        label: "if ",
      },
      {
        data: 14,
        kind: CompletionItemKind.Text,
        label: "endif",
      },
      {
        data: 15,
        kind: CompletionItemKind.Text,
        label: "visible if ",
      },
      {
        data: 16,
        kind: CompletionItemKind.Text,
        label: "range ",
      },
      {
        data: 17,
        kind: CompletionItemKind.Text,
        label: "option ",
      },
      {
        data: 18,
        kind: CompletionItemKind.Text,
        label: "defconfig_list",
      },
      {
        data: 19,
        kind: CompletionItemKind.Text,
        label: "modules ",
      },
      {
        data: 20,
        kind: CompletionItemKind.Text,
        label: "allnoconfig_y",
      },
      {
        data: 21,
        kind: CompletionItemKind.Text,
        label: "menuconfig ",
      },
      {
        data: 22,
        kind: CompletionItemKind.Text,
        label: "comment ",
      },
      {
        data: 23,
        kind: CompletionItemKind.Text,
        label: "source ",
      },
      {
        data: 24,
        kind: CompletionItemKind.Text,
        label: "choice ",
      },
      {
        data: 25,
        kind: CompletionItemKind.Text,
        label: "endchoice",
      },
      {
        data: 26,
        kind: CompletionItemKind.Text,
        label: "mainmenu ",
      },
    ];
  }
);

connection.onCompletionResolve(
  (item: CompletionItem): CompletionItem => {
    switch (item.data) {
      case 1:
        item.detail = "config <symbol>";
        item.documentation = "This defines a config symbol <symbol>.";
        break;
      case 2:
        item.detail = "menu <symbol>";
        item.documentation =
          "This defines a menu block <symbol>. Should end with 'endmenu'";
        break;
      case 21:
        item.detail = "menuconfig <symbol>";
        item.documentation =
          "Define a config entry <symbol> with frontend hint to separate suboptions.";
        break;
      case 24:
        item.detail = "choice <symbol>";
        item.documentation = `This defines a choice group <symbol> accepting config or menuconfig as options.
                    Should end with 'endchoice'`;
        break;
      case 22:
        item.detail = "comment <prompt>";
        item.documentation =
          "This defines a comment displayed to the user during configuration process.";
        break;
      case 13:
        item.detail = "if <expression>";
        item.documentation =
          "This defines an if block. Should end with 'endif'";
        break;
      case 23:
        item.detail = "source <prompt>";
        item.documentation =
          "This reads the specified configuration file. This file is always parsed.";
        break;
      case 26:
        item.detail = "mainmenu <prompt>";
        item.documentation =
          "This sets the config program's title bar if the config program chooses to use it.";
        break;
      default:
        break;
    }
    return item;
  }
);

// Text document manager listens to connection for open change and close events
// of Kconfig document events
documents.listen(connection);

connection.listen();
