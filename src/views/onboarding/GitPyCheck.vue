<template>
  <section id="git-py-check" class="section">
    <div class="container centerize">
      <router-link
        to="/"
        class="arrow go-back right"
        @click.native="setPythonSysIsValid(false)"
      ></router-link>
      <h4 class="title">Select Python version to use</h4>
      <label class="label">Git version: {{ gitVersion }}</label>
      <p v-if="gitVersion === 'Not found'">
        Please install <a href="https://git-scm.com/downloads">Git</a> and
        reload this window.
      </p>
      <div class="field">
        <label for="python-version-select" class="label"
          >Python version:
        </label>
        <div class="control">
          <select
            v-model="selectedPythonVersion"
            id="python-version-select"
            @change="setPythonSysIsValid(false)"
            class="select"
          >
            <option v-for="ver in pyVersionList" :key="ver" :value="ver">
              {{ ver }}
            </option>
          </select>
        </div>
      </div>
      <p v-if="pyVersionList && pyVersionList[0] === 'Not found'">
        Please install <a href="https://www.python.org/downloads">Python</a> and
        reload this window.
      </p>
      <div
        v-if="selectedPythonVersion === pyVersionList[pyVersionList.length - 1]"
        class="field"
      >
        <label class="label"
          >Enter absolute python binary path to use. Example:
          {{ winRoot }}/Users/name/python<span v-if="winRoot !== ''"
            >.exe</span
          ></label
        >
        <div class="control">
          <input
            type="text"
            class="input"
            v-model="manualPythonPath"
            placeholder="Enter your absolute python binary path here"
          />
        </div>
      </div>
      <div class="field is-grouped is-grouped-centered">
        <div class="control">
          <router-link v-if="pythonPathIsValid" to="/download" class="button"
            >Configure ESP-IDF</router-link
          >
          <button
            v-if="!pythonPathIsValid"
            v-on:click="savePyBin"
            class="button"
          >
            Check Python path exists
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import Vue from "vue";
import { Component } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class GitPyCheck extends Vue {
  @State("gitVersion") private storeGitVersionList;
  @State("pyVersionList") private storePythonVersionList;
  @State("pythonSysPathIsValid") private pythonPathIsValid;
  @State("selectedPythonVersion") private storeSelectedPythonVersion;
  @Mutation private setSelectedPythonVersion;
  @Mutation private setPythonSysIsValid;
  private manualPythonPath = "";
  @Action private savePythonToUse;

  get gitVersion() {
    return this.storeGitVersionList;
  }

  get winRoot() {
    return navigator.platform.indexOf("Win") !== -1 ? "C:" : "";
  }

  get pyVersionList() {
    return this.storePythonVersionList;
  }

  get selectedPythonVersion() {
    return this.storeSelectedPythonVersion;
  }
  set selectedPythonVersion(newVal: string) {
    this.setSelectedPythonVersion(newVal);
  }
  public savePyBin() {
    if (
      this.selectedPythonVersion ===
      this.pyVersionList[this.pyVersionList.length - 1]
    ) {
      this.savePythonToUse(this.manualPythonPath);
    } else {
      this.savePythonToUse(this.selectedPythonVersion);
    }
  }
}
</script>

<style></style>
