import { createApp } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import App from "./App.vue";
import Home from "./views/Home.vue";
import Explore from "./views/Explore.vue";
import Book from "./views/Book.vue";
import Authors from "./views/Authors.vue";
import Shelf from "./views/Shelf.vue";
import Publisher from "./views/Publisher.vue";
import Reader from "./views/Reader.vue";
import "./style.css";
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/explorar", component: Explore },
    { path: "/livro/:id", component: Book },
    { path: "/autores/:id?", component: Authors },
    { path: "/estante", component: Shelf },
    { path: "/publicar", component: Publisher },
    { path: "/ler/:id", component: Reader },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
createApp(App).use(router).mount("#app");
