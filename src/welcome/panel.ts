/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 29th November 2021 3:08:04 pm
 * Copyright 2021 Espressif Systems (Shanghai) CO LTD
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

import { join } from "path";
import {
  commands,
  ConfigurationTarget,
  Disposable,
  l10n,
  Uri,
  ViewColumn,
  WebviewPanel,
  window,
} from "vscode";
import { writeParameter } from "../idfConfiguration";
import { IWelcomeArgs } from "./welcomeInit";
import { parseString } from "xml2js";

export class WelcomePanel {
  public static currentPanel: WelcomePanel | undefined;

  public static createOrShow(
    extensionPath: string,
    welcomeArgs?: IWelcomeArgs
  ) {
    const column = window.activeTextEditor
      ? window.activeTextEditor.viewColumn
      : ViewColumn.One;
    if (WelcomePanel.currentPanel) {
      WelcomePanel.currentPanel.panel.reveal(column);
    } else {
      WelcomePanel.currentPanel = new WelcomePanel(
        extensionPath,
        column,
        welcomeArgs
      );
    }
  }

  public static isCreatedAndHidden() {
    return (
      WelcomePanel.currentPanel &&
      WelcomePanel.currentPanel.panel.visible === false
    );
  }

  private static readonly viewType = "welcomePanel";
  private readonly panel: WebviewPanel;
  private disposables: Disposable[] = [];

