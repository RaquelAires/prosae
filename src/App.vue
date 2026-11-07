<script setup lang="ts">
import { onMounted, ref, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Menu, X, ArrowUpRight, User, LogOut, Star } from "lucide-vue-next";
import { state, refresh, logout, notify } from "./store";
import LoadingState from "./components/LoadingState.vue";
import EmptyState from "./components/EmptyState.vue";
const router = useRouter();
const leaving = ref(false);
async function signOut() {
  leaving.value = true;
  try {
    await logout();
    await router.replace("/");
  } catch (e: any) {
    notify(e.message);
  } finally {
    leaving.value = false;
  }
}
const route = useRoute(),
  mobile = ref(false),
  reader = computed(() => route.path.startsWith("/ler/"));
async function load() {
  state.loading = true;
  state.error = "";
  try {
    await refresh();
  } catch (e: any) {
    state.error = e.message;
  } finally {
    state.loading = false;
  }
}
onMounted(load);
watch(
  () => route.path,
  () => {
    mobile.value = false;
  },
);
const menu = [
  ["/", "Início"],
  ["/explorar", "Explorar livros"],
  ["/autores", "Autores"],
  ["/estante", "Minha estante"],
];
</script>
<template>
  <template v-if="!reader"
    ><a href="#conteudo" class="skip">Pular para o conteúdo</a>
    <header class="site-header">
      <div class="header-inner">
        <RouterLink to="/" class="wordmark" aria-label="Prosaê, início"
          >prosaê</RouterLink
        ><button
          class="mobile-toggle icon-button"
          aria-label="Abrir menu"
          :aria-expanded="mobile"
          @click="mobile = !mobile"
        >
          <X v-if="mobile" /><Menu v-else />
        </button>
        <nav :class="{ 'mobile-open': mobile }" aria-label="Menu principal">
          <RouterLink
            v-for="[url, label] in menu"
            :key="url"
            :to="url"
            :class="{
              active:
                route.path === url ||
                (url !== '/' && route.path.startsWith(url)),
            }"
            >{{ label }}</RouterLink
          >
        </nav>
        <div class="header-actions">
          <RouterLink v-if="state.me.user" class="account-link" to="/conta"
            ><User :size="17" /><span>Minha conta</span></RouterLink
          >
          <RouterLink
            v-else
            class="account-link"
            :to="{ path: '/entrar', query: { retorno: route.fullPath } }"
            ><User :size="17" /><span>Entrar</span></RouterLink
          >
          <button
            v-if="state.me.user"
            class="icon-button header-logout"
            :disabled="leaving"
            aria-label="Sair da conta"
            @click="signOut"
          >
            <LogOut :size="17" />
          </button>
          <RouterLink class="button small dark" to="/publicar"
            >Publicar minha obra <ArrowUpRight :size="17"
          /></RouterLink>
        </div>
      </div></header
  ></template>
  <main id="conteudo">
    <LoadingState v-if="state.loading" />
    <div v-else-if="state.error" class="container">
      <EmptyState title="A biblioteca está fazendo uma pausa."
        ><p>{{ state.error }}</p>
        <button class="button" @click="load">
          Tentar novamente
        </button></EmptyState
      >
    </div>
    <RouterView v-else />
  </main>
  <footer v-if="!reader">
    <div class="container footer-top">
      <div>
        <RouterLink to="/" class="wordmark">prosaê</RouterLink>
        <p>Feito de palavras.<br />Cheio de Brasil.</p>
      </div>
      <div>
        <span class="eyebrow">Para quem lê</span
        ><RouterLink to="/explorar">Explorar livros</RouterLink
        ><RouterLink to="/estante">Minha estante</RouterLink>
      </div>
      <div>
        <span class="eyebrow">Para quem escreve</span
        ><RouterLink to="/publicar">Publicar uma obra</RouterLink
        ><RouterLink to="/autores">Conhecer autores</RouterLink>
      </div>
      <div class="footer-sign">
        <Star /><span>Da nossa terra.<br />Para o seu mundo.</span>
      </div>
    </div>
    <div class="container footer-bottom">
      <span>© 2026 Prosaê · Literatura em todos os cantos.</span
      ><span
        >Obras de exemplo e autores fictícios sinalizados nas páginas.</span
      >
    </div>
  </footer>
  <div v-if="state.toast" class="toast" role="status">{{ state.toast }}</div>
</template>
