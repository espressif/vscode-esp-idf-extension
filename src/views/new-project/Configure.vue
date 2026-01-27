<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNewProjectStore } from "./store";
import { computed, watch, ref } from "vue";
import { useRouter } from "vue-router";
import IdfComponents from "./components/IdfComponents.vue";
import folderOpen from "./components/folderOpen.vue";
const store = useNewProjectStore();
const router = useRouter();

const {
  boards,
  idfTargets,
  openOcdConfigFiles,
  projectName,
  containerDirectory,
  selectedBoard,
  selectedIdfTarget,
  selectedPort,
  serialPortList,
} = storeToRefs(store);

// Validation state
const validationErrors = ref<{
  projectName?: string;
  containerDirectory?: string;
  selectedIdfTarget?: string;
}>({});

function setContainerDirectory(newPath: string) {
  store.containerDirectory = newPath;
  // Clear validation error when user updates the field
  if (validationErrors.value.containerDirectory) {
    validationErrors.value.containerDirectory = undefined;
  }
}

const showCustomBoardInput = computed(() => {
  const showTarget =
    boards.value.length === 0 ||
    (selectedBoard && selectedBoard.value.name === "Custom board");
  return showTarget;
});

const filteredBoards = computed(() => {
  return boards.value.filter(
    (board) =>
      board.name === "Custom board" ||
      board.target === selectedIdfTarget.value.target
  );
});

// Only update selectedBoard if it is not already set to a valid value
watch(selectedIdfTarget, () => {
  if (
    filteredBoards.value.length > 0 &&
    (!selectedBoard.value ||
      !filteredBoards.value.some((b) => b.name === selectedBoard.value.name))
  ) {
    selectedBoard.value = filteredBoards.value[0];
  }
  // Clear validation error when user updates the field
  if (validationErrors.value.selectedIdfTarget) {
    validationErrors.value.selectedIdfTarget = undefined;
  }
});

// Watch projectName to clear validation error
watch(projectName, () => {
  if (validationErrors.value.projectName) {
    validationErrors.value.projectName = undefined;
  }
});

// Watch containerDirectory to clear validation error
watch(containerDirectory, () => {
  if (validationErrors.value.containerDirectory) {
    validationErrors.value.containerDirectory = undefined;
  }
});

function validateForm(): boolean {
  validationErrors.value = {};

  let isValid = true;

  // Validate projectName
  if (!projectName.value || projectName.value.trim() === "") {
    validationErrors.value.projectName = "Project name is required";
    isValid = false;
  }

  // Validate containerDirectory
  if (!containerDirectory.value || containerDirectory.value.trim() === "") {
    validationErrors.value.containerDirectory = "Project directory is required";
    isValid = false;
  }

  // Validate selectedIdfTarget
  if (!selectedIdfTarget.value || selectedIdfTarget.value === null) {
    validationErrors.value.selectedIdfTarget = "ESP-IDF Target is required";
    isValid = false;
  }

  return isValid;
}

function handleCreateProject() {
  if (!validateForm()) {
    return;
  }
  store.createProject();
  router.push("/created");
}
</script>

