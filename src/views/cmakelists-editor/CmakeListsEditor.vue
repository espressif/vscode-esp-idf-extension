<template>
  <div class="section">
    <div class="control centerize">
      <h2 class="title is-spaced">{{ title }}</h2>
    </div>

    <div class="field is-grouped" id="editor-btns">
      <div class="control">
        <button class="button" @click="saveChanges">{{ save }}</button>
      </div>
      <div class="control">
        <button class="button" @click="requestInitValues">
          {{ cancel }}
        </button>
      </div>
    </div>
    <div class="notification">
      <CMakeElem v-for="elem in elements" :key="elem.id" :el="elem"></CMakeElem>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, State } from "vuex-class";
import { CmakeListsElement } from "../../cmake/cmakeListsElement";
import CMakeElem from "./components/CMakeListsElement.vue";

@Component({
  components: {
    CMakeElem,
  },
})
export default class CMakeListsEditor extends Vue {
  @State("elements") private storeElements: CmakeListsElement[];
  @State("textDictionary") private storeTextDictionary;
  @Action private requestInitValues;
  @Action private saveChanges;

  get elements() {
    return this.storeElements;
  }
  get save() {
    return this.storeTextDictionary.save;
  }
  get cancel() {
    return this.storeTextDictionary.discard;
  }
  get title() {
    return this.storeTextDictionary.title;
  }

  private mounted() {
    this.requestInitValues();
  }
}
</script>

<style lang="scss">
@import "../commons/espCommons.scss";
.centerize {
  align-items: center;
  display: flex;
  flex-direction: column;
  width: 100%;
}

#editor-btns {
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
}
</style>
