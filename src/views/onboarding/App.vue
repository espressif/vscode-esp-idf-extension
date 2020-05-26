<template>
  <div id="app">
    <transition name="fade" mode="out-in">
      <router-view></router-view>
    </transition>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class App extends Vue {
  @Action private requestInitValues;

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
  width: 40%;
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
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
