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
      :propMutate="setContainerDirectory"
      :openMethod="openProjectDirectory"
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

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import { Action, Mutation, State } from "vuex-class";
import folderOpen from "./components/folderOpen.vue";
import IdfComponents from "./components/IdfComponents.vue";
import { IdfBoard, IdfTarget } from "./store";

@Component({
  components: {
    folderOpen,
    IdfComponents,
  },
})
export default class Configure extends Vue {
  @Action openProjectDirectory;
  @Action private requestInitialValues;
  @Mutation setContainerDirectory;
  @Mutation setOpenOcdConfigFiles;
  @Mutation setProjectName;
  @Mutation setSelectedBoard;
  @Mutation setSelectedPort;
  @Mutation setTarget;
  @State("boards") private storeBoards: IdfBoard[];
  @State("containerDirectory") private storeContainerDirectory;
  @State("projectName") private storeProjectName;
  @State("openOcdConfigFiles") private storeOpenOcdConfigFiles;
  @State("selectedBoard") private storeSelectedBoard: IdfBoard;
  @State("selectedPort") private storeSelectedPort;
  @State("serialPortList") private storeSerialPortList: string[];
  @State("targetList") private storeTargetList: IdfTarget[];
  @State("target") private storeTarget: IdfTarget;

  get boards() {
    return this.storeBoards;
  }

  get containerDirectory() {
    return this.storeContainerDirectory;
  }

  get projectName() {
    return this.storeProjectName;
  }
  set projectName(newVal: string) {
    this.setProjectName(newVal);
  }

  get openOcdConfigFiles() {
    return this.storeOpenOcdConfigFiles;
  }
  set openOcdConfigFiles(newVal: string) {
    this.setOpenOcdConfigFiles(newVal);
  }

  get serialPortList() {
    return this.storeSerialPortList;
  }

  get selectedBoard() {
    return this.storeSelectedBoard;
  }
  set selectedBoard(board: IdfBoard) {
    this.setSelectedBoard(board);
    const selectedTarget = this.storeTargetList.find(
      (idfTarget) => idfTarget.id === board.target
    );
    this.setTarget(selectedTarget);
    this.setOpenOcdConfigFiles(board.configFiles);
  }

  get selectedPort() {
    return this.storeSelectedPort;
  }
  set selectedPort(newVal: string) {
    this.setSelectedPort(newVal);
  }

  get showCustomBoardInput() {
    const showTarget =
      this.boards.length === 0 ||
      (this.selectedBoard && this.selectedBoard.name === "Custom board");
    return showTarget;
  }

  get targetList() {
    return this.storeTargetList;
  }

  get target() {
    return this.storeTarget;
  }
  set target(newVal: IdfTarget) {
    this.setTarget(newVal);
    this.setOpenOcdConfigFiles(newVal.openOcdFiles);
  }
  private mounted() {
    this.requestInitialValues();
  }
}
</script>

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
