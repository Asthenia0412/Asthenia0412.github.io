import { CodeTabs } from "E:/A-[Vue]-Blog/Asthenia0412.github.io/node_modules/@vuepress/plugin-markdown-tab/lib/client/components/CodeTabs.js";
import { Tabs } from "E:/A-[Vue]-Blog/Asthenia0412.github.io/node_modules/@vuepress/plugin-markdown-tab/lib/client/components/Tabs.js";
import "E:/A-[Vue]-Blog/Asthenia0412.github.io/node_modules/@vuepress/plugin-markdown-tab/lib/client/styles/vars.css";

export default {
  enhance: ({ app }) => {
    app.component("CodeTabs", CodeTabs);
    app.component("Tabs", Tabs);
  },
};
