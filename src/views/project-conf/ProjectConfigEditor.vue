<template>
  <div class="section">
    <div class="control centerize">
      <h2 class="title is-spaced">{{ title }}</h2>
    </div>

    <div class="field level">
      <div class="level-left align-flex-end">
        <div class="level-item">
          <div class="field">
            <div class="control">
              <label for="" class="label is-small">New element</label>
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
      <projectConfElem
        v-for="(el, i) in elements"
        :key="el.id"
        :el="el"
        @delete="deleteEl(i)"
       ></projectConfElem>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import projectConfElem from "./components/projectConfElem.vue";

@Component({
  components: {
    projectConfElem,
  }
})
export default class ProjectConfigEditor extends Vue {
  @State('elements') private storeElements: projectConfElem[];
  @State("emptyElements") private storeEmptyElements: projectConfElem[];
  @State("selectedElement") private storeSelectedElement: projectConfElem;
  @State("textDictionary") private storeTextDictionary;
  @Action private requestInitValues: () => void;
  @Action private saveChanges: () => void;
  @Mutation setElementToAdd: (el: projectConfElem) => void;

  get add() {
    return this.storeTextDictionary.add;
  }

  get save() {
    return this.storeTextDictionary.save;
  }

  get cancel() {
    return this.storeTextDictionary.cancel;
  }

  get title() {
    return this.storeTextDictionary.title;
  }

  get elements() {
    return this.storeElements;
  }

  get emptyElements() {
    return this.storeEmptyElements;
  }

  get elementToAdd() {
    return this.storeSelectedElement;
  }
  set elementToAdd(el: projectConfElem) {
    this.setElementToAdd(el);
  }

  deleteElem(i: number) {
    this.storeElements.splice(i, 1);
  }

  mounted() {
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