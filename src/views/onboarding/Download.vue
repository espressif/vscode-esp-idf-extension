<template>
    <div id="download-window">
        <transition name="fade" mode="out-in">
            <div v-if="selected === 'empty'">
                <router-link to='/' class="arrow go-back right" v-on:click.native="updateChecksView(false)"></router-link>
                <h4>{{msge}}</h4>
                <label for="idf-version-select">Select ESP-IDF version:</label>
                <br> <br>
                <select v-model="selectedIdfVersion">
                    <option v-for="ver in idfVersionList" :key="ver.name" :value="ver">
                        {{ ver.name }}
                    </option>
                </select>
                <br><br>
                <div v-if="selectedIdfVersion && selectedIdfVersion.filename === 'manual'">
                    <label>Enter ESP-IDF directory</label>
                    <br><br>
                    <input type="text" class="text-size" v-model="idfPath" @input="launchCheckPath">
                    <font-awesome-icon :icon="folderIcon" class="open-icon" 
                        @mouseover="folderIcon='folder-open'"
                        @mouseout="folderIcon='folder'"
                        v-on:click="openFolder"/>
                    <br>
                    <button v-on:click="launchCheckPath" class="check-button">Click here to check if is valid</button>
                    <div v-if="showIdfPathCheck">
                        <div class="check-element">
                            <font-awesome-icon
                                icon="check"
                                v-if="doesIdfPathExist"
                                class="check-icon"
                            />
                            <font-awesome-icon
                                icon="times"
                                v-else
                                class="check-icon"
                            />
                            <p class="text-size">idf.py exists on the path. Detected ESP-IDF version: {{ idfVersion }}</p>
                        </div>
                        <div v-if="doesIdfPathExist">
                            <router-link to='/toolsetup' class="check-button" v-on:click.native="saveIdfPath">Go to ESP-IDF Tools setup</router-link>
                        </div>
                    </div>
                </div>
                <div v-else>
                    <label>Select directory to download and install ESP-IDF. <br>(Result directory will be {{ resultingIdfPath }})</label>
                    <br><br>
                    <input type="text" class="text-size" v-model="idfDownloadPath">
                    <font-awesome-icon :icon="folderIcon" class="open-icon" 
                        @mouseover="folderIcon='folder-open'"
                        @mouseout="folderIcon='folder'"
                        v-on:click="openFolder"/>
                    <br>
                    <button v-on:click="downloadEspIdf" class="check-button">Click here to download</button>
                </div>
            </div>
            <div v-if="selected === 'download'">
                <i v-on:click="setSelectedIdfDownloadState('empty')" class="arrow go-back right"></i>
                <h4>ESP-IDF: {{idfDownloadStatus.id}}</h4>
                <div class="progressBar">
                    <p>
                        <span>Downloaded: </span> {{idfDownloadStatus.progress}} {{idfDownloadStatus.progressDetail}}
                    </p>
                    <div v-bind:style="{ width: idfDownloadStatus.progress }"></div>
                </div>
                <div v-if="downloadedPath !== '' && downloadedPath !== 'master'">                    
                    <p v-if="downloadedPath !== 'master'"> ESP-IDF zip file has been downloaded in {{ downloadedPath }}</p>
                    <p v-if="!isIDFZipExtracted"> Extracting {{ downloadedPath }} ...</p>
                </div>
                <div v-if="isIDFZipExtracted">
                    <p> ESP-IDF has been installed in {{ resultingIdfPath }} </p> <br>
                    <router-link to='/toolsetup' class="check-button" v-on:click.native="reset">Go to ESP-IDF Tools setup</router-link>
                </div>
            </div>
        </transition>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IEspIdfLink, IEspIdfStatus } from "./store/types";

