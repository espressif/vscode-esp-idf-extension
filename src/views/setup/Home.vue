<template>
  <div id="home">
    <div class="centerize" v-if="!hasPrerequisites">
      <p>
        Before using this extension,
        <a href="https://git-scm.com/downloads">Git</a>
        and
        <a href="https://www.python.org/downloads">Python</a> are required.
        <br />Please read
        <a
          href="https://docs.espressif.com/projects/esp-idf/en/latest/get-started/index.html#step-1-install-prerequisites"
          >ESP-IDF Prerequisites.</a
        >
      </p>
      <p v-if="isNotWinPlatform">
        <a href="https://cmake.org/download/">CMake</a> and
        <a href="https://github.com/ninja-build/ninja/releases">Ninja</a> are
        required in environment PATH.
      </p>
    </div>
    <div class="centerize" v-if="hasPrerequisites">
      <div class="field install-btn">
        <div class="control">
          <router-link to="/autoinstall" class="button">Start</router-link>
        </div>
      </div>

      <div class="field install-btn">
        <div class="control">
          <router-link to="/status" class="button">Status</router-link>
        </div>
      </div>

      <div class="field install-btn">
        <div class="control">
          <button v-on:click.once="useDefaultSettings" class="button">
            Use existing ESP-IDF setup
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";

@Component
export default class Home extends Vue {
  @Action requestInitialValues;
  @Action useDefaultSettings;
  @State("hasPrerequisites") private storeHasPrerequisites: boolean;

  get hasPrerequisites() {
    return this.storeHasPrerequisites;
  }

  get isNotWinPlatform() {
    return navigator.platform.indexOf("Win") < 0;
  }

  mounted() {
    this.requestInitialValues();
  }
}
</script>

<style>
.centerize {
  align-items: center;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.expanded {
  width: 70%;
  align-items: center;
  display: flex;
  justify-content: center;
}

.install-btn {
  margin: 0.5em;
}
</style>
