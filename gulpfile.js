const gulp = require('gulp');
const del = require('del');
const vsce = require('vsce');
const nls = require('vscode-nls-dev');
const { readdirSync, statSync } = require('fs');
const { join } = require('path');

// If all VS Code languages are supported you can use nls.coreLanguages
const languages = []; // [{ folderName: 'zh-CN', id: 'zh-CN' }, { folderName: 'es', id: 'es' }];

const getDirs = p => readdirSync(p).filter(f => statSync(join(p, f)).isDirectory());
const languagesDirs = getDirs(join(__dirname, 'i18n'));
languagesDirs.forEach((langDir) => {
  languages.push({ folderName: langDir, id: langDir });
});

function clean(done) {
  del(['out/**', 'package.nls.*.json', '*.vsix']);
  done();
}

function addI18n(done) {
  gulp.src(['package.nls.json'])
    .pipe(nls.createAdditionalLanguageFiles(languages, 'i18n'))
    .pipe(gulp.dest('.'));
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

const build = gulp.series(clean, addI18n);
exports.clean = clean;
exports.build = build;
exports.publish = gulp.series(build, vscePublish);
exports.vscePkg = gulp.series(build, vscePackage);
exports.default = build;