<template>
  <div class="configure">
    <div class="settings-group">
      <div class="settings-item">
        <label for="projectName" class="settings-label">Project Name</label>
        <div class="settings-control">
          <input
            type="text"
            name="projectName"
            id="projectName"
            class="vscode-input"
            :class="{ 'input-error': validationErrors.projectName }"
            v-model="projectName"
            placeholder="project-name"
          />
        </div>
        <div v-if="validationErrors.projectName" class="validation-error">
          {{ validationErrors.projectName }}
        </div>
      </div>

      <div class="settings-item">
        <folderOpen
          propLabel="Enter Project directory"
          v-model:propModel="containerDirectory"
          :openMethod="store.openProjectDirectory"
          :propMutate="setContainerDirectory"
          :staticText="projectName"
          id="projectDirectory"
        />
        <div v-if="validationErrors.containerDirectory" class="validation-error">
          {{ validationErrors.containerDirectory }}
        </div>
      </div>

      <div class="settings-item" v-if="idfTargets && idfTargets.length > 0">
        <label for="idf-target" class="settings-label"
          >Choose ESP-IDF Target (IDF_TARGET)</label
        >
        <div class="settings-control">
          <div class="select-wrapper">
            <select
              name="idf-target"
              id="idf-target"
              v-model="selectedIdfTarget"
              class="vscode-select"
              :class="{ 'input-error': validationErrors.selectedIdfTarget }"
            >
              <option v-for="b of idfTargets" :key="b.label" :value="b">
                {{ b.label }}
              </option>
            </select>
          </div>
        </div>
        <div v-if="validationErrors.selectedIdfTarget" class="validation-error">
          {{ validationErrors.selectedIdfTarget }}
        </div>
      </div>

      <div
        class="settings-item"
        v-if="filteredBoards && filteredBoards.length > 0"
      >
        <label for="idf-board" class="settings-label"
          >Choose ESP-IDF Board</label
        >
        <div class="settings-control">
          <div class="select-wrapper">
            <select
              name="idf-board"
              id="idf-board"
              v-model="selectedBoard"
              class="vscode-select"
            >
              <option v-for="b of filteredBoards" :key="b.name" :value="b">
                {{ b.name }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-item">
        <label for="idf-port" class="settings-label">Choose serial port</label>
        <div class="settings-control">
          <div class="select-wrapper">
            <select
              name="idf-port"
              id="idf-port"
              v-model="selectedPort"
              class="vscode-select"
            >
              <option v-for="port of serialPortList" :key="port" :value="port">
                {{ port }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-item" v-if="showCustomBoardInput">
        <label for="openocd-cfgs" class="settings-label">
          OpenOCD Configuration files (Relative paths to OPENOCD_SCRIPTS)
        </label>
        <div class="settings-description">
          Add files separated by comma like
          <span
            >interface/ftdi/esp32_devkitj_v1.cfg,board/esp32-wrover.cfg</span
          >
        </div>
        <div class="settings-control">
          <textarea
            name="openocd-cfgs"
            id="openocd-cfgs"
            v-model="openOcdConfigFiles"
            class="vscode-textarea"
            rows="2"
          ></textarea>
        </div>
      </div>

      <IdfComponents />

      <div class="settings-item settings-actions">
        <button
          type="button"
          class="vscode-button"
          id="createProjectButton"
          @click="handleCreateProject"
        >
          Create Project
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@import "../commons/espCommons.scss";

.configure {
  padding: 1rem;
  color: var(--vscode-editor-foreground);
}

.settings-group {
  max-width: 800px;
  margin: 0 auto;
}

.settings-item {
  margin-bottom: 1.5rem;
}

.settings-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-settings-headerForeground);
  margin-bottom: 0.5rem;
}

.settings-description {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 0.5rem;
}

.settings-description span {
  font-family: var(--vscode-editor-font-family);
  font-weight: 600;
  color: var(--vscode-editor-foreground);
}

.settings-control {
  width: 100%;
  max-width: 600px;
}

.select-wrapper {
  position: relative;
  width: 100%;
}

.vscode-input,
.vscode-textarea {
  width: 100%;
  padding: 4px 8px;
  background-color: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
}

.vscode-textarea {
  resize: none;
  min-height: 60px;
}

.vscode-input:hover,
.vscode-textarea:hover {
  border-color: var(--vscode-input-border);
}

.vscode-input:focus,
.vscode-textarea:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-input::placeholder {
  color: var(--vscode-input-placeholderForeground);
}

.vscode-select {
  width: 100%;
  padding: 4px 8px;
  background-color: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground);
  border: 1px solid var(--vscode-dropdown-border);
  border-radius: 2px;
  font-size: 13px;
  line-height: 1.4;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%238C8C8C' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 24px;
}

.vscode-select:hover {
  background-color: var(--vscode-dropdown-background);
  border-color: var(--vscode-dropdown-border);
}

.vscode-select:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.vscode-select option {
  background-color: var(--vscode-dropdown-background);
  color: var(--vscode-dropdown-foreground);
}

.vscode-button {
  height: 32px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 32px;
  color: var(--vscode-button-foreground);
  background-color: var(--vscode-button-background);
  border: 1px solid var(--vscode-button-border);
  border-radius: 2px;
  cursor: pointer;
  outline: none;
  text-decoration: none;
  display: inline-block;
}

.vscode-button:hover {
  background-color: var(--vscode-button-hoverBackground);
}

.vscode-button:active {
  background-color: var(--vscode-button-activeBackground);
}

.vscode-button:focus {
  outline: 1px solid var(--vscode-focusBorder);
  outline-offset: -1px;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 2rem;
}

.validation-error {
  color: var(--vscode-errorForeground);
  font-size: 12px;
  margin-top: 0.25rem;
  display: block;
}

.input-error {
  border-color: var(--vscode-inputValidation-errorBorder) !important;
}

.input-error:focus {
  outline-color: var(--vscode-inputValidation-errorBorder) !important;
}
</style>
