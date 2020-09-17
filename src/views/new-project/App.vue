<template>
  <div id="init">
    <transition name="fade" mode="out-in">
      <router-view />
    </transition>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, State } from "vuex-class";

export default class App extends Vue {}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";
#init {
  cursor: default;
  margin: auto;
  padding-top: 1em;
  text-align: center;
  width: 60%;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 1s;
}
</style>
