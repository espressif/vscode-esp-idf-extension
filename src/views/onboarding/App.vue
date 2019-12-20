<template>
    <div id="app">
        <div class="welcome-section" v-bind:class="{ 'content-hidden': isNotWelcomePage }" v-if="!isNotWelcomePage">
            <div class="content-wrap">
                <ul class="fly-in-text">
                    <li>ESPRESSIF</li>
                </ul>
                <p>Before using this extension, <a href="https://git-scm.com/downloads">Git</a> and <a href="https://www.python.org/downloads">Python</a> are required.</p>
                <p v-if="isNotWinPlatform"><a href="https://cmake.org/download/">CMake</a> and <a href="https://github.com/ninja-build/ninja/releases">Ninja</a> are required in environment PATH.</p>
                <p>Please read <a href="https://docs.espressif.com/projects/esp-idf/en/latest/get-started/index.html#step-1-install-prerequisites"> ESP-IDF Prerequisites.</a></p>
                <router-link  v-on:click.native="initSetup" to='/gitpycheck' class="enter-button">START</router-link>
                <br><br>
                <div>
                    <input id="showOnboarding" v-model="showOnboardingOnInit" type="checkbox" @change="updateShowOnboarding">
                    <label for="showOnboarding"> Show Onboarding on Visual Studio Code start. </label>
                </div>
            </div>
        </div>
        <div class="content-select" v-if="isNotWelcomePage">
            <transition name="fade" mode="out-in">
                <router-view></router-view>
            </transition>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class App extends Vue {
    public isNotWelcomePage: boolean =  false;
    @State("showOnboardingOnInit") private storeShowOnboardingOnInit: boolean;
    @Mutation("showOnboardingOnInit") private setShowOnboardingOnInit;
    @Action private updateShowOnboardingOnInit;
    @Action private requestInitValues;

    public initSetup() {
        this.isNotWelcomePage = true;
    }

    get isNotWinPlatform() {
        return navigator.platform.indexOf("Win") < 0;
    }

    get showOnboardingOnInit(): boolean {
        return this.storeShowOnboardingOnInit;
    }

    public updateShowOnboarding(e) {
        this.setShowOnboardingOnInit(e.target.checked);
        this.updateShowOnboardingOnInit(e.target.checked);
    }

    private mounted() {
        this.requestInitValues();
    }
}
</script>

<style scoped>
    #app {
        max-width: 900px;
        margin: 1% auto 1% auto;
        padding-top: 3%;
        text-align: center;
        cursor: default;
    }
    .welcome-section {
        font-family: 'Open Sans', Arial, sans-serif;
        font-weight: 700;
        overflow: hidden;
    }
    .welcome-section .content-wrap {
        position: relative;
        left: 50%;
        transform: translate3d(-50%,0,0);
    }

    .welcome-section .content-wrap .fly-in-text {
        list-style: none;
    }

    .welcome-section .content-wrap .fly-in-text li {
        display: inline-block;
        margin-right: 30px;
        font-size: 3em;
        color: var(--vscode-editor-foreground);
        opacity: 1;
        transition: all 1s ease;
    }

    .welcome-section .content-wrap .fly-in-text li::last-child(n) {
        margin-right: 0;
    }

    .welcome-section .content-wrap .enter-button {
        background-color: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
        text-decoration: none;
        transition: opacity .5s ease 1s;
        border: none;
        cursor: pointer;
        padding: 0% 0.5%;
    }

    .welcome-section .content-wrap .enter-button:hover {
        background-color: var(--vscode-button-hoverBackground);
        box-shadow: 1px 0 5px var(--vscode-editor-foreground);
    }

    @media (min-width:800px) {
        .welcome-section .content-wrap .fly-in-text li { font-size: 5em; }
    }
   .fade-enter-active, .fade-leave-active {
        transition: opacity 1s;
    }
    .fade-enter, .fade-leave-to {
        opacity: 0;
    }
</style>
