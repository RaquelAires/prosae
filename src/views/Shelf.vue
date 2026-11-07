<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { useRoute } from "vue-router";
import { ArrowUpRight, PenLine, BookOpen } from "lucide-vue-next";
import {
  state,
  api,
  refresh,
  notify,
  saveBook,
  regions,
  imageUrl,
} from "../store";
import type { Book, Profile } from "../types";
import EmptyState from "../components/EmptyState.vue";
import BookCard from "../components/BookCard.vue";
const route = useRoute(),
  tab = ref(String(route.query.aba || "Quero ler")),
  busy = ref(false),
  withdraw = ref<Book | null>(null),
  profile = reactive<Profile>({
    ...(state.me.profile || {
      id: "",
      name: "",
      bio: "",
      region: "",
      link: "",
      photo: "",
    }),
  });
watch(
  () => route.query.aba,
  (v) => (tab.value = String(v || "Quero ler")),
);
const tabs = ["Quero ler", "Lendo", "Concluídos", "publicacoes", "perfil"];
async function remove(id: string) {
  try {
    await api("shelf", { book: id }, "DELETE");
    await refresh();
    notify("Livro removido da estante.");
  } catch (e: any) {
    notify(e.message);
  }
}
async function saveProfile() {
  busy.value = true;
  try {
    await api("profile", profile, "PUT");
    await refresh();
    notify("Perfil atualizado.");
  } catch (e: any) {
    notify(e.message);
  } finally {
    busy.value = false;
  }
}
async function photo(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  busy.value = true;
  try {
    if (f.size > 5242880) throw new Error("A foto deve ter até 5 MB.");
    const r = await fetch("/api/upload?kind=cover", {
      method: "POST",
      body: f,
      headers: { "x-filename": encodeURIComponent(f.name) },
    });
    const d: any = await r.json();
    if (!r.ok) throw new Error(d.error);
    profile.photo = d.id;
    notify("Foto enviada. Salve o perfil para concluir.");
  } catch (e: any) {
    notify(e.message);
  } finally {
    busy.value = false;
  }
}
async function confirmWithdraw() {
  if (!withdraw.value) return;
  try {
    await api("book/" + withdraw.value.id, undefined, "DELETE");
    await refresh();
    withdraw.value = null;
    notify("Publicação retirada do catálogo.");
  } catch (e: any) {
    notify(e.message);
  }
}
</script>
<template>
  <div class="container section">
    <EmptyState
      v-if="!state.me.user"
      title="Sua próxima história merece um lugar."
      ><p>
        Entre para organizar sua estante, sincronizar a leitura e gerenciar suas
        publicações.
      </p>
      <a
        class="button dark"
        href="/signin-with-chatgpt?return_to=/estante"
        target="_top"
        >Entrar com ChatGPT <ArrowUpRight :size="18" /></a></EmptyState
    ><template v-else
      ><div class="page-heading">
        <span class="eyebrow">Um lugar para chamar de seu</span>
        <h1>Minha <em>estante.</em></h1>
        <p>
          Olá, {{ state.me.profile?.name || state.me.user.name }}. Tem uma boa
          história esperando por você.
        </p>
      </div>
      <div class="tabs" role="tablist" aria-label="Seções da estante">
        <button
          v-for="t in tabs"
          :key="t"
          role="tab"
          :aria-selected="tab === t"
          :class="{ active: tab === t }"
          @click="tab = t"
        >
          {{
            t === "publicacoes"
              ? "Minhas publicações"
              : t === "perfil"
                ? "Meu perfil"
                : t
          }}
        </button>
      </div>
      <template v-if="tab === 'publicacoes'"
        ><div class="section-title">
          <h2>Suas histórias no mundo</h2>
          <RouterLink to="/publicar" class="button dark"
            >Nova publicação <PenLine :size="18"
          /></RouterLink>
        </div>
        <EmptyState
          v-if="!state.me.publications.length"
          title="Toda história começa com uma página."
          ><p>Seu primeiro livro pode começar por aqui.</p>
          <RouterLink to="/publicar" class="button"
            >Publicar minha obra</RouterLink
          ></EmptyState
        >
        <div v-else class="publication-list">
          <article v-for="b in state.me.publications" :key="b.id">
            <div>
              <span class="pill">{{
                b.status === "published"
                  ? "Publicada"
                  : b.status === "draft"
                    ? "Rascunho"
                    : "Retirada"
              }}</span>
              <h3>{{ b.title || "Obra sem título" }}</h3>
              <p>
                {{ b.format || "Arquivo pendente" }} · {{ b.reads }} leituras ·
                {{ b.downloads }} downloads
              </p>
            </div>
            <RouterLink
              class="button"
              :to="{ path: '/publicar', query: { editar: b.id } }"
              >Editar</RouterLink
            ><button
              v-if="b.status === 'published'"
              class="underlined"
              @click="withdraw = b"
            >
              Retirar publicação
            </button>
          </article>
        </div></template
      >
      <form
        v-else-if="tab === 'perfil'"
        class="profile-form"
        @submit.prevent="saveProfile"
      >
        <h2>A sua voz, do seu jeito.</h2>
        <label class="field"
          >Nome de autor<input
            v-model="profile.name"
            required
            maxlength="100" /></label
        ><label class="field"
          >Biografia<textarea v-model="profile.bio" maxlength="2000" /></label
        ><label class="field"
          >Região (opcional)<select v-model="profile.region">
            <option value="">Prefiro não informar</option>
            <option v-for="r in regions" :key="r">{{ r }}</option>
          </select></label
        ><label class="field"
          >Link (opcional)<input
            v-model="profile.link"
            type="url"
            placeholder="https://" /></label
        ><label class="field"
          >Foto de perfil (até 5 MB)<input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            @change="photo" /></label
        ><img
          v-if="profile.photo"
          class="profile-preview"
          :src="imageUrl(profile.photo)"
          alt="Prévia da foto de perfil"
        /><button class="button dark" :disabled="busy">
          {{ busy ? "Salvando…" : "Salvar perfil" }}
        </button>
      </form>
      <div v-else class="shelf-grid">
        <template
          v-for="entry in state.me.shelf.filter((s) => s.status === tab)"
          :key="entry.book"
          ><article v-if="state.books.find((b) => b.id === entry.book)">
            <BookCard :book="state.books.find((b) => b.id === entry.book)!" />
            <div class="progress-line">
              <i :style="{ width: entry.progress + '%' }" />
            </div>
            <span class="tiny">{{ entry.progress }}% da leitura</span
            ><select
              :aria-label="'Mover ' + entry.book + ' na estante'"
              :value="entry.status"
              @change="
                saveBook(
                  state.books.find((b) => b.id === entry.book)!,
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option v-for="v in tabs.slice(0, 3)" :key="v">
                {{ v }}
              </option></select
            ><RouterLink
              v-if="state.books.find((b) => b.id === entry.book)?.online"
              class="button dark"
              :to="'/ler/' + entry.book"
              >{{ entry.progress ? "Continuar leitura" : "Começar a ler" }}
              <BookOpen :size="18" /></RouterLink
            ><button class="underlined" @click="remove(entry.book)">
              Remover da estante
            </button>
          </article></template
        ><EmptyState
          v-if="!state.me.shelf.some((s) => s.status === tab)"
          title="Sua estante está esperando uma descoberta."
          ><p>
            Explore o catálogo e guarde um livro para o seu próximo momento de
            leitura.
          </p>
          <RouterLink to="/explorar" class="button dark"
            >Encontrar uma história <ArrowUpRight :size="18" /></RouterLink
        ></EmptyState></div
    ></template>
    <div v-if="withdraw" class="modal-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-title"
        class="confirm-dialog"
      >
        <h2 id="withdraw-title">Retirar “{{ withdraw.title }}”?</h2>
        <p>
          A obra sairá do catálogo. Você poderá editá-la e publicar novamente
          depois.
        </p>
        <div>
          <button class="button" @click="withdraw = null">
            Manter publicada</button
          ><button class="button dark" @click="confirmWithdraw">
            Retirar publicação
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
