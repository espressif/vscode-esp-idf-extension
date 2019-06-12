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

const scripts = document.getElementsByTagName('script');
const end = scripts[1].src.indexOf('init.js');
const baseDir = scripts[1].src.substr(0, end);
/* global workspaceFolder:true */
const kconfigJson = `${workspaceFolder}/build/config/kconfig_menus.json`;

/* global requirejs:true */
requirejs.config({
  baseUrl: baseDir,
  paths: {
    jquery: 'js/lib/jquery',
    knockout: 'js/lib/knockout-3.4.2',
    HtmlFormatter: 'js/HtmlFormatter',
    koCustomComponents: 'js/koCustomComponents',
    koSubmenuComponent: 'js/koSubmenuComponent',
    ConfigViewModel: 'js/viewModels/ConfigViewModel',
    ParamsViewModel: 'js/viewModels/ParamViewModel',
    MenuViewModel: 'js/viewModels/MenuViewModel',
  },
});

define(
  ['knockout', 'jquery', 'ConfigViewModel', 'MenuViewModel', 'koSubmenuComponent', 'koCustomComponents'],
  (ko, $, ConfigViewModel, MenuViewModel) => {
    $(document).ready(() => {
      const configVM = new ConfigViewModel();
      const menu = new MenuViewModel();
      let menuList = ko.observableArray();

      configVM.query.subscribe(configVM.search);

      const getMenu = function getMenu() {
        $.getJSON(kconfigJson, (menuJS) => {
          menuList = menu.generate_menu_list(menuJS);
          configVM.configMenues(menuList());
          configVM.goToSection(configVM.configMenues()[0]);
        });
      };

      window.addEventListener('message', (event) => {
        const message = event.data;
        switch (message.command) {
          case 'init':
            getMenu();
            break;
          case 'new_values':
            if (message.new_values) {
              const newValuesJson = JSON.parse(message.new_values);
              configVM.updateValues(newValuesJson);
            }
            configVM.configCurrentState('initialized');
            break;
          case 'error_state':
            configVM.configCurrentState('error');
            console.log(`Received the following error code from confserver.py: ${message.error_code}`);
            break;
          default:
            break;
        }
      });

      ko.applyBindings(configVM);
    });
  },
);
