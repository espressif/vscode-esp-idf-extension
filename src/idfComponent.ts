import { Command, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";

export class IdfComponent  extends TreeItem {

    constructor(
        public readonly label: string,
        public readonly collapsibleState: TreeItemCollapsibleState,
        public readonly uri: Uri,
        public readonly command?: Command) {
            super(label, collapsibleState);
        }
}
