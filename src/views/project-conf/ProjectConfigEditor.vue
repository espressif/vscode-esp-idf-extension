<script setup lang="ts">
import { onMounted } from "vue";
import { useProjectConfStore } from "./store";

const store = useProjectConfStore();

let keyToAdd: string = "";
function addElement() {
  if (keyToAdd !== "") {
    store.addNewConfigToList(keyToAdd);
    keyToAdd = "";
  }
}

function deleteElem(elKey: string) {
  delete store.elements[elKey];
}

onMounted(() => {
  store.requestInitValues();
})
</script>

<template>
  <div class="section">
    <div class="control centerize">
      <h2 class="title is-spaced">{{ store.textDictionary.title }}</h2>
    </div>

    <div class="field level">
      <div class="level-left align-flex-end">
        <div class="level-item"></div>
      </div>

      <div class="level-right">
        <div class="level-item">
          <div class="field">
            <div class="control">
              <button class="button" @click="store.saveChanges">
                {{ store.textDictionary.save }}
              </button>
            </div>
          </div>
        </div>
        <div class="level-item">
          <div class="field">
            <div class="control">
              <button class="button" @click="store.requestInitValues">
                {{ store.textDictionary.discard }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="notification">
      <label :for="keyToAdd" class="label"
        >Enter new profile configuration name</label
      >
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
            {{ store.textDictionary.add }}
          </button>
        </div>
      </div>
    </div>

    <projectConfElem
      v-for="confKey in Object.keys(store.elements).reverse()"
      :key="confKey"
      :el.sync="store.elements[confKey]"
      :title="confKey"
      @delete="deleteElem(confKey)"
    ></projectConfElem>
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

.delete:hover {
  background-color: var(--vscode-button-background);
}

.align-flex-end {
  align-items: flex-end;
}
</style>
