<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNewProjectStore } from "./store";
import { computed, onMounted } from "vue";
const store = useNewProjectStore();

const {
  boards,
  openOcdConfigFiles,
  projectName,
  containerDirectory,
  selectedBoard,
  selectedPort,
  serialPortList,
  target,
  targetList

} = storeToRefs(store);

const showCustomBoardInput = computed(() => {
    const showTarget =
      boards.value.length === 0 ||
      (selectedBoard && selectedBoard.value.name === "Custom board");
    return showTarget;
  })
</script>

<template>
  <div class="configure notification">
    <div class="field">
      <label for="projectName" class="label">Project Name</label>
      <div class="control expanded">
        <input
          type="text"
          name="projectName"
          id="projectName"
          class="input"
          v-model="projectName"
          placeholder="project-name"
        />
      </div>
    </div>
    <folderOpen
      propLabel="Enter Project directory"
      :propModel.sync="containerDirectory"
      :openMethod="store.openProjectDirectory"
      :staticText="projectName"
    />

    <div class="field">
      <div class="field" v-if="boards && boards.length > 0">
        <label for="idf-board" class="label">Choose ESP-IDF Board</label>
        <div class="control">
          <div class="select">
            <select name="idf-board" id="idf-board" v-model="selectedBoard">
              <option v-for="b of boards" :key="b.name" :value="b">{{
                b.name
              }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="field" v-if="showCustomBoardInput">
        <label for="idf-target" class="label">Choose ESP-IDF Target</label>
        <div class="control">
          <div class="select">
            <select name="idf-target" id="idf-target" v-model="target">
              <option v-for="t of targetList" :key="t.name" :value="t">{{
                t.name
              }}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="field">
        <label for="idf-port" class="label">Choose serial port</label>
        <div class="control">
          <div class="select">
            <select name="idf-port" id="idf-port" v-model="selectedPort">
              <option
                v-for="port of serialPortList"
                :key="port"
                :value="port"
                >{{ port }}</option
              >
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="field" v-if="showCustomBoardInput">
      <label for="openocd-cfgs" class="label"
        >OpenOCD Configuration files (Relative paths to OPENOCD_SCRIPTS)</label
      >
      <p>
        Add files separated by comma like
        <span>interface/ftdi/esp32_devkitj_v1.cfg,board/esp32-wrover.cfg</span>
      </p>
      <textarea
        name="openocd-cfgs"
        id="openocd-cfgs"
        cols="20"
        rows="2"
        v-model="openOcdConfigFiles"
        class="input textarea is-small"
      ></textarea>
    </div>

    <IdfComponents />

    <div class="field install-btn">
      <div class="control">
        <router-link to="/templates" class="button"
          >Choose Template</router-link
        >
      </div>
    </div>
  </div>
</template>

<style lang="scss">
.centerize {
  align-items: center;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.configure {
  display: flex;
  flex-direction: column;
  margin: 1%;
}

.expanded {
  width: 70%;
  align-items: center;
  display: flex;
  justify-content: center;
}

.install-btn {
  margin: 0.5em;
  align-self: flex-end;
}
.notification span {
  font-weight: bold;
}
</style>
