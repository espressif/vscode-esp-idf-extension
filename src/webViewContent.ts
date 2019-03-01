import * as path from "path";
import * as vscode from "vscode";
import { LocDictionary } from "./localizationDictionary";
const locDic = new LocDictionary("webViewContent");

export function createHtmlConfig(extensionPath: string, curWorkspaceFolder: vscode.Uri): string {
    const layoutCss = vscode.Uri.file(
        path.join(extensionPath, "menuconfig", "css", "layout.css")).with({ scheme: "vscode-resource"});
    const initJs = vscode.Uri.file(
        path.join(extensionPath, "menuconfig", "init.js")).with({ scheme: "vscode-resource"});
    const requireJs = vscode.Uri.file(
        path.join(extensionPath, "menuconfig", "js", "lib", "require.js")).with({ scheme: "vscode-resource"});
    const infoIcon = vscode.Uri.file(
        path.join(extensionPath, "menuconfig", "assets", "info.png")).with({ scheme: "vscode-resource"});

    const currentWorkspace = curWorkspaceFolder.with({ scheme: "vscode-resource"});

    // Localization of buttons
    const saveButton = locDic.localize("webviewContent.saveMessage",
        "Save changes");
    const cancelButton = locDic.localize("webviewContent.cancelMessage",
    "Cancel changes");
    const setDefaultButton = locDic.localize("webviewContent.setDefaultMessage",
        "Set default");

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GUI Menuconfig</title>
        <link type="text/css" rel="stylesheet" href="${layoutCss}" media="screen,projection"/>
    </head>
    <body>

    <svg version="1.1" xmlns="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink" style="display: none" xml:space="preserve">
        <defs>
        <g id="expanded">
            <path d="M16 16h-16l16-16z"></path>
        </g>
        <g id="collapsed">
            <path d="M36.068,20.176l-29-20C6.761-0.035,6.363-0.057,6.035,0.114C5.706,0.287,5.5,0.627,5.5,0.999v40
            c0,0.372,0.206,0.713,0.535,0.886c0.146,0.076,0.306,0.114,0.465,0.114c0.199,0,0.397-0.06,0.568-0.177l29-20
            c0.271-0.187,0.432-0.494,0.432-0.823S36.338,20.363,36.068,20.176z"/>
        </g>
        </defs>
    </svg>

    <div class="errorWindow" style="display: none;" data-bind="visible: configCurrentState() === 'error'">
        <p>An error has occured with confserver subprocess communication.</p>
    </div>

    <div class="loadingWindow" data-bind="visible: configCurrentState() === 'loading'">
        <div class="loader"></div>
    </div>
    <div class="window" style="display: none;" data-bind="visible: configCurrentState() === 'initialized'">
        <div id="topbar">
            <div class="buttons-bar">
                <button class="button-vscode" data-bind="click: saveConfChanges">${saveButton}</button>
                <button class="button-vscode" data-bind="click: resetConf">${cancelButton}</button>
                <button class="button-vscode" data-bind="click: setDefaultConf">${setDefaultButton}</button>
                <form style="display: inline-block">
                    <input type="search" name="search" placeholder="Search parameter"
                        data-bind="value: query, valueUpdate: 'keyup'" autocomplete="off" class="form-control"/>
                </form>
            </div>
        </div>

        <div class="guiconfig-body">
            <!-- Sidebar -->
                <ul class="sidenav" data-bind="foreach: configMenues">
                    <li data-bind="css: { selectedSection: $parent.selectedMenuSection() == $data.title()}">
                        <div style="display:flex; align-items: center; margin-bottom: -5%;">
                        <!-- ko if: ($data.menuChildren() && $data.menuChildren() > 0) -->
                            <svg viewBox="0 0 32 32"
                                data-bind="visible: $data.sideNavIsCollapsed(), click: collapseSideNav">
                                <use xlink:href="#collapsed"></use>
                            </svg>
                            <svg viewBox="0 0 32 32" class="expanded"
                                data-bind="visible: !$data.sideNavIsCollapsed(), click: collapseSideNav">
                                <use xlink:href="#expanded"></use>
                            </svg>
                        <!-- /ko -->
                            <p href="#" data-bind="value: $data.title, click: $parent.goToSection, text: title"></p>
                        </div>
                        <!-- ko if: ($data.submenues().length > 0) -->
                            <div class="menu-section"
                        data-bind="css: {'sidenav-section': $data.sideNavIsCollapsed()}">
                            <ul data-bind="foreach: submenues">
                                <!-- ko if: ($data.selectedType() === "menu" && $data.isMenuVisible())-->
                                <li class="sidenav-submenu"
                                    data-bind="css: { selectedSection: $root.selectedMenuSection() == $data.title()}">
                                    <p href="#"
                                        data-bind="value: $data.nameId, click: $root.goToSection, text: $data.title()">
                                    </p>
                                </li>
                                <!-- /ko -->
                            </ul>
                            </div>
                        <!-- /ko -->
                    </li>
                </ul>
            <!-- End of Sidebar -->

            <form class= "another">
                <!-- ko foreach: searchResults -->
                <div class="menu-section"
                    data-bind="attr: { id : $data.nameId }, css: {'openedSection': !isCollapsed()}">
                        <h2 data-bind="text: title, click: collapse"></h2>
                        <kconfig-submenu params='submenues: $data.submenues, helpIcon: "${infoIcon}"'>
                        </kconfig-submenu>
                </div>
                <!-- /ko -->

                <!-- ko if: searchResults().length < 1 -->
                <div id="compList">
                    <!-- ko foreach: { data: configMenues, afterRender: requestInitValues } -->
                    <div class="menu-section"
                        data-bind="attr: { id : $data.nameId }, css: {'openedSection': !isCollapsed()}">
                            <h2 data-bind="text: title, click: collapse"></h2>
                            <kconfig-submenu params='submenues: $data.submenues, helpIcon: "${infoIcon}"'>
                            </kconfig-submenu>
                    </div>
                    <!-- /ko -->
                </div>
                <!-- /ko -->
            </form>
        </div>

        <script>
            workspaceFolder = "${currentWorkspace}";
        </script>

        <script data-main="${initJs}" src="${requireJs}"></script>
    </div>
    </body>
</html>`;

}
