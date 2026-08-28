## Telemetry

We collects telemetry data, from vscode extension which is used to help understand how to improve the extension. For example, this usage data helps to debug issues, such as slow start-up times, and to prioritize new features.

While we appreciate the insights this data provides, we also know that not everyone wants to send usage data and you can disable telemetry as described in disable telemetry reporting.

### Disable telemetry reporting

If you like to opt-out of telemetry collection you can disable `idf.telemetry` settings to `false`.

Settings can be located inside **File > Preferences > Settings** (macOS: **Code > Preferences > Settings**), there you can search `idf.telemetry` and deselect the option.

> Please note change to this settings requires a restart of VSCode

### Exception properties

Process and command failures are sent as exceptions. Custom properties include:

- `category` — call-site identifier (for example `src utils spawn` or `handleError espIdf.buildDevice`)
- `command` — VS Code command id when handled through `handleError`, or the sanitized executable name for wrapper spawn/exec failures
- `processCommand` — sanitized executable basename (`python`, `ninja`, `cmake`)
- `args` — sanitized argument list (path tokens reduced to basename, serial ports after `-p` / `--port` redacted, truncated)
- `script` — first `*.py` argument basename when present (`idf.py`, `esptool.py`)
- `taskName` — ESP-IDF task name for task failures (`ESP-IDF Build`, `ESP-IDF Flash`)
- `knownErrorCode` — `KnownError.code` when the logged error is a KnownError (`TaskFailedWithOutput`, `MISSING_DEPENDENCY`); omitted for plain `Error`s such as spawn/exec failures
- `givenMessage`, `errorMessage`, `errorStack`, `capturedBy`

Captured build or flash output is never sent. It stays in the local
`esp_idf_vsc_ext.log` file, while error messages replace long values with a size
marker (for example `"stdout": "[27431 chars]"`). Before leaving the machine,
`givenMessage`, `errorMessage` and `errorStack` are truncated (1000 and 4000
characters) and home-directory paths are replaced with `~` so user names are not
reported.
