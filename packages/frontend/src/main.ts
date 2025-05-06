import { createApp } from "vue";

import "virtual:uno.css";
import "./styles/main.css";

import App from "./App.vue";

function parseData<T>(selector: string): T | null {
  const content = document.querySelector(selector)?.textContent;
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to parse JSON from ${selector}:`, error);
    return null;
  }
}

createApp(App, {
  title: document.querySelector("title")?.textContent,
  basePrefix: parseData("#sisyphus_base_prefix"),
  challengeData: parseData("#sisyphus_challenge"),
}).mount("#app");
