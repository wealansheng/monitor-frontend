import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import "@fontsource/noto-serif-sc/chinese-simplified-700.css";
import "@fontsource/noto-serif-sc/latin-700.css";
import "@fontsource/barlow-semi-condensed/latin-600.css";
import "@fontsource/barlow-semi-condensed/latin-700.css";
import "./style.css";

createApp(App).use(router).mount("#app");
