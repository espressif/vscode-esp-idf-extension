<template>
  <div id="app">
    <Header />
    <div class="section no-padding-top">
      <div class="container is-mobile">
        <SizeFilter />
        <div v-if="isOverviewEnabled">
          <Overview />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import Header from "./components/Header.vue";
import SizeFilter from "./components/SizeFilter.vue";
import Overview from "./components/Overview.vue";
import { Action, State } from "vuex-class";

@Component({
  components: {
    Header,
    Overview,
    SizeFilter,
  },
})
export default class App extends Vue {
  @Action requestInitialValues: Function;
  @State("isOverviewEnabled") storeIsOverviewEnabled: boolean;

  get isOverviewEnabled() {
    return this.storeIsOverviewEnabled;
  }

  mounted() {
    this.requestInitialValues();
  }
}
</script>

<style></style>
