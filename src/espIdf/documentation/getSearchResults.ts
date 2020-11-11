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

import * as idfConf from "../../idfConfiguration";
import { getEspIdfVersion } from "../../utils";
import { getDocsBaseUrl, getDocsIndex, getDocsVersion } from "./getDocsVersion";

export interface IDocResult {
  name: string;
  docName: string;
  resultType: string;
  url: string;
}

export async function seachInEspDocs(searchString: string) {
  const docsVersions = await getDocsVersion();
  const idfPath =
    idfConf.readParameter("idf.espIdfPath") || process.env.IDF_PATH;
  let idfVersion = "v" + (await getEspIdfVersion(idfPath));
  const idfTarget = idfConf.readParameter("idf.adapterTargetName") as string;
  let docVersion = docsVersions.find((docVer) => docVer.name === idfVersion);
  let targetToUse: string;
  if (!docVersion) {
    docVersion = docsVersions.find((docVer) => docVer.name === "latest");
  }
  if (
    docVersion.supportedTargets &&
    docVersion.supportedTargets.indexOf(idfTarget) !== -1
  ) {
    targetToUse = idfTarget;
  }
  const baseUrl = getDocsBaseUrl(docVersion.name, idfTarget);
  const docIndex = await getDocsIndex(baseUrl);

  const objectResultsKeys = Object.keys(docIndex.objects[""]).filter(
    (d) => d.indexOf(searchString) !== -1
  );
  const objUrlResults = objectResultsKeys.map((resultKey) => {
    const fileIndex = docIndex.objects[""][resultKey][0];
    const sectionInFile = docIndex.objects[""][resultKey][3];
    const objName = docIndex.objnames[docIndex.objects[""][resultKey][1]][2];
    const highlightTerm = encodeURIComponent(searchString.toLowerCase());
    const objResult = {
      docName: docIndex.titles[fileIndex],
      name: resultKey || docIndex.titles[fileIndex],
      resultType: objName,
      url: `${baseUrl}/${docIndex.docnames[fileIndex]}.html?highlight=${highlightTerm}#${sectionInFile}`,
    } as IDocResult;
    return objResult;
  });
  const titleResults = getUrlsFromTerm(
    baseUrl,
    searchString,
    "titleterms",
    docIndex
  );
  const termResults = getUrlsFromTerm(baseUrl, searchString, "terms", docIndex);

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
