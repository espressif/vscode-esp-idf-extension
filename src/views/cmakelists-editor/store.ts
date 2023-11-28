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

  function addEmptyElement() {
    if (!selectedElementToAdd.value.canHaveMany) {
      const existing = elements.value.some((elem) => {
        return elem.template === selectedElementToAdd.value.template;
      });
      if (existing) {
        return;
      }
    }
    if (selectedElementToAdd.value.isFirst) {
      elements.value.unshift(selectedElementToAdd.value);
    } else {
      const lastIndexOfTemplate = elements.value
        .map((e) => e.template)
        .lastIndexOf(selectedElementToAdd.value.template);
      if (lastIndexOfTemplate !== -1) {
        elements.value.splice(
          lastIndexOfTemplate + 1,
          0,
          selectedElementToAdd.value
        );
      } else {
        elements.value.push(selectedElementToAdd.value);
      }
    }
  }

  function sendNewValue(newValue) {
    vscode.postMessage({
      command: "updateValue",
      updated_value: newValue,
    });
  }

  function saveChanges() {
    vscode.postMessage({
      command: "saveChanges",
      newValues: JSON.stringify(elements.value),
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
    addEmptyElement,
    sendNewValue,
    saveChanges,
    requestInitValues,
  };
});
