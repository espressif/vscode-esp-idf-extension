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

import { library } from "@fortawesome/fontawesome-svg-core";
import { faCaretDown, faCaretRight, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import Vue from "vue";
import vuescroll from "vue-scroll";
import ConfigElement from "./components/configElement.vue";
import SearchBar from "./components/SearchBar.vue";
import SideNavItem from "./components/SideNavItem.vue";
import Menuconfig from "./Menuconfig.vue";
import { store } from "./store";

library.add(faInfoCircle, faCaretDown, faCaretRight);
Vue.component("font-awesome-icon", FontAwesomeIcon);
Vue.component("config-el", ConfigElement);
Vue.component("sidenav-el", SideNavItem);
Vue.component("search-bar", SearchBar);
Vue.use(vuescroll);

// tslint:disable-next-line: no-unused-expression
new Vue({
    el: "#menuconfig",
    components: { Menuconfig },
    store,
    template: "<Menuconfig />",
});

window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.command) {
        case "load_initial_values":
            if (message.menus) {
                store.commit("setInitialValues", message.menus);
            }
            break;
        case "update_values":
            if (message.updated_values) {
                store.commit("updateValues", message.updated_values);
            }
            break;
        case "load_dictionary":
            if (message.text_dictionary) {
                store.commit("loadTextDictionary", message.text_dictionary);
            }
            break;
        default:
            break;
    }
});
