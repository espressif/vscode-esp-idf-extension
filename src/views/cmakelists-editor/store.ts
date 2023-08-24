import { defineStore } from "pinia";
import { CmakeListsElement } from "../../cmake/cmakeListsElement";
import { computed, Ref, ref, SelectHTMLAttributes } from "vue";

declare var acquireVsCodeApi: any;
let vscode: any;
try {
  vscode = acquireVsCodeApi();
} catch (error) {
  // tslint:disable-next-line: no-console
  console.error(error);
}

export interface IState {
  elements: CmakeListsElement[];
  emptyElements: CmakeListsElement[];
  fileName: string;
  selectedElementToAdd: CmakeListsElement;
  textDictionary: {
    add: string;
    save: string;
    discard: string;
    title: string;
  };
}

export const useCMakeListsEditorStore = defineStore("cmakelistsEditor", () => {
  const elements: Ref<CmakeListsElement[]> = ref([] as CmakeListsElement[]);
  const emptyElements: Ref<CmakeListsElement[]> = ref(
    [] as CmakeListsElement[]
  );
  const fileName = ref("");
  const selectedElementToAdd: Ref<CmakeListsElement> = ref(
    {} as CmakeListsElement
  );

  const textDictionary = ref({
    add: "Add",
    discard: "Discard",
    save: "Save",
    title: "CMakeLists.txt Editor",
  });

  function sendNewValue(newValue) {
    vscode.postMessage({
      command: "updateValue",
      updated_value: newValue,
    });
  }

  function saveChanges() {
    vscode.postMessage({
      command: "saveChanges",
      newValues: this.elements,
    });
  }

  function requestInitValues() {
    vscode.postMessage({ command: "loadCMakeListSchema" });
  }

  return {
    elements,
    emptyElements,
    fileName,
    selectedElementToAdd,
    textDictionary,
    sendNewValue,
    saveChanges,
    requestInitValues,
  };
});
