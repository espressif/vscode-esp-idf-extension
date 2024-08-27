import * as vscode from "vscode";
import * as yaml from 'js-yaml';

class Component extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly description?: string
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}${this.description ? ` - ${this.description}` : ''}`;
    }
}

export class ComponentsTreeDataProvider implements vscode.TreeDataProvider<Component> {
    private _onDidChangeTreeData: vscode.EventEmitter<Component | undefined | null | void> = new vscode.EventEmitter<Component | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Component | undefined | null | void> = this._onDidChangeTreeData.event;
    private workspaceFolder?: vscode.Uri;

    constructor(workspaceFolder: vscode.Uri | undefined) {
        this.workspaceFolder = workspaceFolder;

        // Watch the idf_component.yml file for changes
        if (workspaceFolder) {
            const idfComponentPath = vscode.Uri.joinPath(this.workspaceFolder, 'main', 'idf_component.yml');
            const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(idfComponentPath, '*'));
            
            watcher.onDidChange(() => this.refresh());
            watcher.onDidCreate(() => this.refresh());
            watcher.onDidDelete(() => this.refresh());
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();  // Trigger UI update for the tree
    }

    getTreeItem(element: Component): vscode.TreeItem {
        return element;
    }

    getChildren(element?: Component): Thenable<Component[]> {
        if (!this.workspaceFolder) {
            vscode.window.showInformationMessage('No workspace folder is open');
            return Promise.resolve([]);
        }

        const idfComponentPath = vscode.Uri.joinPath(this.workspaceFolder, 'main', 'idf_component.yml');

        return vscode.workspace.fs.stat(idfComponentPath).then(
            () => {
                if (!element) {
                    return this.getDependencies(idfComponentPath);
                }
                return Promise.resolve([]);
            },
            () => {
                return Promise.resolve([new Component(
                    'idf_component.yml not found',
                    vscode.TreeItemCollapsibleState.None,
                    'Create this file to define your component dependencies'
                )]);
            }
        );
    }

    private async getDependencies(fileUri: vscode.Uri): Promise<Component[]> {
        try {
            const fileContents = await vscode.workspace.fs.readFile(fileUri);
            const data = yaml.load(fileContents.toString()) as any;

            if (data && data.dependencies) {
                return Object.entries(data.dependencies).map(([dep, version]) => 
                    new Component(`${dep}`, vscode.TreeItemCollapsibleState.None, `${version}`)
                );
            } else {
                return [new Component('No dependencies found', vscode.TreeItemCollapsibleState.None)];
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Error reading idf_component.yml: ${(err as Error).message}`);
            return [new Component('Error reading file', vscode.TreeItemCollapsibleState.None)];
        }
    }
}
