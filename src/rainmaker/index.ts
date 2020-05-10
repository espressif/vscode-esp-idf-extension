import { TreeDataProvider, TreeItem, commands } from "vscode";
import { ESP } from "../config";
const { executeCommand } = commands;

class ESPRainmakerTreeDataItem extends TreeItem {}

export class ESPRainMakerTreeDataProvider
  implements TreeDataProvider<ESPRainmakerTreeDataItem> {
  constructor() {
    executeCommand(
      "setContext",
      ESP.Rainmaker.USER_ALREADY_LOGGED_IN_CACHE_KEY,
      true
    );
  }
  getTreeItem(item: ESPRainmakerTreeDataItem): ESPRainmakerTreeDataItem {
    return item;
  }
  getChildren(parent?: ESPRainmakerTreeDataItem): [ESPRainmakerTreeDataItem] {
    return [new ESPRainmakerTreeDataItem("Connect to Rainmaker Server")];
  }
}
