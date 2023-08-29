<script setup lang="ts">
import { useNewProjectStore } from "./store";
import TemplateList from "../components/templateList.vue";
import { storeToRefs } from "pinia";
import { computed, onMounted } from "vue";
const store = useNewProjectStore();

let {
  hasTemplateDetail,
  selectedFramework,
  selectedTemplate,
  templateDetail,
  templatesRootPath,
} = storeToRefs(store);

const templates = computed(() => {
  if (templatesRootPath && templatesRootPath[selectedFramework.value]) {
    return [templatesRootPath[selectedFramework.value]];
  }
});
const frameworks = computed(() => {
  return Object.keys(templatesRootPath);
});

onMounted(()=> {
  if (templatesRootPath) {
      const frameworks = Object.keys(templatesRootPath);
      store.selectedFramework = frameworks.length ? frameworks[0] : "";
    }
})
</script>

<template>
  <div id="templates-window">
    <div id="sidenav" class="content">
      <div class="select">
        <select v-model="selectedFramework">
          <option v-for="f in frameworks" :key="f" :value="f">
            {{ f }}
          </option>
        </select>
      </div>
      <ul class="templates">
        <TemplateList v-for="cat of templates" :node="cat" :key="cat.name" />
      </ul>
    </div>

    <div id="template-content" class="content">
      <div v-if="hasTemplateDetail" class="has-text-centered">
        <button
          v-if="selectedTemplate.name !== ''"
          v-on:click="store.createProject"
          class="button"
        >
          Create project using template {{ selectedTemplate.name }}
        </button>
      </div>
      <div
        v-if="hasTemplateDetail"
        id="templateDetail"
        v-html="templateDetail"
      ></div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../commons/espCommons.scss";

#templates-window {
  color: var(--vscode-editor-foreground);
  height: 100%;
  padding: 0.5em;
}
ul.templates > li > p:hover {
  color: var(--vscode-button-background);
  cursor: pointer;
}
#template-content {
  margin-left: 30%;
}
#templateDetail {
  margin: 1em;
}
#sidenav {
  height: 90%;
  overflow-y: scroll;
  position: fixed;
  text-align: start;
  width: 30%;
}
ul > li {
  list-style-type: none;
}
.category,
ul > li > p.selectedItem {
  font-weight: 900;
}
li > ul {
  margin-left: 5%;
}

.content h1,
.content h2,
.content h3,
.content h4,
.content h5,
.content h6,
.content table thead th,
.content strong {
  color: var(--vscode-editor-foreground);
}
.content blockquote p {
  strong {
    color: var(--vscode-button-background);
  }
  color: var(--vscode-button-background);
}
</style>
