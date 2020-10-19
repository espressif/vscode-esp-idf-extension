<template>
  <header class="section">
    <div class="container">
      <nav class="level is-mobile">
        <div class="level-left">
          <div class="level-item">
            <h1 class="title is-size-5-mobile">
              <strong>ESP-IDF</strong>
              <span>Partition Table Editor</span>
            </h1>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <p class="buttons are-small">
              <button class="button">
                <span class="icon is-small">
                  <i class="fas fa-tools"></i>
                </span>
                &nbsp; Build &amp; Flash
              </button>
              <button class="button" title="Retry" @click="initDataRequest">
                <span class="icon is-small">
                  <i class="fas fa-redo"></i>
                </span>
              </button>
            </p>
          </div>
        </div>
      </nav>
      <p class="subtitle is-size-6-mobile">
        Partition Editor can help you to easily edit, build &amp; flash
        partition table through GUI, without interacting directly with the csv
        files.
      </p>
    </div>
  </header>
</template>

<script lang="ts">
import Vue from "vue";
import Component from "vue-class-component";
import { Action } from "vuex-class";
@Component
export default class Header extends Vue {
  @Action initDataRequest;
}
</script>