@Component
export default class Download extends Vue {
    public msge: string = "Configure ESP-IDF";
    public folderIcon = "folder";
    @State("downloadedIdfZipPath") private storeDownloadedIdfZipPath: string;
    @State("idfDownloadPath") private storeIdfDownloadPath: string;
    @State("idfVersionList") private storeIdfVersionList: IEspIdfLink[];
    @State("selectedIdfVersion") private storeSelectedIdfVersion: IEspIdfLink;
    @State("idfDownloadStatus") private storeIdfDownloadStatus: IEspIdfStatus;
    @State("idfDownloadState") private storeIdfDownloadState: string;
    @State("isIDFZipExtracted") private storeIsIDFZipExtracted: boolean;
    @Mutation private setIdfDownloadPath;
    @Mutation private setSelectedIdfVersion;
    @Mutation private setSelectedIdfDownloadState;
    @Mutation private setIsIDFZipExtracted;
    @Mutation private setDownloadedZipPath;
    @Action("saveIdfPath") private saveIdfPath;
    @Action private downloadEspIdf;
    @Action("openEspIdfFolder") private openFolder;

    // Manual Setup
    @State("doesIdfPathExist") private storeDoesIdfPathExist;
    @State("idfPath") private storeIdfPath: string;
    @State("idfVersion") private storeIdfVersion: string;
    @State("showIdfPathCheck") private storeShowIdfPathCheck: boolean;
    @Mutation private setIdfPath;
    @Mutation("showIdfPathCheck") private updateChecksView;
    @Action("checkIdfPath") private launchCheckPath;

    get idfPath() {
        return this.storeIdfPath;
    }
    set idfPath(newPath: string) {
        this.setIdfPath(newPath);
    }

    get showIdfPathCheck() {
        return this.storeShowIdfPathCheck;
    }
    set showIdfPathCheck(val) {
        this.updateChecksView(val);
    }

    get doesIdfPathExist() {
        return this.storeDoesIdfPathExist;
    }

    get idfVersion() {
        return this.storeIdfVersion;
    }

    get idfDownloadPath() {
        return this.storeIdfDownloadPath;
    }
    set idfDownloadPath(newPath: string) {
        this.setIdfDownloadPath(newPath);
    }

    get idfVersionList() {
        return this.storeIdfVersionList;
    }

    get downloadedPath() {
        return this.storeDownloadedIdfZipPath;
    }

    get resultingIdfPath() {
        const pathSep = navigator.platform.indexOf("Win") !== -1 ? "\\" : "/";
        return this.idfDownloadPath + pathSep + "esp-idf";
    }

    get selectedIdfVersion() {
        return this.storeSelectedIdfVersion;
    }
    set selectedIdfVersion(selectedVersion: IEspIdfLink) {
        this.setSelectedIdfVersion(selectedVersion);
        this.updateChecksView(false);
    }

    get idfDownloadStatus() {
        return this.storeIdfDownloadStatus;
    }

    get selected() {
        return this.storeIdfDownloadState;
    }

    get isIDFZipExtracted() {
        return this.storeIsIDFZipExtracted;
    }

    public reset() {
        this.setIsIDFZipExtracted(false);
        this.setDownloadedZipPath("");
        this.setSelectedIdfDownloadState("empty");
        this.updateChecksView(false);
    }
}
</script>

<style scoped>
    #download-window {
        max-width: 900px;
        margin: auto;
        padding-top: 10%;
        text-align: center;
        color: var(--vscode-editor-foreground);
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
    .check-element {
        display: inline-flex;
    }
    .check-element p {
        width: 28em;
    }
    .check-icon {
        fill: var(--vscode-editor-foreground);
        padding-top: 3%;
        font-size: large;
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
    .open-icon {
        fill: var(--vscode-editor-foreground);
        font-size: large;
        margin-left: 1%;
        cursor: pointer;
    }
    .open-icon:hover {
        fill: var(--vscode-button-hoverBackground);
    }
    .right {
        -webkit-transform: rotate(-135deg);
          transform: rotate(-135deg);
    }
    .text-size {
        width: 60%;
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
</style>
