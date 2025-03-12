export const redirects = JSON.parse("{}")

export const routes = Object.fromEntries([
  ["/get-started.html", { loader: () => import(/* webpackChunkName: "get-started.html" */"E:/A-[Vue]-Blog/Asthenia0412.github.io/docs/.vuepress/.temp/pages/get-started.html.js"), meta: {"title":"Get Started"} }],
  ["/", { loader: () => import(/* webpackChunkName: "index.html" */"E:/A-[Vue]-Blog/Asthenia0412.github.io/docs/.vuepress/.temp/pages/index.html.js"), meta: {"title":"Home"} }],
  ["/404.html", { loader: () => import(/* webpackChunkName: "404.html" */"E:/A-[Vue]-Blog/Asthenia0412.github.io/docs/.vuepress/.temp/pages/404.html.js"), meta: {"title":""} }],
]);
