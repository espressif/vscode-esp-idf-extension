<template>
    <div id="tools-setup">
        <transition name="fade" mode="out-in">
            <div id="tools-init" v-if="selected === 'empty'">
                <router-link to='/' class="arrow go-back right"></router-link>
                <h4>Do you want to download the ESP-IDF tools or use existing directories?</h4>
                <button class="check-button" href="#" v-on:click="selectToolsSetup('auto')">Download ESP-IDF Tools</button>
                <button class="check-button" href="#" v-on:click="selectToolsSetup('manual')">Skip ESP-IDF Tools download</button>
            </div>
            <div id="tools-auto-setup" v-if="selected === 'auto'" key="auto">
                <i class="arrow go-back right" v-on:click="selectToolsSetup('empty')"></i>
                <h4>ESP-IDF Tools</h4>
                <p>Define ESP-IDF tools install directory.</p>
                <input type="text" class="text-size" v-model="idfTools">
                <font-awesome-icon :icon="folderIcon" class="open-icon" 
                    @mouseover="folderIcon='folder-open'"
                    @mouseout="folderIcon='folder'"
                    v-on:click="openFolder"/>
                <button v-on:click.once="downloadTools" class="check-button">Download</button>
                <button v-on:click="selectToolsSetup('manual')" class="check-button" v-if="isInstallationCompleted && isPyInstallCompleted">Go to next step</button>
                <div v-for="toolVersion in requiredToolsVersions" :key="toolVersion.id" class="pkg-progress">
                    <div class="progressText">
                        <span>Tool: </span> {{toolVersion.id}} <br />
                        <font-awesome-icon icon="arrow-circle-down" class="check-icon margin-icon" v-if="toolVersion.hasFailed" v-on:click.once="downloadTools"></font-awesome-icon>
                        <span>Version: </span> {{toolVersion.expected}} <br />
                        <span v-if="toolVersion.progress === '100.00%'">
                            <span>Checksum : </span> {{toolVersion.hashResult ? 'OK' : 'Invalid'}}
                        </span>
                        <span v-if="toolVersion.hasFailed">Download again</span>
                    </div>
                    <div class="progressBar">
                        <p v-if="toolVersion.progress !== '100.00%'">
                            <span>Download Status: </span> {{toolVersion.progress}} {{toolVersion.progressDetail}}
                        </p>
                        <div v-bind:style="{ width: toolVersion.progress }" v-if="toolVersion.progress !== '100.00%'"></div>
                        <p v-if="toolVersion.progress === '100.00%' && !isInstallationCompleted">
                            <span>Extracting {{ toolVersion.id }}...</span>
                        </p>
                        <p v-if="toolVersion.progress === '100.00%' && isInstallationCompleted">
                            <span>Installed in </span>
                            {{ idfTools + pathSep + "tools" + pathSep + toolVersion.id + pathSep + toolVersion.expected + pathSep + toolVersion.id}}
                        </p>
                    </div>
                </div>
            </div>
            <div id="tools-manual-setup" v-if="selected === 'manual'" key="manual">
                <i class="arrow go-back right" v-on:click="reset"></i>
                <h4>Verify ESP-IDF Tools</h4>
                <div v-if="!isToolsCheckCompleted">
                    <p>Please specify the directories containing executable binaries for required ESP-IDF Tools: <span class="bold"> |</span>
                        <span v-for="toolVersion in requiredToolsVersions" :key="toolVersion.id" class="bold">
                            {{toolVersion.id}} |
                        </span>
                    </p>
                    <p>Separate each path using ({{pathDelimiter}}).</p>
                    <p>
                        Example: If executable path is {{winRoot}}{{pathSep}}openocd-esp32{{pathSep}}bin{{pathSep}}openocd
                        <span v-if="winRoot !== ''">.exe</span> then use
                        {{winRoot}}{{pathSep}}myToolFolder{{pathSep}}bin{{pathDelimiter}}{{winRoot}}{{pathSep}}anotherToolFolder{{pathSep}}bin
                    </p>
                    <p>Inserted directories will be saved as an extension configuration setting (idf.customExtraPaths) and will not modify your PATH.</p>
                    <input type="text" class="text-size" v-model="exportedPaths">
                    <h4>Custom environment variables to be defined</h4>
                    <div id="env-vars-to-set" v-for="(value, key) in envVars" :key="key" >
                        <div class="env-var">
                            <p>{{key}}</p>
                            <input type="text" class="text-size" v-model="envVars[key]">
                        </div>
                    </div>
                </div>
                
                <div id="tools-check-results" v-if="showIdfToolsChecks">
                    <div class="tool-check-result" v-for="toolCheck in toolsCheckResults" :key="toolCheck.id">
                        <div class="result-description">
                            <p>{{ toolCheck.id }} has been found ?</p>
                            <p class="result-description-small">Expected {{toolCheck.expected}}</p>
                            <p class="result-description-small">Found {{toolCheck.actual}}</p>
                        </div>
                        <font-awesome-icon
                            icon="check"
                            v-if="toolCheck.doesToolExist"
                            class="check-icon"
                        />
                        <font-awesome-icon
                            icon="times"
                            v-else
                            class="check-icon"
                        />
                    </div>
                    <h4> Verify Python packages requirements</h4>
                    <pre id="python-log">{{pyLog}}</pre> <br/>
                </div>
                <button v-on:click="selectToolsSetup('complete')" class="check-button" v-if="isToolsCheckCompleted && isPyInstallCompleted">Go to next step.</button>
                <button v-on:click="checkIdfToolsExists" class="check-button" v-else>Click here to check tools exists.</button>
            </div>

            <div id="tools-complete-setup" v-if="selected === 'complete'" key="complete">
                <h2> ESP-IDF Tools have been configured for this extension of Visual Studio Code.</h2>
                <button class="check-button" href="#" v-on:click="getExamplesList">View ESP-IDF project examples!</button>
            </div>
        </transition>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class ToolsSetup extends Vue {
    public folderIcon = "folder";
    @State("idfToolsPath") private storeIdfToolsPath;
    @State("customExtraPaths") private storeCustomExtraPaths;
    @State("envVars") private storeEnvVars;
    @State("toolsSelectedSetupMode") private storeToolsSelectedSetupMode;
    @State("showIdfToolsChecks") private storeShowIdfToolsChecks;
    @State("toolsCheckResults") private storeToolsCheckResults;
    @State("pathDelimiter") private storePathDelimiter;
    @State("requiredToolsVersions") private storeRequiredToolsVersions;
    @State("isInstallationCompleted") private storeIsInstallationCompleted;
    @State("isPyInstallCompleted") private storeisPyInstallCompleted: string;
    @State("isToolsCheckCompleted") private storeIsToolsCheckCompleted;
    @State("pyLog") private storePyLog: string;

    @Mutation private setCustomExtraPaths;
    @Mutation private setEnvVars;
    @Mutation private setIdfToolsPath;
    @Mutation private setPySetupFinish;
    @Mutation private setShowIdfToolsChecks;
    @Mutation private setToolSetupMode;
    @Mutation private setToolCheckFinish;
    @Mutation private setToolsCheckResults;

    @Action private getExamplesList;
    @Action private getRequiredTools;
    @Action("checkManualExportPaths") private checkIdfToolsExists;
    @Action private downloadTools;
    @Action private saveCustomPathsEnvVars;
    @Action("openToolsFolder") private openFolder;

    get idfTools() {
        return this.storeIdfToolsPath;
    }
    set idfTools(val) {
        this.setIdfToolsPath(val);
    }

    get exportedPaths() {
        return this.storeCustomExtraPaths;
    }
    set exportedPaths(val) {
        this.setCustomExtraPaths(val);
    }

    get envVars() {
        return this.storeEnvVars;
    }
    set envVars(val) {
        this.setEnvVars(val);
    }

    get selected() {
        return this.storeToolsSelectedSetupMode;
    }
    get showIdfToolsChecks() {
        return this.storeShowIdfToolsChecks;
    }
    get toolsCheckResults() {
        return this.storeToolsCheckResults;
    }
    get pathDelimiter() {
        return this.storePathDelimiter;
    }
    get pyLog() {
        return this.storePyLog;
    }
    get requiredToolsVersions() {
        return this.storeRequiredToolsVersions;
    }
    get isInstallationCompleted() {
        return this.storeIsInstallationCompleted;
    }
    get isToolsCheckCompleted() {
        return this.storeIsToolsCheckCompleted;
    }
    get isPyInstallCompleted() {
        return this.storeisPyInstallCompleted;
    }

    get pathSep() {
        return navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
    }

    get winRoot() {
        return navigator.platform.indexOf("Win") !== -1 ? "C:" : "";
    }

    public selectToolsSetup(installType) {
        if (installType === "complete") {
            this.saveCustomPathsEnvVars();
        } else if (installType === "auto" || (this.selected === "empty" && installType === "manual")) {
            this.getRequiredTools();
        }
        this.setToolSetupMode(installType);
    }

    public reset() {
        this.selectToolsSetup("empty");
        this.setToolCheckFinish(false);
        this.setShowIdfToolsChecks(false);
        this.setPySetupFinish(false);
    }
}
</script>

