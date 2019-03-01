
# Language contribution guidelines.

Make sure you install the source code version of this extension by following [Install using compressed source code](README.md#Installation-using-compressed-source-code-(espidf-vscode.tar.gz)).

Inside i18n folder, create a sub-directory using the language code name as specified by [ISO 639-3](https://en.wikipedia.org/wiki/ISO_639-3) convention. 

For ease you could copy the `en` for English definitions. A language folder should contain the following files:

```
<IS0 639-3 Language Code>/
    +-- out/
        +-- extension.i18n.json
        +-- idfComponentsDataProvider.i18n.json
        +-- idfConfiguration.i18n.json
        +-- MenuconfigPanel.i18n.json
        +-- utils.i18n.json
        +-- webViewContent.i18n.json
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

Recompile the extension installation file (.vsix) by running `npm run build_vsix` from a terminal in the directory of this file. 

Test your contribution by changing Visual Studio Code locale:
- Pressing F1 and running the `Configure Display Language` command. 
- Or manually modify `locale.json` in your Visual Studio Code User Settings.

Make a pull request with your contribution !