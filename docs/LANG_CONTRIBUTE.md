# Language Contribution Guidelines

Make sure you install the source code version of this extension by following [Source Mode](./INSTALL.md#Build-from-Source-Code).

Inside `l10n` folder, create a `bundle.l10n.<lang>.json` file using the language code name as specified by [ISO 639-3](https://en.wikipedia.org/wiki/ISO_639-3) convention to replace `<lang>`.

In the root directory, also contribute a `package.nls.<lang>.json` for static language definitions such as command names and such.

To generate the english definition, just run the `yarn genLocalizationBundle` command which will generate `l10n/bundle.l10n.json` english bundle file and copy the `package.nls.json`.

Each file has a key value structure such as:

```json
{
  "englishTextOrTextId": "translationInNewLanguage"
}
```

where you would replace the `value` part with your language contribution.

(Re-) Compile the extension installation file (.vsix) by running `yarn package` from a terminal in the directory of this file.

Test your contribution by changing Visual Studio Code locale:

- Pressing F1 and run the `Configure Display Language` command.
- Or manually modify `locale.json` in your Visual Studio Code User Settings.

Make a pull request with your contribution, please follow the [Code of Conduct](./CODE_OF_CONDUCT.md) while creating a pull request.
