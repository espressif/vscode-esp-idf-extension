# Language contribution guidelines

Make sure you install the source code version of this extension by following [Source Mode](README.md#Source-Mode).

Inside i18n folder, create a sub-directory using the language code name as specified by [ISO 639-3](https://en.wikipedia.org/wiki/ISO_639-3) convention.

For ease you could copy the `en` for English definitions. A language folder tree structure should look like:

```
<IS0 639-3 Language Code>/
    +-- out/
        +-- sub-directory/
            +-- ...
        +-- ...
        +-- ...
        +-- ...
        +-- extension.i18n.json
        +-- utils.i18n.json
    +-- package.i18n.json
```

Each file has a key value structure such as:

```
{
    "espIdf.createFiles.title": "ESP-IDF: Create ESP-IDF project",
    .
    .
    .
    "key": "value"
}
```

where you would replace the `value` part with your language contribution.

(Re-) Compile the extension installation file (.vsix) by running `yarn run build_vsix` from a terminal in the directory of this file.

Test your contribution by changing Visual Studio Code locale:

- Pressing F1 and run the `Configure Display Language` command.
- Or manually modify `locale.json` in your Visual Studio Code User Settings.

Make a pull request with your contribution, please follow the [Code of Conduct](CODE_OF_CONDUCT.md) while creating a pull request.
