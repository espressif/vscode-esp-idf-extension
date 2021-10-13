<template>
  <header class="section">
    <div class="container">
      <nav class="level is-mobile">
        <div class="level-left">
          <div class="level-item">
            <h1 class="title is-size-5-mobile">
              <strong>ESP-IDF</strong>&nbsp;Size Analysis
            </h1>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <p class="buttons are-small">
              <button
                class="button"
                title="Flash"
                v-on:click="flashClicked"
                v-bind:disabled="isFlashing"
              >
                <span class="icon">
                  <iconify-icon icon="symbol-event" />
                </span>
                &nbsp; Flash
              </button>
              <button class="button" title="Retry" @click="retryClicked">
                <span class="icon">
                  <iconify-icon icon="refresh" />
                </span>
              </button>
            </p>
          </div>
        </div>
      </nav>
      <p class="subtitle is-size-6-mobile">
        Size analysis will provide users with in-depth analysis of the binary
        file generated from the project.
      </p>
    </div>
  </header>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, State } from "vuex-class";

@Component
export default class Header extends Vue {
  @Action flashClicked: Function;
  @Action retryClicked: Function;
  @State("isFlashing") storeIsFlashing: boolean;

  get isFlashing() {
    return this.storeIsFlashing;
  }
}
</script>
