/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 20th December 2023 9:29:45 am
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
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

import { IGcovFileTotal, IGcovOutput, IGcovReport } from "./gcovData";

function getCurrentDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function createGcovReportObj(gcovDataArray: IGcovOutput[]) {
  const gcovReport: IGcovReport = {
    totals: {
      lines: {
        executed: 0,
        total: 0,
      },
      functions: {
        executed: 0,
        total: 0,
      },
      branches: {
        executed: 0,
        total: 0,
      },
    },
    fileTotals: [],
  };

  for (const gCovdataObj of gcovDataArray) {
    for (const gcovFile of gCovdataObj.files) {
      let fileTotal: IGcovFileTotal = {
        branches: {
          executed: 0,
          total: 0,
        },
        file: gcovFile.file,
        functions: {
          executed: 0,
          total: 0,
        },
        lines: {
          executed: 0,
          total: 0,
        },
      };
      for (let line of gcovFile.lines) {
        gcovReport.totals.lines.total += 1;
        fileTotal.lines.total += 1;
        if (!line.unexecuted_block) {
          fileTotal.lines.executed += 1;
          gcovReport.totals.lines.executed += 1;
        }
        for (const branch of line.branches) {
          if (branch.fallthrough) {
            fileTotal.branches.executed += 1;
            gcovReport.totals.branches.executed += 1;
          }
          fileTotal.branches.total += 1;
          gcovReport.totals.branches.total += 1;
        }
      }
      for (let func of gcovFile.functions) {
        fileTotal.functions.total += 1;
        gcovReport.totals.functions.total += 1;
        if (func.execution_count > 0) {
          fileTotal.functions.executed += 1;
          gcovReport.totals.functions.executed += 1;
        }
      }
      gcovReport.fileTotals.push(fileTotal);
    }
  }
  return gcovReport;
}

function calculatePercentage(part: number, whole: number) {
  if (whole === 0) {
    return "0.0%";
  }
  const percentage = (part / whole) * 100;
  return `${percentage.toFixed(1)}%`;
}

export function getTableRowForFileTotal(fileTotals: IGcovFileTotal[]) {
  let resultStr = "";

  for (const fileTotal of fileTotals) {
    const lineCoverage = calculatePercentage(
      fileTotal.lines.executed,
      fileTotal.lines.total
    );
    const functionCoverage = calculatePercentage(
      fileTotal.functions.executed,
      fileTotal.functions.total
    );
    const branchesCoverage = calculatePercentage(
      fileTotal.branches.executed,
      fileTotal.branches.total
    );
    resultStr += `<tr>
        <th scope="row">
          ${fileTotal.file}
        </th>
        <td class="${getCoverageClass(
          fileTotal.lines.executed,
          fileTotal.lines.total
        )}">${lineCoverage}</td>
        <td class="${getCoverageClass(
          fileTotal.lines.executed,
          fileTotal.lines.total
        )}">${fileTotal.lines.executed} / ${fileTotal.lines.total}</td>
        <td class="${getCoverageClass(
          fileTotal.functions.executed,
          fileTotal.functions.total
        )}">${functionCoverage}</td>
        <td class="${getCoverageClass(
          fileTotal.functions.executed,
          fileTotal.functions.total
        )}">${fileTotal.functions.executed} / ${fileTotal.functions.total}</td>
        <td class="${getCoverageClass(
          fileTotal.branches.executed,
          fileTotal.branches.total
        )}">${branchesCoverage}</td>
        <td class="${getCoverageClass(
          fileTotal.branches.executed,
          fileTotal.branches.total
        )}">${fileTotal.branches.executed} / ${fileTotal.branches.total}</td>
      </tr>\n`;
  }
  return resultStr;
}

export function getCoverageClass(part: number, whole: number) {
  if (whole === 0) {
    return "";
  }
  const percentage = (part / whole) * 100;
  if (percentage >= 90) {
    return "coverage-high";
  } else if (percentage >= 75) {
    return "coverage-medium";
  } else if (percentage < 75) {
    return "coverage-low";
  } else {
    return "";
  }
}

