<template>
  <div id="app">
    <div
      class="welcome-section"
      v-bind:class="{ 'content-hidden': isNotWelcomePage }"
      v-if="!isNotWelcomePage"
    >
      <div class="content-wrap">
        <ul class="fly-in-text">
          <li>ESPRESSIF</li>
        </ul>
        <p>
          Before using this extension,
          <a href="https://git-scm.com/downloads">Git</a>
          and <a href="https://www.python.org/downloads">Python</a> are
          required.
          <br />
          Please read
          <a
            href="https://docs.espressif.com/projects/esp-idf/en/latest/get-started/index.html#step-1-install-prerequisites"
          >
            ESP-IDF Prerequisites.
          </a>
        </p>
        <p v-if="isNotWinPlatform">
          <a href="https://cmake.org/download/">CMake</a> and
          <a href="https://github.com/ninja-build/ninja/releases">Ninja</a> are
          required in environment PATH.
        </p>
        <div>
          <input
            id="showOnboarding"
            v-model="showOnboardingOnInit"
            type="checkbox"
          />
          <label for="showOnboarding">
            Show Onboarding on Visual Studio Code start.
          </label>
          <br /><br />
          <label for="configurationTarget">
            Where to save configuration settings ?
          </label>
          <br />
          <br />
          <select v-model="selectedConfTarget">
            <option value="1">User settings</option>
            <option value="2">Workspace settings</option>
            <option value="3">Workspace folder settings</option>
          </select>
          <br /><br />
          <div v-if="selectedConfTarget === '3'">
            <select v-model="selectedWorkspaceFolder">
              <option v-for="ws in workspaceFolders" :value="ws" :key="ws">
                {{ ws }}
              </option>
            </select>
            <br /><br />
          </div>
          <router-link
            v-on:click.native="initSetup"
            to="/gitpycheck"
            class="onboarding-button"
            >START</router-link
          >
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
  public isNotWelcomePage: boolean = false;
  @State("showOnboardingOnInit") private storeShowOnboardingOnInit: boolean;
  @State("selectedConfTarget") private storeSelectedConfTarget: number;
  @State("workspaceFolders") private storeWorkspaceFolders: string[];
  @State("selectedWorkspaceFolder") private storeSelectedWorkspace: string;
  @Mutation private setShowOnboardingOnInit;
  @Mutation("updateConfTarget") private modifyConfTarget;
  @Mutation private setSelectedWorkspaceFolder;
  @Action private updateConfTarget;
  @Action private updateShowOnboardingOnInit;
  @Action private requestInitValues;

  public initSetup() {
    this.isNotWelcomePage = true;
  }

  get isNotWinPlatform() {
    return navigator.platform.indexOf("Win") < 0;
  }

  get selectedConfTarget() {
    return this.storeSelectedConfTarget;
  }
  set selectedConfTarget(val) {
    console.log(val);
    this.updateConfTarget(val);
    this.modifyConfTarget(val);
  }

  get showOnboardingOnInit(): boolean {
    return this.storeShowOnboardingOnInit;
  }
  set showOnboardingOnInit(val) {
    this.setShowOnboardingOnInit(val);
    this.updateShowOnboardingOnInit(val);
  }

  get workspaceFolders() {
    return this.storeWorkspaceFolders;
  }

  get selectedWorkspaceFolder() {
    return this.storeSelectedWorkspace;
  }
  set selectedWorkspaceFolder(newFolder) {
    this.setSelectedWorkspaceFolder(newFolder);
  }

  private mounted() {
    this.requestInitValues();
  }
}
</script>

<style>
#app {
  max-width: 900px;
  margin: 1% auto 1% auto;
  padding-top: 3%;
  text-align: center;
  cursor: default;
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
.check-icon {
  fill: var(--vscode-editor-foreground);
  padding-top: 5%;
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
.onboarding-button {
  background-color: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  text-decoration: none;
  transition: opacity 0.5s ease 1s;
  border: none;
  cursor: pointer;
  padding: 0.5%;
  margin: 2%;
  vertical-align: super;
}

.onboarding-button:hover {
  background-color: var(--vscode-button-hoverBackground);
  box-shadow: 1px 0 5px var(--vscode-editor-foreground);
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
.right {
  -webkit-transform: rotate(-135deg);
  transform: rotate(-135deg);
}
.text-size {
  width: 60%;
}
.welcome-section {
  font-family: "Open Sans", Arial, sans-serif;
  font-weight: 700;
  overflow: hidden;
}
.welcome-section .content-wrap {
  position: relative;
  left: 50%;
  transform: translate3d(-50%, 0, 0);
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

@media (min-width: 800px) {
  .welcome-section .content-wrap .fly-in-text li {
    font-size: 5em;
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