<style scoped>
    #tools-setup {
        max-width: 900px;
        margin: auto;
        padding-top: 10%;
        text-align: center;
        color: var(--vscode-editor-foreground);
    }
    .text-size {
        width: 90%;
    }
    .check-button {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        text-decoration: none;
        margin-top: 2%;
        transition: opacity .5s ease 1s;
        border: none;
        cursor: pointer;
        padding: 0.5% 0.5%;
    }
    .check-button:hover {
        background-color: var(--vscode-button-hoverBackground);
        box-shadow: 1px 0 5px var(--vscode-editor-foreground);
    }
    .fade-enter-active, .fade-leave-active {
        transition: opacity 1s;
    }
    .fade-enter, .fade-leave-to {
        opacity: 0;
    }
    .check-icon {
        fill: var(--vscode-editor-foreground);
        padding-top: 5%;
        font-size: large;
    }
    .open-icon {
        fill: var(--vscode-editor-foreground);
        font-size: large;
        margin-left: 1%;
        cursor: pointer;
    }
    .open-icon:hover {
        fill: var(--vscode-button-hoverBackground);
    }
    .margin-icon {
        margin-left: 5%;
    }
    .tool-check-result {
        display: inline-flex;
        border: 1px solid;
        margin: 1%;
        padding: 0% 2%;
    }
    .tool-check-result .result-description {
        width: 20em;
    }

    .bold {
        font-weight: bold;
    }

    .result-description-small {
        margin-left: 5%;
        white-space: pre-line;
    }

    .pkg-progress {
        margin-top: 3%;
    }

    .progressBar {
        border-radius: 10px;
        padding: 2px;
        overflow: hidden;
    }
    .progressBar p {
        margin: 0%;
        padding-top: 2%;
    }

    .progressBar div {
        background-color: var(--vscode-button-background);
        height: 10px;
        width: 0%;
        border-radius: 7px;
        width: 45%;
    }

    .progressText {
        float: left;
        width: 50%;
    }
    .arrow {
        position: relative;
        display: inline-block;
        vertical-align: middle;
        color: var(--vscode-editor-foreground);
        box-sizing: border-box;
    }
    .arrow:before {
        content: "";
        box-sizing: border-box;
    }
    .arrow:hover {
        color: var(--vscode-button-background);
    }
    .go-back {
        width: 20px;
        height: 20px;
        border-width: 4px 4px 0 0;
        border-style: solid;
        margin: 10px;
        cursor: pointer;
    }
    .go-back:before {
        right: 0;
        top: -3px;
        position: absolute;
        height: 4px;
        box-shadow: inset 0 0 0 32px;
        -webkit-transform: rotate(-45deg);
                transform: rotate(-45deg);
        width: 23px;
        -webkit-transform-origin: right top;
                transform-origin: right top;
    }
    .right {
        -webkit-transform: rotate(-135deg);
          transform: rotate(-135deg);
    }
</style>


