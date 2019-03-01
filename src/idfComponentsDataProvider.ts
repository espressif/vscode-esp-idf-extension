import { EventEmitter, TreeDataProvider, TreeItem } from "vscode";
import * as vscode from "vscode";
import { IdfComponent } from "./idfComponent";
import * as idfConf from "./idfConfiguration";
import { LocDictionary } from "./localizationDictionary";
import * as utils from "./utils";
const locDic = new LocDictionary("idfComponentsDataProvider");

export class IdfTreeDataProvider implements TreeDataProvider<IdfComponent> {

    private OnDidChangeTreeData: EventEmitter<IdfComponent | undefined> = new EventEmitter<IdfComponent | undefined>();
    // tslint:disable-next-line:member-ordering
    public readonly onDidChangeTreeData: vscode.Event<IdfComponent | undefined> = this.OnDidChangeTreeData.event;

    private projectDescriptionJsonPath: string;
    private currentWorkspaceUri: vscode.Uri;

    constructor(projectDescriptionPath: string, workspace: vscode.Uri) {
        this.projectDescriptionJsonPath = projectDescriptionPath;
        this.currentWorkspaceUri = workspace;
    }

    public refresh(projectDescriptionPath: string, workspace: vscode.Uri): void {
        this.projectDescriptionJsonPath = projectDescriptionPath;
        this.currentWorkspaceUri = workspace;
        this.OnDidChangeTreeData.fire();
    }

    public getTreeItem(element: IdfComponent): TreeItem {
        /* return {
            resourceUri: element.uri,
            collapsibleState: element.isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : void 0,
            command: element.isDirectory ? void 0 : {
                command: 'extension.openComponent',
                arguments: [element.uri],
                title: 'Open IDF component'
            }
        }; */
        return element;
    }

    public getChildren(element?: IdfComponent): Thenable<IdfComponent[]> {
        // let components: IdfComponent[] = utils.readDirSync(element.uri);

        return new Promise((resolve) => {
            if (element) {
                resolve(utils.readDirSync(element.uri.fsPath));
            } else {
                resolve(this.getComponentsInProject());
            }
        });

    }

    private getComponentsInProject(): IdfComponent[] {
        if (utils.fileExists(this.projectDescriptionJsonPath)) {
            const componentsList: IdfComponent[] = [];
            const userComponentsList: IdfComponent[] = [];
            const projDescJson = JSON.parse(utils.readFileSync(this.projectDescriptionJsonPath));

            const defaultComponentsDir = idfConf.readParameter("idf.espIdfPath", this.currentWorkspaceUri);

            if (Object.prototype.hasOwnProperty.call(projDescJson, "build_component_paths")) {
                for (let i = 0; i < projDescJson.build_component_paths.length; i++) {
                    const element: IdfComponent = new IdfComponent(
                        projDescJson.build_components[i],
                        vscode.TreeItemCollapsibleState.Collapsed,
                        vscode.Uri.file(projDescJson.build_component_paths[i]).with({ scheme: "vscode-resource"}));

                    if (element.uri.fsPath.startsWith(defaultComponentsDir)) {
                        componentsList.push(element);
                    } else {
                        userComponentsList.push(element);
                    }
                }
            }
            const sortedUserList = userComponentsList.sort((a, b) => (a.label > b.label ? 1 : -1));
            const sortedDefaultList = componentsList.sort((a, b) => (a.label > b.label ? 1 : -1));

            return sortedUserList.concat(sortedDefaultList);
        } else {
            vscode.window.showErrorMessage(locDic.localize("idfComponentDataProvider.proj_desc_not_found",
                 "File project_description.json cannot be found."));
            return null;
        }
    }

}
