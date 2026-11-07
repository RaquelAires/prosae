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
import Auth from "./views/Auth.vue";
import Account from "./views/Account.vue";
import { state, loadSession, safeReturnTo } from "./store";
import "./style.css";
import "./auth.css";
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/explorar", component: Explore },
    { path: "/livro/:id", component: Book },
    { path: "/autores/:id?", component: Authors },
    { path: "/estante", component: Shelf, meta: { requiresAuth: true } },
    { path: "/publicar", component: Publisher, meta: { requiresAuth: true } },
    { path: "/conta", component: Account, meta: { requiresAuth: true } },
    { path: "/entrar", component: Auth },
    { path: "/cadastro", component: Auth },
    { path: "/ler/:id", component: Reader },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
router.beforeEach(async (to) => {
  if (to.meta.requiresAuth || ["/entrar", "/cadastro"].includes(to.path)) {
    try {
      await loadSession();
    } catch {
      /* The page will expose the connection error. */
    }
    if (to.meta.requiresAuth && !state.me.user)
      return { path: "/entrar", query: { retorno: to.fullPath } };
    if (["/entrar", "/cadastro"].includes(to.path) && state.me.user)
      return safeReturnTo(to.query.retorno);
  }
});
createApp(App).use(router).mount("#app");
