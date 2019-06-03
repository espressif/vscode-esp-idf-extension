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

define([], () => function HtmlFormatter() {
  const middleTextBulletRegex = /(\n\n-)[\s\S]*(\n\n)/g;
  const linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,4}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g;
  const redTextRegex = /``(.*?)``/g;
  const bulletPointStart = '\n\n-';
  const bulletPointRegex = /\n-/g;
  const newLineRegex = /\n\n/g;

  this.formatRedText = function formatRedText(htmlString) {
    if (htmlString !== null && htmlString !== undefined &&
        htmlString.match(redTextRegex) !== null) {
      // Replaces ``function-name`` with <span>function-name</span>
      let newHtmlString = htmlString;
      const matches = htmlString.match(redTextRegex);
      matches.forEach((match) => {
        const newMatch = `<span>${match.substr(2, match.length - 4)}</span>`;
        newHtmlString = newHtmlString.replace(match, newMatch);
      });
      return newHtmlString;
    }
    return htmlString;
  };

  this.formatLinkText = function formatLinkText(htmlString) {
    if (htmlString !== null && htmlString !== undefined &&
      htmlString.match(linkRegex) !== null) {
      // Replace links with <a href="link">link</a>
      let newHtmlString = htmlString;
      const linkMatches = htmlString.match(linkRegex);
      linkMatches.forEach((link) => {
        const newLink = `<a href="${link}">${link}</a>`;
        newHtmlString = newHtmlString.replace(link, newLink);
      });
      return newHtmlString;
    }
    return htmlString;
  };

  this.formatBulletPoint = function formatBulletPoint(htmlString) {
    if (htmlString !== null && htmlString !== undefined) {
      let newHtmlString = htmlString;
      if (htmlString.match(middleTextBulletRegex) !== null) {
        // Middle of text list of bullet points case
        const bulletPointMatches = htmlString.match(middleTextBulletRegex);
        bulletPointMatches.forEach((bulletPoint) => {
          const replacement = `${bulletPoint.replace(bulletPointStart, '<ul><li>')
            .replace(bulletPointRegex, '</li><li>')}</li></ul>`;
          newHtmlString = newHtmlString.replace(bulletPoint, replacement);
        });
        return newHtmlString;
      }
    }
    return htmlString;
  };

  this.formatEndBulletPoint = function formatEndBulletPoint(htmlString) {
    if (htmlString !== null && htmlString !== undefined &&
        htmlString.match(middleTextBulletRegex) === null &&
        htmlString.indexOf(bulletPointStart) > 0) {
      // End of text list of bullet points case
      const newHtmlString = `${htmlString.replace(bulletPointStart, '<ul><li>')
        .replace(bulletPointRegex, '</li><li>')}</li></ul>`;
      return newHtmlString;
    }
    return htmlString;
  };

  this.formatNewLine = function formatNewLine(htmlString) {
    if (htmlString !== null && htmlString !== undefined) {
      return htmlString.replace(newLineRegex, '<br><br>');
    }
    return htmlString;
  };

  this.formatHelpText = function formatHelpText(helpString) {
    let newHelp = this.formatBulletPoint(helpString);
    newHelp = this.formatEndBulletPoint(newHelp);
    newHelp = this.formatRedText(newHelp);
    newHelp = this.formatLinkText(newHelp);
    newHelp = this.formatNewLine(newHelp);
    return newHelp;
  };
});
