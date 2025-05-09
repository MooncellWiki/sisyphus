import { createApp } from "vue";
import { createI18n } from "vue-i18n";

import "virtual:uno.css";
import "./styles/main.css";

import App from "./App.vue";
import en from "./i18n/locales/en.json";
import ja from "./i18n/locales/ja.json";
import ko from "./i18n/locales/ko.json";
import zhCN from "./i18n/locales/zh-cn.json";
import zhTW from "./i18n/locales/zh-tw.json";

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

function resolveLocale(locale: string): string {
  if (locale.startsWith("zh")) {
    if (locale === "zh-TW" || locale === "zh-HK") {
      return "zhTW";
    }
    return "zhCN";
  }
  return locale.split("-")[0];
}

const i18n = createI18n({
  locale: resolveLocale(navigator.language),
  fallbackLocale: "zhCN",
  messages: {
    en,
    ja,
    ko,
    zhCN,
    zhTW,
  },
});

const app = createApp(App, {
  title: document.querySelector("title")?.textContent,
  basePrefix: parseData("#sisyphus_base_prefix"),
  challengeData: parseData("#sisyphus_challenge"),
});
app.use(i18n);
app.mount("#app");