  constructor(
    private extensionPath: string,
    column: ViewColumn,
    welcomeArgs: IWelcomeArgs
  ) {
    const welcomePanelTitle = l10n.t("ESP-IDF Welcome");

    this.panel = window.createWebviewPanel(
      WelcomePanel.viewType,
      welcomePanelTitle,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          Uri.file(join(this.extensionPath, "dist", "views")),
        ],
      }
    );

    this.panel.iconPath = Uri.file(
      join(this.extensionPath, "media", "espressif_icon.png")
    );

    const scriptPath = this.panel.webview.asWebviewUri(
      Uri.file(
        join(this.extensionPath, "dist", "views", "welcomePage-bundle.js")
      )
    );

    this.panel.webview.html = this.createWelcomePageHtml(scriptPath);

    this.panel.webview.onDidReceiveMessage(async (msg) => {
      switch (msg.command) {
        case "requestInitialValues":
          this.panel.webview.postMessage({
            command: "initialLoad",
            ...welcomeArgs,
          });
          break;
        case "configureExtension":
          await commands.executeCommand("espIdf.setup.start");
          break;
        case "newProject":
          await commands.executeCommand("espIdf.newProject.start");
          break;
        case "importProject":
          await commands.executeCommand("espIdf.importProject");
          break;
        case "exploreComponents":
          await commands.executeCommand("esp.component-manager.ui.show");
          break;
        case "fetchBlogArticles":
          try {
            // Fetch RSS feed from extension backend
            const response = await fetch('https://developer.espressif.com/blog/index.xml');
            const xmlText = await response.text();
            
            // Parse XML using xml2js
            parseString(xmlText, (err, result) => {
              if (err) {
                console.error('Failed to parse XML:', err);
                this.panel.webview.postMessage({
                  command: "blogArticlesLoaded",
                  articles: []
                });
                return;
              }
              
              const articles = [];
              const items = result.rss?.channel?.[0]?.item || [];
              
              for (let i = 0; i < Math.min(6, items.length); i++) {
                const item = items[i];
                const title = item.title?.[0] || '';
                const description = item.description?.[0] || '';
                const url = item.link?.[0] || '';
                const pubDate = item.pubDate?.[0] || '';
                
                // Try to extract image
                let image: string | undefined;
                
                // Method 1: Look for img tag in description
                const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
                if (imgMatch) {
                  image = imgMatch[1];
                }
                
                // Method 2: Look for media:content
                if (item['media:content'] && !image) {
                  const mediaContents = Array.isArray(item['media:content']) ? item['media:content'] : [item['media:content']];
                  for (const mediaContent of mediaContents) {
                    // Check if url property exists directly (not in $ attributes)
                    if (mediaContent.url && !image) {
                      image = mediaContent.url;
                      break;
                    }
                    // Also check $ attributes for backward compatibility
                    if (mediaContent.$ && mediaContent.$.url && !image) {
                      image = mediaContent.$.url;
                      break;
                    }
                  }
                }
                
                // Method 3: Look for media:thumbnail
                if (item['media:thumbnail'] && !image) {
                  const thumbnails = Array.isArray(item['media:thumbnail']) ? item['media:thumbnail'] : [item['media:thumbnail']];
                  for (const thumbnail of thumbnails) {
                    // Check if url property exists directly (not in $ attributes)
                    if (thumbnail.url && !image) {
                      image = thumbnail.url;
                      break;
                    }
                    // Also check $ attributes for backward compatibility
                    if (thumbnail.$ && thumbnail.$.url && !image) {
                      image = thumbnail.$.url;
                      break;
                    }
                  }
                }
                
                // Method 4: Look for enclosure (RSS standard)
                if (item.enclosure && !image) {
                  const enclosures = Array.isArray(item.enclosure) ? item.enclosure : [item.enclosure];
                  for (const enclosure of enclosures) {
                    // Check if url property exists directly (not in $ attributes)
                    if (enclosure.url && !image) {
                      image = enclosure.url;
                      break;
                    }
                    // Also check $ attributes for backward compatibility
                    if (enclosure.$ && enclosure.$.url && !image) {
                      image = enclosure.$.url;
                      break;
                    }
                  }
                }
                
                // Method 5: Look for content:encoded (WordPress style)
                if (item['content:encoded'] && !image) {
                  const contentEncoded = item['content:encoded'][0];
                  const imgMatch = contentEncoded.match(/<img[^>]+src="([^"]+)"/);
                  if (imgMatch) {
                    image = imgMatch[1];
                  }
                }
                
                // Method 6: Look for any field that might contain an image URL
                if (!image) {
                  // Search through all item properties for image URLs
                  const allText = JSON.stringify(item);
                  const urlMatch = allText.match(/https?:\/\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)/i);
                  if (urlMatch) {
                    image = urlMatch[0];
                  }
                }
                
                articles.push({
                  title,
                  description: description.replace(/<[^>]*>/g, '').substring(0, 150) + '...',
                  url,
                  pubDate: new Date(pubDate).toLocaleDateString(),
                  image
                });
              }
              
              // Send articles back to webview
              this.panel.webview.postMessage({
                command: "blogArticlesLoaded",
                articles: articles
              });
            });
          } catch (error) {
            console.error('Failed to fetch blog articles from backend:', error);
            // Send empty array to indicate failure
            this.panel.webview.postMessage({
              command: "blogArticlesLoaded",
              articles: []
            });
          }
          break;
        case "openExternal":
          if (msg.url) {
            await commands.executeCommand("vscode.open", Uri.parse(msg.url));
          }
          break;
        case "updateShowOnboardingOnInit":
          if (typeof msg.showOnInit !== "undefined") {
            await writeParameter(
              "idf.showOnboardingOnInit",
              msg.showOnInit,
              ConfigurationTarget.Global
            );
          }
        default:
          break;
      }
    });

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  private async openFolder() {
    const selectedFolder = await window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      canSelectMany: false,
    });
    if (selectedFolder && selectedFolder.length > 0) {
      return selectedFolder[0].fsPath;
    } else {
      window.showInformationMessage("No folder selected");
    }
  }

  private createWelcomePageHtml(scriptsPath: Uri): string {
    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' vscode-resource:; script-src 'unsafe-inline' 'unsafe-eval' vscode-resource:; connect-src https://developer.espressif.com https://*.espressif.com https://api.allorigins.win; img-src vscode-resource: https: data:;">
          <title>ESP-IDF Welcome</title>
        </head>
        <body>
          <div id="app"></div>
        </body>
        <script src="${scriptsPath}"></script>
      </html>`;
  }

  public dispose() {
    WelcomePanel.currentPanel = undefined;
    this.panel.dispose();
  }
}
