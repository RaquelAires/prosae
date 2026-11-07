<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import {
  Search,
  X,
  SlidersHorizontal,
  ArrowUpRight,
  BookOpen,
} from "lucide-vue-next";
import { state, genres } from "../store";
import BookGrid from "../components/BookGrid.vue";
import EmptyState from "../components/EmptyState.vue";
const route = useRoute(),
  query = ref(String(route.query.q || "")),
  genre = ref("Todos"),
  language = ref("Todos"),
  format = ref("Todos"),
  availability = ref("Todos"),
  sort = ref("new"),
  suggestions = ref(false),
  filters = ref(false);
watch(
  () => route.query.q,
  (v) => (query.value = String(v || "")),
);
const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const languages = computed(() => [
  "Todos",
  ...new Set(state.books.map((b) => b.language)),
]);
const matching = computed(() =>
  state.books
    .filter((b) => norm(b.title + " " + b.author).includes(norm(query.value)))
    .slice(0, 5),
);
const filtered = computed(() =>
  state.books
    .filter(
      (b) =>
        norm(
          [b.title, b.author, b.genre, b.keywords, b.region].join(" "),
        ).includes(norm(query.value)) &&
        (genre.value === "Todos" || b.genre === genre.value) &&
        (language.value === "Todos" || b.language === language.value) &&
        (format.value === "Todos" || b.format === format.value) &&
        (availability.value === "Todos" ||
          (availability.value === "Leitura online" && b.online) ||
          (availability.value === "Download" && b.download)),
    )
    .sort((a, b) =>
      sort.value === "alpha"
        ? a.title.localeCompare(b.title, "pt-BR")
        : sort.value === "reads"
          ? b.reads - a.reads
          : sort.value === "downloads"
            ? b.downloads - a.downloads
            : b.created - a.created,
    ),
);
function reset() {
  query.value = "";
  genre.value = language.value = format.value = availability.value = "Todos";
}
function blur() {
  setTimeout(() => (suggestions.value = false), 150);
}
</script>
<template>
  <div class="container section explore">
    <div class="page-heading">
      <span class="eyebrow">Sua próxima descoberta está aqui</span>
      <h1>Entre. Escolha. <em>Leia.</em></h1>
      <p>Encontre histórias para o seu mundo — ou para sair um pouco dele.</p>
    </div>
    <div class="search-wrap">
      <Search /><input
        v-model="query"
        aria-label="Buscar por título, autor, gênero ou palavras-chave"
        placeholder="Um título, um autor, uma vontade de ler…"
        @input="suggestions = true"
        @focus="suggestions = true"
        @blur="blur"
      /><button
        v-if="query"
        class="icon-button"
        aria-label="Limpar busca"
        @click="query = ''"
      >
        <X />
      </button>
      <div v-if="suggestions && query" class="suggestions">
        <button
          v-for="b in matching"
          :key="b.id"
          @click="
            query = b.title;
            suggestions = false;
          "
        >
          <BookOpen :size="18" /><span
            >{{ b.title }}<small>{{ b.author }}</small></span
          ><ArrowUpRight :size="17" />
        </button>
      </div>
    </div>
    <div class="catalog-layout">
      <button
        class="filter-toggle button"
        :aria-expanded="filters"
        @click="filters = !filters"
      >
        <SlidersHorizontal :size="19" />Filtrar livros
      </button>
      <aside :class="['filters-panel', { open: filters }]">
        <div class="filter-heading">
          <h2>Refine sua descoberta</h2>
          <button
            class="icon-button"
            aria-label="Fechar filtros"
            @click="filters = false"
          >
            <X />
          </button>
        </div>
        <label class="field"
          >Gênero<select v-model="genre">
            <option v-for="v in genres" :key="v">{{ v }}</option>
          </select></label
        ><label class="field"
          >Idioma<select v-model="language">
            <option v-for="v in languages" :key="v">{{ v }}</option>
          </select></label
        ><label class="field"
          >Formato<select v-model="format">
            <option>Todos</option>
            <option>PDF</option>
            <option>EPUB</option>
          </select></label
        ><label class="field"
          >Disponibilidade<select v-model="availability">
            <option>Todos</option>
            <option>Leitura online</option>
            <option>Download</option>
          </select></label
        ><button class="underlined" @click="reset">
          Limpar filtros <X :size="15" />
        </button>
      </aside>
      <div>
        <div class="results-bar">
          <span>{{ filtered.length }} histórias encontradas</span
          ><label
            >Ordenar por
            <select v-model="sort">
              <option value="new">Novidades</option>
              <option value="reads">Mais lidos</option>
              <option value="downloads">Mais baixados</option>
              <option value="alpha">A → Z</option>
            </select></label
          >
        </div>
        <BookGrid v-if="filtered.length" :books="filtered" /><EmptyState
          v-else
          title="Ainda não encontramos essa história."
          ><p>
            Experimente o nome do autor, outro gênero ou uma palavra mais curta.
          </p>
          <button class="button dark" @click="reset">
            Limpar busca e filtros
          </button></EmptyState
        >
      </div>
    </div>
  </div>
</template>
