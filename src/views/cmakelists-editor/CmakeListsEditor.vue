<script setup lang="ts">
import { storeToRefs } from "pinia";
import { onMounted } from "vue";
import { useCMakeListsEditorStore } from "./store";
import CmakeListsElement from "./components/CMakeListsElement.vue";

const store = useCMakeListsEditorStore();
let {
  emptyElements,
  fileName,
  selectedElementToAdd,
  textDictionary,
} = storeToRefs(store);

onMounted(() => {
  store.requestInitValues();
});

function getElementKey(title: string, index: number) {
  return `${title.replace(/\s/g, "_")}_${index}`;
}

function deleteElem(i: number) {
  store.elements.splice(i, 1);
}
</script>

<template>
  <div class="section">
    <div class="control centerize">
      <h2 class="title is-spaced">{{ textDictionary.title }}</h2>
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
                <select v-model="selectedElementToAdd">
                  <option v-for="el in emptyElements" :value="el">
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
              <button
                class="button"
                @click="store.addEmptyElement"
              >
                {{ textDictionary.add }}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="level-right">
        <div class="level-item">
          <div class="field">
            <div class="control">
              <button class="button" @click="store.saveChanges">
                {{ textDictionary.save }}
              </button>
            </div>
          </div>
        </div>
        <div class="level-item">
          <div class="field">
            <div class="control">
              <button class="button" @click="store.requestInitValues">
                {{ textDictionary.discard }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="notification">
      <CmakeListsElement
        v-for="(elem, i) in store.elements"
        :key="getElementKey(elem.title, i)"
        :el="elem"
        @delete="deleteElem(i)"
      ></CmakeListsElement>
    </div>
  </div>
</template>

<style lang="scss">
@import "../commons/espCommons.scss";
.centerize {
  align-items: center;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.delete:hover,
.icon:hover svg {
  background-color: var(--vscode-button-background);
}

.align-flex-end {
  align-items: flex-end;
}
</style>
