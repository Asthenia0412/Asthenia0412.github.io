import comp from "E:/A-[Vue]-Blog/Asthenia0412.github.io/docs/.vuepress/.temp/pages/get-started.html.vue"
const data = JSON.parse("{\"path\":\"/get-started.html\",\"title\":\"Get Started\",\"lang\":\"en-US\",\"frontmatter\":{},\"headers\":[{\"level\":2,\"title\":\"Pages\",\"slug\":\"pages\",\"link\":\"#pages\",\"children\":[]},{\"level\":2,\"title\":\"Content\",\"slug\":\"content\",\"link\":\"#content\",\"children\":[]},{\"level\":2,\"title\":\"Configuration\",\"slug\":\"configuration\",\"link\":\"#configuration\",\"children\":[]},{\"level\":2,\"title\":\"Layouts and customization\",\"slug\":\"layouts-and-customization\",\"link\":\"#layouts-and-customization\",\"children\":[]}],\"git\":{\"updatedTime\":1741762976000,\"contributors\":[{\"name\":\"xiaoyongcai\",\"username\":\"xiaoyongcai\",\"email\":\"2283216402@qq.com\",\"commits\":1,\"url\":\"https://github.com/xiaoyongcai\"}],\"changelog\":[{\"hash\":\"0a93da077086c9422375b62fa0aeb39b9c3d765b\",\"time\":1741762976000,\"email\":\"2283216402@qq.com\",\"author\":\"xiaoyongcai\",\"message\":\"test\"}]},\"filePathRelative\":\"get-started.md\"}")
export { comp, data }

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
  if (__VUE_HMR_RUNTIME__.updatePageData) {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  }
}

if (import.meta.hot) {
  import.meta.hot.accept(({ data }) => {
    __VUE_HMR_RUNTIME__.updatePageData(data)
  })
}
