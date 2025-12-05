/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Monday, 29th November 2021 5:08:14 pm
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

import { Progress, Uri } from "vscode";
import { readParameter } from "../idfConfiguration";
import { packageJson } from "../utils";
import { parseStringPromise } from "xml2js";
import { Logger } from "../logger/logger";

export interface IWelcomeArticle {
  title: string;
  description: string;
  url: string;
  pubDate: string;
  image?: string;
}

export interface IWelcomeArgs {
  espIdf: string;
  extensionVersion: string;
  showOnInit: boolean;
  articles: IWelcomeArticle[];
}

export async function getWelcomePageInitialValues(
  progress: Progress<{ message: string; increment: number }>,
  workspace?: Uri
) {
  progress.report({ increment: 20, message: "Getting extension version..." });
  const extensionVersion = packageJson.version as string;
  const confEspIdfPath = readParameter("idf.espIdfPath", workspace) as string;
  const confShowOnboardingOnInit = readParameter(
    "idf.showOnboardingOnInit"
  ) as boolean;
  const articles = await loadDeveloperPortalArticles();
  const welcomePageArgs = {
    espIdf: confEspIdfPath,
    extensionVersion,
    showOnInit: confShowOnboardingOnInit,
    articles,
  };
  return welcomePageArgs;
}

export async function loadDeveloperPortalArticles() {
  const articles: IWelcomeArticle[] = [];

  try {
    const response = await fetch(
      "https://developer.espressif.com/blog/index.xml"
    );
    const xmlText = await response.text();

    const articlesResult = await parseStringPromise(xmlText);

    const items = articlesResult.rss?.channel?.[0]?.item || [];

    for (let i = 0; i < Math.min(6, items.length); i++) {
      const item = items[i];
      const title = item.title?.[0] || "";
      const description = item.description?.[0] || "";
      const url = item.link?.[0] || "";
      const pubDate = item.pubDate?.[0] || "";

      // Try to extract image
      let image: string | undefined;

      // Method 1: Look for img tag in description
      const imgMatch = description.match(/<img[^>]+src="([^"]+)"/);
      if (imgMatch) {
        image = imgMatch[1];
      }

      // Method 2: Look for media:content
      if (item["media:content"] && !image) {
        const mediaContents = Array.isArray(item["media:content"])
          ? item["media:content"]
          : [item["media:content"]];
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
      if (item["media:thumbnail"] && !image) {
        const thumbnails = Array.isArray(item["media:thumbnail"])
          ? item["media:thumbnail"]
          : [item["media:thumbnail"]];
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
        const enclosures = Array.isArray(item.enclosure)
          ? item.enclosure
          : [item.enclosure];
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
      if (item["content:encoded"] && !image) {
        const contentEncoded = item["content:encoded"][0];
        const imgMatch = contentEncoded.match(/<img[^>]+src="([^"]+)"/);
        if (imgMatch) {
          image = imgMatch[1];
        }
      }

      // Method 6: Look for any field that might contain an image URL
      if (!image) {
        // Search through all item properties for image URLs
        const allText = JSON.stringify(item);
        const urlMatch = allText.match(
          /https?:\/\/[^"'\s]+\.(jpg|jpeg|png|gif|webp)/i
        );
        if (urlMatch) {
          image = urlMatch[0];
        }
      }

      articles.push({
        title,
        description: extractPlainText(description).substring(0, 150) + "...",
        url,
        pubDate: new Date(pubDate).toLocaleDateString(),
        image,
      });
    }

    // Parse XML using xml2js
    return articles;
  } catch (error) {
    Logger.error(
      "Failed to fetch blog articles from backend:",
      error,
      "loadDeveloperPortalArticles"
    );
    return [];
  }
}

/**
 * Convert text string characters to plain text.
 * @param originalText
 * @returns text with replaced strings
 */
function extractPlainText(originalText: string): string {
  if (!originalText || typeof originalText !== "string") {
    return "";
  }

  let text = originalText
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

  return text;
}
