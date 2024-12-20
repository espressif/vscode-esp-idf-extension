// Copyright 2020 Espressif Systems (Shanghai) CO LTD
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

import { Uri } from "vscode";
import * as idfConf from "../../idfConfiguration";
import { getEspIdfFromCMake } from "../../utils";
import { getDocsBaseUrl, getDocsIndex, getDocsVersion } from "./getDocsVersion";
import { getIdfTargetFromSdkconfig } from "../../workspaceConfig";

export class IDocResult {
  public name: string;
  public docName: string;
  public resultType: string;
  public url: string;
}

export function getIntersection(
  termResults: IDocResult[],
  anotherTermResults: IDocResult[]
) {
  return termResults.filter((termResult: IDocResult) => {
    const elem = anotherTermResults.filter((d: IDocResult) => {
      return termResult.name
        ? termResult.name === d.name
        : termResult.docName === d.docName;
    });
    return elem.length;
  });
}

export async function seachInEspDocs(
  searchString: string,
  workspaceFolder: Uri
) {
  const docsVersions = await getDocsVersion();
  const customExtraVars = idfConf.readParameter(
    "idf.customExtraVars",
    workspaceFolder
  ) as { [key: string]: string };
  const idfPath = customExtraVars["IDF_PATH"];
  let idfVersion = "v" + (await getEspIdfFromCMake(idfPath));
  let idfTarget = await getIdfTargetFromSdkconfig(workspaceFolder);
  let docVersion = docsVersions.find((docVer) => docVer.name === idfVersion);
  let targetToUse: string = "esp32";
  if (!docVersion) {
    docVersion = docsVersions.find((docVer) => docVer.name === "latest");
  }
  if (
    docVersion.supportedTargets &&
    docVersion.supportedTargets.indexOf(idfTarget) !== -1
  ) {
    targetToUse = idfTarget;
  }
  const baseUrl = getDocsBaseUrl(docVersion.name, targetToUse);
  const docIndex = await getDocsIndex(baseUrl, docVersion.name, targetToUse);

  const termsToSearch = searchString.trim().split(" ");

  let termsResults: IDocResult[];
  for (const term of termsToSearch) {
    if (!termsResults) {
      termsResults = getResultsForTerm(baseUrl, term, docIndex);
    } else {
      const newTermResults = getResultsForTerm(baseUrl, term, docIndex);
      termsResults = getIntersection(termsResults, newTermResults);
    }
  }
  return Array.from(termsResults);
}

function getResultsForTerm(baseUrl: string, term: string, docIndex) {
  const objectResultsKeys = Object.keys(docIndex.objects[""]).filter(
    (d) => d.indexOf(term) !== -1
  );
  const objUrlResults = objectResultsKeys.map((resultKey) => {
    const fileIndex = docIndex.objects[""][resultKey][0];
    const sectionInFile = docIndex.objects[""][resultKey][3];
    const objName = docIndex.objnames[docIndex.objects[""][resultKey][1]][2];
    const highlightTerm = encodeURIComponent(term.toLowerCase());
    const objResult = {
      docName: docIndex.titles[fileIndex],
      name: resultKey || docIndex.titles[fileIndex],
      resultType: objName,
      url: `${baseUrl}/${docIndex.docnames[fileIndex]}.html?highlight=${highlightTerm}#${sectionInFile}`,
    } as IDocResult;
    return objResult;
  });
  const titleResults = getUrlsFromTerm(baseUrl, term, "titleterms", docIndex);
  const termResults = getUrlsFromTerm(baseUrl, term, "terms", docIndex);

  return [].concat(objUrlResults, titleResults, termResults) as IDocResult[];
}

function getUrlsFromTerm(
  baseUrl: string,
  searchTerm: string,
  section: string,
  docIndex
) {
  const highlightTerm = encodeURIComponent(searchTerm.toLowerCase());
  const sectionResults = Object.keys(docIndex[section]).filter(
    (d) => d.indexOf(searchTerm.toLowerCase()) !== -1
  );

  const sectionUrlResults: IDocResult[] = [];
  for (const termKey of sectionResults) {
    const termDocs = docIndex[section][termKey];
    if (Array.isArray(termDocs)) {
      const keyResults: IDocResult[] = [];
      for (const doc of termDocs) {
        const termResult = {
          docName: docIndex.titles[doc],
          name: "",
          resultType: "",
          url: `${baseUrl}/${docIndex.docnames[doc]}.html?highlight=${highlightTerm}`,
        } as IDocResult;
        keyResults.push(termResult);
      }
      sectionUrlResults.push(...keyResults);
    } else {
      const termResult = {
        docName: docIndex.titles[termDocs],
        name: "",
        resultType: "",
        url: `${baseUrl}/${docIndex.docnames[termDocs]}.html?highlight=${highlightTerm}`,
      } as IDocResult;
      sectionUrlResults.push(termResult);
    }
  }
  return sectionUrlResults;
}
