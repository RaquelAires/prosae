<script setup lang="ts">
import { computed, onMounted, ref, nextTick } from "vue";
import {
  ShieldCheck,
  Search,
  ArrowUpRight,
  RotateCcw,
  Ban,
  RefreshCw,
  X,
} from "lucide-vue-next";
import { api, notify, refresh } from "../store";
type Entry = {
  id: string;
  title: string;
  author: string;
  genre: string;
  status: string;
  reads: number;
  downloads: number;
  blocked: boolean;
  reason: string;
};
const loading = ref(true),
  error = ref(""),
  saving = ref(false),
  query = ref(""),
  filter = ref("all");
const books = ref<Entry[]>([]),
  stats = ref({ accounts: 0, published: 0, blocked: 0 }),
  events = ref<
    {
      id: string;
      title: string;
      action: string;
      reason: string;
      created: number;
    }[]
  >([]);
const selection = ref<Entry | null>(null),
  dialog = ref<HTMLDialogElement>(),
  reason = ref(""),
  formError = ref("");
const filtered = computed(() => {
  const q = query.value.trim().toLocaleLowerCase("pt-BR");
  return books.value.filter(
    (b) =>
      (filter.value === "all" ||
        (filter.value === "blocked"
          ? b.blocked
          : !b.blocked && b.status === "published")) &&
      (!q ||
        `${b.title} ${b.author} ${b.genre}`
          .toLocaleLowerCase("pt-BR")
          .includes(q)),
  );
});
async function load() {
  loading.value = true;
  error.value = "";
  try {
    const data = await api("admin/catalog");
    books.value = data.books;
    stats.value = data.stats;
    events.value = data.events;
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
async function choose(book: Entry) {
  selection.value = book;
  reason.value = "";
  formError.value = "";
  await nextTick();
  dialog.value?.showModal();
}
function closeDialog() {
  dialog.value?.close();
  selection.value = null;
}
async function moderate() {
  if (!selection.value || saving.value) return;
  formError.value = "";
  saving.value = true;
  try {
    await api("admin/moderation/" + encodeURIComponent(selection.value.id), {
      action: selection.value.blocked ? "restore" : "block",
      reason: reason.value,
    });
    closeDialog();
    notify("Catálogo atualizado.");
    await load();
    await refresh();
  } catch (e: any) {
    formError.value = e.message;
  } finally {
    saving.value = false;
  }
}
onMounted(load);
</script>
<template>
  <section class="container section admin-page">
    <div class="admin-title">
      <div class="page-heading">
        <span class="eyebrow"
          ><ShieldCheck :size="16" /> Administração Prosaê</span
        >
        <h1>Cuidar das <em>histórias.</em></h1>
        <p>Gerencie a disponibilidade das obras e acompanhe o catálogo.</p>
      </div>
      <button class="button" :disabled="loading" @click="load">
        <RefreshCw :size="17" />Atualizar
      </button>
    </div>
    <p v-if="loading" role="status">Carregando o painel…</p>
    <div v-else-if="error" class="form-error" role="alert">
      {{ error }}
      <button class="underlined" @click="load">Tentar novamente</button>
    </div>
    <template v-else>
      <div class="admin-stats">
        <article>
          <span>Contas cadastradas</span><strong>{{ stats.accounts }}</strong>
        </article>
        <article>
          <span>Obras disponíveis</span><strong>{{ stats.published }}</strong>
        </article>
        <article>
          <span>Obras suspensas</span><strong>{{ stats.blocked }}</strong>
        </article>
      </div>
      <div class="admin-tools">
        <label class="field"
          >Pesquisar no catálogo
          <div class="admin-search">
            <Search :size="20" /><input
              v-model="query"
              type="search"
              placeholder="Título, autor ou gênero"
            /></div></label
        ><label class="field"
          >Disponibilidade<select v-model="filter">
            <option value="all">Todas as obras</option>
            <option value="published">Disponíveis</option>
            <option value="blocked">Suspensas</option>
          </select></label
        >
      </div>
      <p class="admin-note">
        A suspensão oculta a obra do catálogo e interrompe o acesso público à
        leitura e ao download. Os arquivos são preservados. Rascunhos privados
        não aparecem neste painel.
      </p>
      <div v-if="filtered.length" class="admin-books">
        <article v-for="book in filtered" :key="book.id" class="admin-book">
          <div>
            <span class="eyebrow">{{ book.genre || "Sem gênero" }}</span>
            <h2>{{ book.title || "Sem título" }}</h2>
            <p>{{ book.author }}</p>
            <span class="admin-badge" :class="{ blocked: book.blocked }">{{
              book.blocked
                ? "Suspensa"
                : book.status === "published"
                  ? "Disponível"
                  : "Retirada pelo autor"
            }}</span>
            <p v-if="book.blocked" class="admin-reason">
              Motivo: {{ book.reason }}
            </p>
          </div>
          <div class="admin-book-actions">
            <span
              >{{ book.reads }} leituras · {{ book.downloads }} downloads</span
            ><RouterLink
              v-if="!book.blocked && book.status === 'published'"
              :to="'/livro/' + book.id"
              class="underlined"
              >Ver obra <ArrowUpRight :size="16" /></RouterLink
            ><button
              class="button"
              :class="book.blocked ? 'dark' : 'admin-danger'"
              @click="choose(book)"
            >
              <RotateCcw v-if="book.blocked" :size="16" /><Ban
                v-else
                :size="16"
              />{{ book.blocked ? "Liberar obra" : "Suspender obra" }}
            </button>
          </div>
        </article>
      </div>
      <div v-else class="admin-empty">
        <h2>Nenhuma obra por aqui.</h2>
        <p>Altere sua pesquisa ou escolha outra disponibilidade.</p>
        <button
          class="button"
          @click="
            query = '';
            filter = 'all';
          "
        >
          Limpar filtros
        </button>
      </div>
      <section class="admin-history">
        <span class="eyebrow">Transparência na curadoria</span>
        <h2>Últimas ações</h2>
        <p v-if="!events.length">Nenhuma ação administrativa registrada.</p>
        <ol v-else>
          <li v-for="event in events" :key="event.id">
            <div>
              <strong
                >{{ event.action === "block" ? "Suspensão" : "Liberação" }} ·
                {{ event.title }}</strong
              >
              <p>{{ event.reason }}</p>
            </div>
            <time :datetime="new Date(event.created).toISOString()">{{
              new Date(event.created).toLocaleString("pt-BR")
            }}</time>
          </li>
        </ol>
      </section>
    </template>
    <dialog
      ref="dialog"
      class="admin-dialog"
      aria-labelledby="moderation-title"
      @cancel.prevent="!saving && closeDialog()"
    >
      <form v-if="selection" @submit.prevent="moderate">
        <button
          type="button"
          class="icon-button admin-close"
          aria-label="Cancelar ação"
          :disabled="saving"
          @click="closeDialog"
        >
          <X /></button
        ><span class="eyebrow">Curadoria do catálogo</span>
        <h2 id="moderation-title">
          {{
            selection.blocked ? "Liberar esta obra?" : "Suspender esta obra?"
          }}
        </h2>
        <p>
          <strong>{{ selection.title }}</strong>
        </p>
        <p>
          {{
            selection.blocked
              ? "A liberação remove a suspensão. Obras retiradas pelo autor continuam fora do catálogo."
              : "A obra ficará indisponível ao público até ser liberada pela administração."
          }}
        </p>
        <label class="field"
          >Motivo da ação<textarea
            v-model="reason"
            required
            minlength="5"
            maxlength="500"
            rows="3"
            placeholder="Registre o motivo desta decisão"
            :disabled="saving"
          />
        </label>
        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        <div class="admin-dialog-actions">
          <button
            type="button"
            class="button"
            :disabled="saving"
            @click="closeDialog"
          >
            Cancelar</button
          ><button type="submit" class="button dark" :disabled="saving">
            {{ saving ? "Salvando…" : "Confirmar" }}
          </button>
        </div>
      </form>
    </dialog>
  </section>
</template>