export function getTotals(gcovReport: IGcovReport) {
  const lineCoverage = calculatePercentage(
    gcovReport.totals.lines.executed,
    gcovReport.totals.lines.total
  );
  const functionCoverage = calculatePercentage(
    gcovReport.totals.functions.executed,
    gcovReport.totals.functions.total
  );
  const branchesCoverage = calculatePercentage(
    gcovReport.totals.branches.executed,
    gcovReport.totals.branches.total
  );
  return `<tr>
  <th scope="row">Lines:</th>
  <td>${gcovReport.totals.lines.executed}</td>
  <td>${gcovReport.totals.lines.total}</td>
  <td class="${getCoverageClass(
    gcovReport.totals.lines.executed,
    gcovReport.totals.lines.total
  )}">${lineCoverage}</td>
</tr>
<tr>
  <th scope="row">Functions:</th>
  <td>${gcovReport.totals.functions.executed}</td>
  <td>${gcovReport.totals.functions.total}</td>
  <td class="${getCoverageClass(
    gcovReport.totals.functions.executed,
    gcovReport.totals.functions.total
  )}">${functionCoverage}</td>
</tr>
<tr>
  <th scope="row">Branches:</th>
  <td>${gcovReport.totals.branches.executed}</td>
  <td>${gcovReport.totals.branches.total}</td>
  <td class="${getCoverageClass(
    gcovReport.totals.branches.executed,
    gcovReport.totals.branches.total
  )}">${branchesCoverage}</td>
</tr>`;
}

export function createGcovHtmlReport(gcovData: IGcovOutput[]) {
  const dateNow = getCurrentDateTime();
  const gcovReport = createGcovReportObj(gcovData);
  const totals = getTotals(gcovReport);
  const fileRows = getTableRowForFileTotal(gcovReport.fileTotals);
  return `<!DOCTYPE html>
  <html>
  
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
      <title>GCC Code Coverage Report</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>

      <style>
      .summary {
        display: flex;
        justify-content: space-between;
      }
      
      .coverage {
        display: flex;
      }
      
      .file-list {
        width: 100%;
      }

      .coverage td, .coverage th,
      .file-list td, .file-list th {
        padding: 0 10px;
      }
      
      .coverage-low {
        background-color: var(--vscode-charts-red);
        color: var(--vscode-editor-foreground);
      }
      
      .coverage-medium {
        background-color: var(--vscode-charts-yellow);
        color: var(--vscode-editor-background);
      }
      
      .coverage-high {
        background-color: var(--vscode-charts-green);
        color: var(--vscode-editor-background);
      }
      
      meter {
        width: 100%;
      }
      </style>
    </head>
  
    <body>
      <header>
        <h1>GCC Code Coverage Report</h1>
  
        <hr/>
  
        <div class="summary">
          <div>
            <table class="legend">
              <tr>
                <th scope="row">Directory:</th>
                <td>${gcovData[0].current_working_directory}</td>
              </tr>
              <tr>
                <th scope="row">Date:</th>
                <td>${dateNow}</td>
              </tr>
              <tr>
                <th scope="row">Coverage:</th>
                <td class="legend">
                  <span class="coverage-low">low: < 75%</span>
                  <span class="coverage-medium">medium: &ge; 75.0%</span>
                  <span class="coverage-high">high: &ge; 90.0%</span>
                </td>
              </tr>
            </table>
          </div>
    
          <div>
            <table class="coverage">
              <tr>
                <th></th>
                <th scope="col">Executed</th>
                <th scope="col">Total</th>
                <th scope="col">Coverage</th>
              </tr>
              ${totals}
            </table>
          </div>
        </div>
  
        <hr/>
      </header>
  
      <main>
        <table class="file-list">
          <col/>
          <colgroup span="2"/>
          <colgroup span="2"/>
          <colgroup span="2"/>
        
          <tr>
            <th scope="col">File</th>
            <th scope="colgroup" colspan=3>Lines</th>
            <th scope="colgroup" colspan=2>Functions</th>
            <th scope="colgroup" colspan=2>Branches</th>
          </tr>
          ${fileRows}
        
        </table>
        <hr/>
      </main>
    </body>
  </html>`;
}
