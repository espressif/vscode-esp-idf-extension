<template>
  <div>
    <Header :title="title" :subtitle="subtitle" @save="save" />
    <boards>
      <board
        v-for="(b, i) in boards"
        :key="i"
        :name="b.name"
        :description="b.description"
      />
    </boards>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, State } from "vuex-class";

import Header from "./components/Header.vue";
import Boards from "./components/Boards.vue";
import Board from "./components/Board.vue";

@Component({
  components: {
    Header,
    Boards,
    Board,
  },
})
export default class OpenOCDBoardManagerApp extends Vue {
  title = "OpenOCD Board Manager";
  subtitle =
    "Please select the board for open-ocd, board selected here will be saved only in this project's scope.";
  @State boards;
  save() {
    console.log("save");
  }
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";
</style>
