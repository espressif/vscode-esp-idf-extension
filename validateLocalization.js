const { glob } = require("node:fs/promises");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { getL10nJson } = require("@vscode/l10n-dev");

const ROOT = __dirname;
const PACKAGE_JSON = join(ROOT, "package.json");
const PACKAGE_NLS = join(ROOT, "package.nls.json");
const L10N_DIR = join(ROOT, "l10n");
const SRC_DIR = join(ROOT, "src");
const NLS_TOKEN_RE = /%([A-Za-z][A-Za-z0-9._-]*)%/g;
const PLACEHOLDER_RE = /\{(?:\d+|[A-Za-z_][A-Za-z0-9_]*)\}/g;
const IGNORED_LOCALE = "qps-ploc";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function keysOf(record) {
  return new Set(Object.keys(record));
}

function diffKeys(sourceKeys, targetKeys) {
  const missing = [];
  const extra = [];
  for (const key of sourceKeys) {
    if (!targetKeys.has(key)) {
      missing.push(key);
    }
  }
  for (const key of targetKeys) {
    if (!sourceKeys.has(key)) {
      extra.push(key);
    }
  }
  return { missing: sorted(missing), extra: sorted(extra) };
}

function emptyKeys(record) {
  const empty = [];
  for (const [key, value] of Object.entries(record)) {
    const text = typeof value === "string" ? value : value?.message;
    if (text == null || !String(text).trim()) {
      empty.push(key);
    }
  }
  return sorted(empty);
}

function messageOf(value, fallbackKey) {
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value.message === "string") {
    return value.message;
  }
  return fallbackKey;
}

function placeholdersIn(text) {
  return sorted(new Set(text.match(PLACEHOLDER_RE) ?? []));
}

function placeholderMismatches(englishRecord, localeRecord) {
  const mismatches = [];
  for (const [key, localeValue] of Object.entries(localeRecord)) {
    if (!(key in englishRecord)) {
      continue;
    }
    const englishText = messageOf(englishRecord[key], key);
    const localeText = messageOf(localeValue, key);
    const englishPlaceholders = placeholdersIn(englishText);
    const localePlaceholders = placeholdersIn(localeText);
    if (englishPlaceholders.join(",") !== localePlaceholders.join(",")) {
      mismatches.push(
        `${key} (en: ${englishPlaceholders.join(" ") || "(none)"}; locale: ${localePlaceholders.join(" ") || "(none)"})`
      );
    }
  }
  return mismatches;
}

function collectPackageTokens(packageJsonText) {
  const tokens = new Set();
  for (const match of packageJsonText.matchAll(NLS_TOKEN_RE)) {
    tokens.add(match[1]);
  }
  return tokens;
}

function localeFromFileName(fileName, prefix, suffix) {
  if (!fileName.startsWith(prefix) || !fileName.endsWith(suffix)) {
    return undefined;
  }
  const locale = fileName.slice(prefix.length, fileName.length - suffix.length);
  if (!locale || locale === IGNORED_LOCALE) {
    return undefined;
  }
  return locale;
}

async function discoverNlsLocales() {
  const locales = [];
  for await (const entry of glob("package.nls.*.json", { cwd: ROOT })) {
    const locale = localeFromFileName(entry, "package.nls.", ".json");
    if (locale) {
      locales.push({ locale, path: join(ROOT, entry) });
    }
  }
  return locales.sort((a, b) => a.locale.localeCompare(b.locale));
}

async function discoverBundleLocales() {
  const locales = [];
  for await (const entry of glob("bundle.l10n.*.json", { cwd: L10N_DIR })) {
    const locale = localeFromFileName(entry, "bundle.l10n.", ".json");
    if (locale) {
      locales.push({ locale, path: join(L10N_DIR, entry) });
    }
  }
  return locales.sort((a, b) => a.locale.localeCompare(b.locale));
}

async function collectSrcTypeScriptFiles() {
  const files = [];
  for await (const entry of glob("**/*.ts", { cwd: SRC_DIR })) {
    files.push({
      extension: ".ts",
      contents: readFileSync(join(SRC_DIR, entry), "utf8"),
    });
  }
  return files;
}

function printSection(title, items) {
  if (items.length === 0) {
    return;
  }
  console.error(`  ${title} (${items.length}):`);
  console.error(`\n`);
  for (const item of items) {
    console.error(`    - ${item}`);
  }
  console.error(`\n----------------------------------------\n`);
}

function reportIssues(fileLabel, issues) {
  const hasIssues = Object.values(issues).some((items) => items.length > 0);
  if (!hasIssues) {
    return false;
  }
  console.error(`\n${fileLabel}`);
  console.error(`\n${"-".repeat(fileLabel.length)}\n`);
  printSection("missing", issues.missing ?? []);
  printSection("extra", issues.extra ?? []);
  printSection("unused", issues.unused ?? []);
  printSection("empty", issues.empty ?? []);
  printSection("placeholders", issues.placeholders ?? []);
  return true;
}

async function validatePackageNls() {
  const packageJsonText = readFileSync(PACKAGE_JSON, "utf8");
  const english = readJson(PACKAGE_NLS);
  const tokens = collectPackageTokens(packageJsonText);
  const englishKeys = keysOf(english);
  const { missing: missingTokens, extra: unusedKeys } = diffKeys(
    tokens,
    englishKeys
  );

  let failed = reportIssues("package.nls.json", {
    missing: missingTokens,
    unused: unusedKeys,
    empty: emptyKeys(english),
  });

  for (const { locale, path } of await discoverNlsLocales()) {
    const localeRecord = readJson(path);
    const { missing, extra } = diffKeys(englishKeys, keysOf(localeRecord));
    failed =
      reportIssues(`package.nls.${locale}.json`, {
        missing,
        extra,
        empty: emptyKeys(localeRecord),
        placeholders: placeholderMismatches(english, localeRecord),
      }) || failed;
  }

  return failed;
}

async function validateRuntimeBundles() {
  const srcFiles = await collectSrcTypeScriptFiles();
  const english = await getL10nJson(srcFiles);
  const englishKeys = keysOf(english);
  let failed = false;

  for (const { locale, path } of await discoverBundleLocales()) {
    const localeRecord = readJson(path);
    const { missing, extra } = diffKeys(englishKeys, keysOf(localeRecord));
    failed =
      reportIssues(`l10n/bundle.l10n.${locale}.json`, {
        missing,
        extra,
        empty: emptyKeys(localeRecord),
        placeholders: placeholderMismatches(english, localeRecord),
      }) || failed;
  }

  return failed;
}

(async () => {
  try {
    const nlsFailed = await validatePackageNls();
    const bundleFailed = await validateRuntimeBundles();
    if (nlsFailed || bundleFailed) {
      console.error("\nLocalization validation failed.");
      process.exit(1);
    }
    console.log("Localization validation passed.");
  } catch (error) {
    console.error("Error while validating localization:", error);
    process.exit(1);
  }
})();
