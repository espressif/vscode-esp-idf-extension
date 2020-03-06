<template>
    <transition name="fade" mode="out-in">
        <div id="previous-window">
                <router-link to="/" class="arrow go-back right"></router-link>
                <label for="idf-version-select">Select ESP-IDF version:</label>
                <br> <br>
                <select v-model="selectedIdfMetadata" id="idf-version-select" @change="getPyVenvIdfTools">
                    <option v-for="ver in idfVersionsMetadata" :key="ver.id" :value="ver">
                        {{ ver.path }}
                    </option>
                </select>
                <br><br>
                <div v-if="venvVersionsMetadata && venvVersionsMetadata.length > 0">
                    <label for="python-version-select">Python version:</label>
                    <select v-model="selectedVenvMetadata" @change="setPreviousIsValid(false)">
                        <option v-for="env in venvVersionsMetadata" :key="env.id" :value="env">
                            {{ env.path }}
                        </option>
                    </select>
                    <br><br>
                    <div v-if="toolsInMetadata && toolsInMetadata.length > 0">
                        <div v-for="tool in toolsInMetadata" :key="tool.id" class="toolsMetadata">
                            <label :for="tool.id">Tool: {{tool.name}} Version: {{tool.version}}</label> 
                            <br><br>
                            <input type="text" v-model="tool.path" :id="tool.id" @change="setPreviousIsValid(false)" @keydown="setPreviousIsValid(false)">
                            <br><br>
                        </div>
                        <button v-on:click="checkAreValid" class="check-button">Check tools are valid</button>
                        <p v-if="previousIsValid"> All tools are correct.</p>
                        <button 
                            v-if="previousIsValid"
                            v-on:click="saveSettings"
                            class="check-button">
                            Save settings
                        </button>
                    </div>
                </div>
        </div>
    </transition>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { IPath, ITool } from "../../ITool";

@Component
export default class UsePrevious extends Vue {
    @State("idfVersionsMetadata") private storeIdfVersionsMetadata: IPath[];
    @State("selectedIdfMetadata") private storeSelectedIdfMetadata: IPath;
    @State("venvVersionsMetadata") private storeVenvVersionsMetadata: IPath[];
    @State("selectedVenvMetadata") private storeSelectedVenvMetadata: IPath;
    @State("toolsInMetadata") private storeToolsInMetadata: ITool[];
    @State("previousIsValid") private storePreviousIsValid: boolean;
    @Action("checkPreviousAreValid") private checkAreValid;
    @Action("getPyVenvIdfToolsForVersion") private getPyVenvIdfTools;
    @Action("savePreviousSettings") private saveSettings;
    @Mutation private setPreviousIsValid;
    @Mutation private setSelectedEspIdfVersionMetadata;

    get idfVersionsMetadata() {
        return this.storeIdfVersionsMetadata;
    }

    get selectedIdfMetadata() {
        return this.storeSelectedIdfMetadata;
    }

    get venvVersionsMetadata() {
        return this.storeVenvVersionsMetadata;
    }

    get selectedVenvMetadata() {
        return this.storeSelectedVenvMetadata;
    }
    set selectedVenvMetadata(val) {
        // tslint:disable-next-line:no-console
        console.log(val);
        this.setSelectedEspIdfVersionMetadata(val);
    }

    get toolsInMetadata() {
        return this.storeToolsInMetadata;
    }

    get previousIsValid() {
        return this.storePreviousIsValid;
    }

    public changeSelectedIdfPath(e) {
        this.getPyVenvIdfTools();
        this.setPreviousIsValid(false);
    }
}
</script>

<style scoped>
    #previous-window {
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
    .toolsMetadata input {
        width: -webkit-fill-available;
    }
</style>