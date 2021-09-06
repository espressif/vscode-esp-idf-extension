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

const gulp = require("gulp");
const del = require("del");
const vsce = require("vsce");
const nls = require("vscode-nls-dev");
const { readdirSync, statSync } = require("fs");
const { readJSON, writeJSON } = require("fs-extra");
const { join } = require("path");
const glob = require("glob");

// If all VS Code languages are supported you can use nls.coreLanguages
const languages = []; // [{ folderName: 'zh-CN', id: 'zh-CN' }, { folderName: 'es', id: 'es' }];

const getDirs = (p) =>
  readdirSync(p).filter((f) => statSync(join(p, f)).isDirectory());
const languagesDirs = getDirs(join(__dirname, "i18n"));
languagesDirs.forEach((langDir) => {
  languages.push({ folderName: langDir, id: langDir });
});

function clean(done) {
  del([
    "dist/**",
    "out/**",
    "package.nls.*.json",
    "*.vsix",
    "report.json",
    "report.txt",
    "testing.results.log",
  ]);
  done();
}

function addI18n(done) {
  gulp
    .src(["package.nls.json"])
    .pipe(nls.createAdditionalLanguageFiles(languages, "i18n"))
    .pipe(gulp.dest("."));
  done();
}

function vscePublish(done) {
  vsce.publish();
  done();
}

function vscePackage(done) {
  vsce.createVSIX();
  done();
}

function getPathParts(pathToUse) {
  const parts = pathToUse.split(/(?:\\|\/)/g);
  parts.splice(0, parts.indexOf("i18n") + 2);
  parts[parts.length - 1] = parts[parts.length - 1].replace(/(\.).*/g, "");
  return parts;
}

const reduceSchemaObj = (schemaObj, parts) => {
  return parts.reduce(
    (obj, key) => (obj && obj[key] !== undefined ? obj[key] : undefined),
    schemaObj
  );
};

function validateLocalizationFiles(done) {
  const schema = require("./schema.i18n.json");
  languages.forEach((l) => {
    const langDirPath = join(
      __dirname,
      "i18n",
      l.folderName,
      "**",
      "*.i18n.json"
    );
    glob(langDirPath, (err, locFiles) => {
      if (err) {
        throw err;
      }
      locFiles.forEach((locFile) => {
        const localeJson = require(locFile);
        const parts = getPathParts(locFile);
        const schemaKeys = reduceSchemaObj(schema, parts);
        schemaKeys.forEach((schemaKey) => {
          if (!localeJson.hasOwnProperty(schemaKey)) {
            throw new Error(`${schemaKey} not defined in ${locFile}`);
          }
        });
        Object.keys(localeJson).forEach((fileKey) => {
          if (schemaKeys.indexOf(fileKey) < 0) {
            console.log(`Unknown property ${fileKey} defined in ${locFile}`);
          }
        });
      });
    });
  });
  done();
}

async function addExtensionDependencies(done) {
  const packageJson = await readJSON("package.json");
  packageJson.extensionDependencies = ["ms-vscode.cpptools"];
  await writeJSON("package.json", packageJson, { spaces: 2 });
  done();
}

async function removeExtensionDependencies(done) {
  const packageJson = await readJSON("package.json");
  if (packageJson.extensionDependencies) {
    packageJson.extensionDependencies = undefined;
    await writeJSON("package.json", packageJson, { spaces: 2});
  }
  done();
}

const preBuild = gulp.series(clean, addI18n, validateLocalizationFiles);
const build = gulp.series(preBuild, addExtensionDependencies);
exports.clean = gulp.series(clean, removeExtensionDependencies);
exports.build = build;
exports.validateLocalization = validateLocalizationFiles;
exports.publish = gulp.series(build, vscePublish);
exports.vscePkg = gulp.series(build, vscePackage);
exports.default = build;

exports.noDepBuild = gulp.series(preBuild, removeExtensionDependencies);
