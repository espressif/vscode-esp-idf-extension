# Project configuration editor

To allow the user to have multiple configurations for the same project, the user can define several settings to produce different build result.
Use the [ESP-IDF CMake Multiple configuration example](https://github.com/espressif/esp-idf/tree/master/examples/build_system/cmake/multi_config) and follow this tutorial.

Use the `ESP-IDF: Project configuration editor` to modify `esp-idf.toml` to record the following settings for each configuration:

`idf.cmakeCompilerArgs`
`idf.ninjaArgs`
`idf.buildPath`
`idf.sdkconfigDefaults`

`idf.customExtraVars`
`idf.adapterTargetName`
`idf.customAdapterTargetName`

`idf.openOcdDebugLevel`
`idf.openOcdConfigs`
`idf.openOcdLaunchArgs`

`idf.customTask`
`idf.preBuildTask`
`idf.postBuildTask`
`idf.preFlashTask`
`idf.postFlashTask`

The `esp-idf.toml` consists of the following elements, where `NEW_ITEM` represent each configuration:

```toml
[NEW_ITEM]
flashBaudRate = "115200"
idfTarget = "esp32s2"
customIdfTarget = "" #In case idfTarget = "custom"

  [NEW_ITEM.build]
  compileArgs = [ "-g", "ninja" ]
  ninjaArgs = [ "-j", "8" ]
  buildDirectoryPath = "${workspaceFolder}/product_ILI_build"

  [NEW_ITEM.openOCD]
  args = [ ] # Arguments for OpenOCD execution
  configs = [ ] # Configuration files for OpenOCD
  debugLevel = 0 # from 0 to 4 OpenOCD Debug Level

  [NEW_ITEM.tasks]
  preBuild = "" # Enter a command or script that can be executed in terminal here
  preFlash = "ls -l"
  postBuild = ""
  postFlash = ""

  [NEW_ITEM.env]
  ENV_VARIABLE = "value"
```