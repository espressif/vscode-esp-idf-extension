<template>
  <div class="section">
    <div class="control centerize">
      <h2 class="title is-spaced">{{ title }}</h2>
      <h4 class="subtitle is-spaced">{{ fileName }}</h4>
    </div>

    <div class="field level">
      <div class="level-left align-flex-end">
        <div class="level-item">
          <div class="field">
            <div class="control">
              <label class="label is-small">New Element</label>
            </div>
            <div class="control">
              <div class="select">
                <select v-model="elementToAdd">
                  <option v-for="el in emptyElements" :key="el.id" :value="el">
                    {{ el.title }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div class="level-item">
          <div class="field">
            <div class="control">
              <button class="button" @click="addElement">
                {{ add }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="level-right">
        <div class="level-item">
          <div class="field">
            <div class="control">
              <button class="button" @click="saveChanges">{{ save }}</button>
            </div>
          </div>
        </div>
        <div class="level-item">
          <div class="field">
            <div class="control">
              <button class="button" @click="requestInitValues">
                {{ cancel }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="notification">
      <CMakeElem
        v-for="elem in elements"
        :key="elem.id"
        :el="elem"
        @delete="deleteElem(i)"
      ></CMakeElem>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import { CmakeListsElement } from "../../cmake/cmakeListsElement";
import CMakeElem from "./components/CMakeListsElement.vue";

@Component({
  components: {
    CMakeElem,
  },
})
export default class CMakeListsEditor extends Vue {
  @State("elements") private storeElements: CmakeListsElement[];
  @State("emptyElements") private storeEmptyElements: CmakeListsElement[];
  @State("fileName") private storeFileName: string;
  @State("selectedElementToAdd") storeSelectedElementToAdd: CmakeListsElement;
  @State("textDictionary") private storeTextDictionary;
  @Action private requestInitValues: () => void;
  @Action private saveChanges: () => void;
  @Mutation setSelectedElementToAdd: (el: CmakeListsElement) => void;

  get add() {
    return this.storeTextDictionary.add;
  }
  get elements() {
    return this.storeElements;
  }
  get fileName() {
    return this.storeFileName;
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

  get emptyElements() {
    return this.storeEmptyElements;
  }

  get elementToAdd() {
    return this.storeSelectedElementToAdd;
  }
  set elementToAdd(el: CmakeListsElement) {
    this.setSelectedElementToAdd(el);
  }

  addElement() {
    this.storeElements.push(this.elementToAdd);
  }

  deleteElem(i: number) {
    this.storeElements.splice(i, 1);
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

.delete:hover {
  background-color: var(--vscode-button-background);
}

.align-flex-end {
  align-items: flex-end;
}
</style>
