/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Friday, 21st June 2019 10:57:18 am
 * Copyright 2019 Espressif Systems (Shanghai) CO LTD
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *    http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const middleTextBulletRegex = /(\n\n-)[\s\S]*(\n)/g;
const middleRegex = /(\n\n-)[\s\S]*?(\n\n)/g;
const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g;
const redTextRegex = /``(.*?)``/g;
const bulletPointStart = "\n\n-";
const bulletPointRegex = /\n-/g;
const newLineRegex = /\n\n/g;

export function formatRedText(htmlString) {
  // Replaces ``function-name`` with <span>function-name</span>
  if (htmlString && htmlString.match(redTextRegex) !== null) {
    let newHtmlString = htmlString;
    const matches = htmlString.match(redTextRegex);
    matches.forEach((match) => {
      const newMatch = `<span>${match.substr(2, match.length - 4)}</span>`;
      newHtmlString = newHtmlString.replace(match, newMatch);
    });
    return newHtmlString;
  }
  return htmlString;
}

export function formatLinkText(htmlString) {
  // Replace links with <a href="link">link</a>
  if (htmlString && htmlString.match(linkRegex) !== null) {
    let newHtmlString = htmlString;
    const linkMatches = htmlString.match(linkRegex);
    linkMatches.forEach((link) => {
      const newLink = `<a href="${link}">${link}</a>`;
      newHtmlString = newHtmlString.replace(link, newLink);
    });
    return newHtmlString;
  }
  return htmlString;
}

export function formatBulletPoint(htmlString) {
  // Middle of text list of bullet points case
  if (htmlString) {
    let newHtmlString = htmlString;
    const middleMatch = htmlString.match(middleRegex);
    if (
      middleMatch &&
      middleRegex.test(htmlString) &&
      middleRegex.lastIndex !== htmlString.length &&
      htmlString.lastIndexOf("\n-") < middleRegex.lastIndex
    ) {
      const bulletPointMatches = htmlString.match(middleRegex);
      bulletPointMatches.forEach((bulletPoint) => {
        const replacement = `${bulletPoint
          .replace(bulletPointStart, "<ul><li>")
          .replace(bulletPointRegex, "</li><li>")}</li></ul>`;
        newHtmlString = newHtmlString.replace(bulletPoint, replacement);
      });
      return newHtmlString;
    }
  }
  return htmlString;
}

export function formatEndBulletPoint(htmlString) {
  // End of text list of bullet points case
  if (
    htmlString &&
    htmlString.indexOf(bulletPointStart) > 0 &&
    (htmlString.match(middleTextBulletRegex) === null ||
      (middleTextBulletRegex.test(htmlString) &&
        middleTextBulletRegex.lastIndex === htmlString.length))
  ) {
    const newHtmlString = `${htmlString
      .replace(bulletPointStart, "<ul><li>")
      .replace(bulletPointRegex, "</li><li>")}</li></ul>`;
    return newHtmlString;
  }
  return htmlString;
}

export function formatNewLine(htmlString) {
  if (htmlString) {
    return htmlString.replace(newLineRegex, "<br><br>");
  }
  return htmlString;
}

export function formatHelpText(helpString) {
  let newHelp = formatBulletPoint(helpString);
  newHelp = formatEndBulletPoint(newHelp);
  newHelp = formatRedText(newHelp);
  newHelp = formatLinkText(newHelp);
  newHelp = formatNewLine(newHelp);
  return newHelp;
}
