<template>
  <div class="section">
    <div class="control centerize">
      <h2 class="title is-spaced">{{ title }}</h2>
    </div>

    <div class="field level">
      <div class="level-left align-flex-end">
        <div class="level-item"></div>
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
      <label :for="keyToAdd" class="label">Enter new profile configuration name</label>
      <div class="field">
        <div class="control">
          <input
            type="text is-small"
            v-model="keyToAdd"
            class="input"
            @keyup.enter="addElement"
          />
        </div>
      </div>
      <div class="field">
        <div class="control">
          <button class="button" @click="addElement">
            {{ add }}
          </button>
        </div>
      </div>
    </div>

    <projectConfElem
      v-for="confKey in Object.keys(elements)"
      :key="confKey"
      :el.sync="elements[confKey]"
      :title="confKey"
      @delete="deleteElem(confKey)"
    ></projectConfElem>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import projectConfElem from "./components/projectConfElem.vue";
import { ProjectConfElement } from "../..//project-conf/projectConfiguration";

@Component({
  components: {
    projectConfElem,
  },
})
export default class ProjectConfigEditor extends Vue {
  @State("elements") private storeElements: {
    [key: string]: ProjectConfElement;
  };
  @State("textDictionary") private storeTextDictionary;
  @Action private requestInitValues: () => void;
  @Action private saveChanges: () => void;
  @Mutation private addNewConfigToList: (confKey: string) => void;
  private keyToAdd: string = "";

  get add() {
    return this.storeTextDictionary.add;
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

  get elements() {
    return this.storeElements;
  }

  addElement() {
    this.addNewConfigToList(this.keyToAdd);
    this.keyToAdd = "";
  }

  deleteElem(k: string) {
    this.$delete(this.storeElements, k);
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
