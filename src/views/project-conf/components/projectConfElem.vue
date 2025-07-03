<script setup lang="ts">
import { computed } from "vue";
import { ProjectConfElement } from "../../../project-conf/projectConfiguration";
import { useProjectConfStore } from "../store";
import ArrayElement from "./ArrayElement.vue";
import DictionaryElement from "./DictionaryElement.vue";
import SelectElement from "./SelectElement.vue";
import StringElement from "./StringElement.vue";
import IconClose from "../icons/IconClose.vue";

const store = useProjectConfStore();

const props = defineProps<{
  el: ProjectConfElement;
  title: string;
}>();

const openOcdDebugLevelOptions: { name: string; value: number }[] = [
  { name: "Error", value: 0 },
  { name: "Warning", value: 1 },
  { name: "Info", value: 2 },
  { name: "Debug", value: 3 },
  { name: "Verbose", value: 4 },
];

const idfTargets = computed(() => {
  const results = store.idfTargets.map((idfTarget) => {
    return {
      name: idfTarget.label,
      value: idfTarget.target,
    };
  });
  return results;
});

function updateElement(sections: string[], newValue: any) {
  store.updateConfigElement({ confKey: props.title, sections, newValue });
}

function openBuildDir(sections: string[]) {
  store.openBuildPath({ confKey: props.title, sections });
}

function openFilePath(sections: string[]) {
  store.openFilePath({ confKey: props.title, sections });
}

function addValueToArray(sections: string[], newValue: any) {
  store.addValueToConfigElement({
    confKey: props.title,
    sections,
    valueToAdd: newValue,
  });
}

function removeValueFromArray(sections: string[], index: number) {
  store.removeValueFromConfigElement({ confKey: props.title, sections, index });
}
</script>

<template>
  <div class="config-element">
    <div class="config-element-header">
      <h3 class="config-element-title">{{ props.title }}</h3>
      <button class="config-element-delete" @click="$emit('delete')">
        <IconClose />
      </button>
    </div>

    <div class="config-section">
      <h4 class="config-section-title">Build</h4>
      <div class="config-section-content">
        <ArrayElement
          title="Compile arguments"
          :values="props.el.build.compileArgs ? props.el.build.compileArgs : []"
          :sections="['build', 'compileArgs']"
          :addValue="addValueToArray"
          :removeValue="removeValueFromArray"
        />
        <ArrayElement
          title="Ninja arguments"
          :values="props.el.build.ninjaArgs ? props.el.build.ninjaArgs : []"
          :sections="['build', 'ninjaArgs']"
          :addValue="addValueToArray"
          :removeValue="removeValueFromArray"
        />
        <StringElement
          title="Build Directory path"
          :value="
            props.el.build.buildDirectoryPath
              ? props.el.build.buildDirectoryPath
              : ''
          "
          :sections="['build', 'buildDirectoryPath']"
          :updateMethod="updateElement"
          :openMethod="openBuildDir"
        />
        <ArrayElement
          title="sdkconfig defaults"
          :values="
            props.el.build.sdkconfigDefaults
              ? props.el.build.sdkconfigDefaults
              : []
          "
          :sections="['build', 'sdkconfigDefaults']"
          :addValue="addValueToArray"
          :removeValue="removeValueFromArray"
        />
        <StringElement
          title="sdkconfig file path"
          :value.sync="
            props.el.build.sdkconfigFilePath
              ? props.el.build.sdkconfigFilePath
              : ''
          "
          :sections="['build', 'sdkconfigFilePath']"
          :updateMethod="updateElement"
          :openMethod="openFilePath"
        />
      </div>
    </div>

    <div class="config-section">
      <SelectElement
        :selectValue="props.el.idfTarget ? props.el.idfTarget : ''"
        title="IDF Target"
        :options="idfTargets"
        :sections="['idfTarget']"
        :updateMethod="updateElement"
      />
      <DictionaryElement
        title="Environment variables"
        :elements="props.el.env"
        :sections="['env']"
        :updateMethod="updateElement"
      />
      <StringElement
        title="Flash baud rate"
        :value="props.el.flashBaudRate ? props.el.flashBaudRate : ''"
        :sections="['flashBaudRate']"
        :updateMethod="updateElement"
      />
      <StringElement
        title="Monitor baud rate"
        :value="props.el.monitorBaudRate ? props.el.monitorBaudRate : ''"
        :sections="['monitorBaudRate']"
        :updateMethod="updateElement"
      />
    </div>

    <div class="config-section">
      <h4 class="config-section-title">OpenOCD</h4>
      <div class="config-section-content">
        <SelectElement
          :selectValue="
            props.el.openOCD.debugLevel ? props.el.openOCD.debugLevel : ''
          "
          title="Debug Level"
          :options="openOcdDebugLevelOptions"
          :sections="['openOCD', 'debugLevel']"
          :updateMethod="updateElement"
        />
        <ArrayElement
          title="Config files"
          :values="props.el.openOCD.configs ? props.el.openOCD.configs : []"
          :sections="['openOCD', 'configs']"
          :addValue="addValueToArray"
          :removeValue="removeValueFromArray"
        />
        <ArrayElement
          title="Arguments"
          :values="props.el.openOCD.args ? props.el.openOCD.args : []"
          :sections="['openOCD', 'args']"
          :addValue="addValueToArray"
          :removeValue="removeValueFromArray"
        />
      </div>
    </div>

    <div class="config-section">
      <h4 class="config-section-title">Tasks</h4>
      <div class="config-section-content">
        <StringElement
          title="Pre Build"
          :value="props.el.tasks.preBuild ? props.el.tasks.preBuild : ''"
          :sections="['tasks', 'preBuild']"
          :updateMethod="updateElement"
        />
        <StringElement
          title="Pre Flash"
          :value="props.el.tasks.preFlash ? props.el.tasks.preFlash : ''"
          :sections="['tasks', 'preFlash']"
          :updateMethod="updateElement"
        />
        <StringElement
          title="Post Build"
          :value="props.el.tasks.postBuild ? props.el.tasks.postBuild : ''"
          :sections="['tasks', 'postBuild']"
          :updateMethod="updateElement"
        />
        <StringElement
          title="Post Flash"
          :value="props.el.tasks.postFlash ? props.el.tasks.postFlash : ''"
          :sections="['tasks', 'postFlash']"
          :updateMethod="updateElement"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.config-element {
  background-color: var(--vscode-editor-background);
  border: 2px solid var(--vscode-panel-border);
  border-radius: 2px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.config-element-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.config-element-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
  margin: 0;
}

.config-element-delete {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 4px;
  margin: 0;
  cursor: pointer;
  color: var(--vscode-editor-foreground);
  opacity: 0.8;
  border-radius: 2px;
}

.config-element-delete:hover {
  opacity: 1;
  background-color: var(--vscode-button-hoverBackground);
}

.config-element-delete :deep(svg) {
  width: 16px;
  height: 16px;
}

.config-section {
  margin-bottom: 1.5rem;
}

.config-section:last-child {
  margin-bottom: 0;
}

.config-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
  margin: 0 0 0.75rem 0;
}

.config-section-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-left: 1rem;
}
</style>
