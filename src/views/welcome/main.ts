/*
 * Project: ESP-IDF VSCode Extension
 * File Created: Wednesday, 23rd August 2023 2:50:54 pm
 * Copyright 2023 Espressif Systems (Shanghai) CO LTD
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createApp } from "vue";
import { createPinia } from "pinia";
import Welcome from "./App.vue";
import { useWelcomeStore } from "./store";

const app = createApp(Welcome);
const pinia = createPinia();

app.use(pinia);
app.mount("#app");
const store = useWelcomeStore();

window.addEventListener("message", (event) => {
  const msg = event.data;
  switch (msg.command) {
    case "initialLoad":
      if (msg.extensionVersion) {
        store.extensionVersion = msg.extensionVersion;
      }
      if (msg.espIdf) {
        store.espIdf = msg.espIdf;
      }
      if (msg.showOnInit) {
        store.showOnInit = msg.showOnInit;
      }
      if (msg.articles && msg.articles.length > 0) {
        // Process articles from backend
        const processedArticles = msg.articles.map((article: any) => ({
          ...article,
          description: store.decodeHtmlEntities(article.description),
        }));
        store.blogArticles = processedArticles;
      }
      break;
    case "blogArticlesLoaded":
      if (msg.articles && msg.articles.length > 0) {
        // Process articles from backend
        const processedArticles = msg.articles.map((article: any) => ({
          ...article,
          description: store.decodeHtmlEntities(article.description),
        }));
        store.blogArticles = processedArticles;
      }
      store.isLoadingArticles = false;
      break;
    default:
      break;
  }
});
