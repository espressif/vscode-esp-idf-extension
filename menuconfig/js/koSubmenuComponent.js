// Copyright 2019 Espressif Systems (Shanghai) CO LTD
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

define(['knockout', 'koCustomComponents'], (ko) => {
  ko.components.register('kconfig-submenu', {
    viewModel: function submenuVM(params) {
      this.infoIcon = params.helpIcon;
      this.submenues = params.submenues;
    },
    template:
        `<!-- ko foreach: submenues -->
            <!-- ko if: $data.selectedType() === "choice" -->
            <kconfig-select params='options: $data.menuOptions, chosenValue: $data.chosenValue,
            isVisible: $data.isVisible,
            description: $data.title, name: $data.name, help: $data.help, helpIcon: $parent.infoIcon' >
            </kconfig-select>
            <!-- /ko -->

            <!-- ko if: $data.selectedType() === "bool" -->
                <kconfig-checkbox params='isChecked: $data.chosenValue, description: $data.title,
                isVisible: $data.isVisible,
                name: $data.name, help: $data.help, helpIcon: $parent.infoIcon'>
                </kconfig-checkbox>
                <kconfig-submenu params='submenues: $data.submenues, helpIcon: $parent.infoIcon'>
                </kconfig-submenu>
            <!-- /ko -->

            <!-- ko if: $data.selectedType() === "int" -->
                <kconfig-number params='chosenValue: $data.chosenValue, description: $data.title,
                isVisible: $data.isVisible,
                name: $data.name, help: $data.help, helpIcon: $parent.infoIcon'>
                </kconfig-number>
                <kconfig-submenu params='submenues: $data.submenues, helpIcon: $parent.infoIcon'>
                </kconfig-submenu>
            <!-- /ko -->

            <!-- ko if: $data.selectedType() === "string" -->
                <kconfig-text params='chosenValue: $data.chosenValue,
                description: $data.title, isVisible: $data.isVisible,
                name: $data.name, help: $data.help, helpIcon: $parent.infoIcon'>
                </kconfig-text>
                <kconfig-submenu params='submenues: $data.submenues, helpIcon: $parent.infoIcon'>
                </kconfig-submenu>
            <!-- /ko -->

            <!-- ko if: $data.selectedType() === "menu" -->
                <kconfig-menu params='chosenValue: $data.chosenValue, submenues: $data.submenues,
                title: $data.title, isVisible: $data.isVisible, isCollapsed: $data.isCollapsed,
                name: $data.name, isMenuconfig: isMenuconfig, nameId: $data.nameId, isMenuVisible: $data.isMenuVisible,
                help: $data.help, helpIcon: $parent.infoIcon'>
                </kconfig-menu>
            <!-- /ko -->
        <!-- /ko -->`,
  });
});
