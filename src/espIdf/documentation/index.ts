/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 15th June 2026 5:14:45 pm
 * Copyright 2026 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ExtensionContext, window } from "vscode";
import { withProgressWrapper } from "../../common/withProgressWrapper";
import { registerIDFCommand } from "../../common/registerCommand";
import { searchInEspDocs } from "./getSearchResults";
import { Logger } from "../../common/logger";
import {
  DocSearchResult,
  DocSearchResultTreeDataProvider,
} from "./docResultsTreeView";
import { ESP } from "../../config";

export function registerSearchDocsCommand(context: ExtensionContext) {
  const espIdfDocsResultTreeDataProvider = new DocSearchResultTreeDataProvider();

  registerIDFCommand(context, "espIdf.clearDocsSearchResult", () => {
    espIdfDocsResultTreeDataProvider.clearResults();
  });

  const idfSearchResults = window.createTreeView<DocSearchResult>(
    "idfSearchResults",
    {
      treeDataProvider: espIdfDocsResultTreeDataProvider,
    }
  );

  context.subscriptions.push(idfSearchResults);

  registerIDFCommand(context, "espIdf.searchInEspIdfDocs", async () => {
    await withProgressWrapper(
      [],
      "ESP-IDF: Documentation search results",
      async (_progress, cancelToken) => {
        try {
          const currentEditor = window.activeTextEditor;
          if (!currentEditor) {
            return;
          }
          const wsFolder = ESP.GlobalConfiguration.store.getSelectedWorkspaceFolder();
          let selection = currentEditor.document.getText(
            currentEditor.selection
          );
          if (!selection) {
            const range = currentEditor.document.getWordRangeAtPosition(
              currentEditor.selection.active
            );
            selection = currentEditor.document.getText(range);
          }
          const searchResults = await searchInEspDocs(selection, wsFolder.uri);
          espIdfDocsResultTreeDataProvider.getResults(
            searchResults,
            idfSearchResults
          );
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          Logger.errorNotify(
            errMsg,
            error instanceof Error ? error : new Error(errMsg),
            "searchInEspIdfDocs"
          );
          return;
        }
      }
    );
  });
}
