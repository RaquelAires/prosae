<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import {
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  BookOpen,
  Download,
  Bookmark,
  Leaf,
  Star,
} from "lucide-vue-next";
import { state, findBook, saveBook, filesize } from "../store";
import BookCover from "../components/BookCover.vue";
import BookGrid from "../components/BookGrid.vue";
import SectionTitle from "../components/SectionTitle.vue";
import EmptyState from "../components/EmptyState.vue";
const route = useRoute(),
  expanded = ref(false),
  book = computed(() => findBook(String(route.params.id))),
  saved = computed(() => state.me.shelf.some((s) => s.book === book.value?.id)),
  related = computed(() =>
    state.books
      .filter((b) => b.id !== book.value?.id)
      .sort(
        (a, b) =>
          Number(b.genre === book.value?.genre) -
          Number(a.genre === book.value?.genre),
      )
      .slice(0, 4),
  );
</script>
<template>
  <template v-if="book"
    ><div class="container section">
      <RouterLink to="/explorar" class="back-link"
        >← Voltar à biblioteca</RouterLink
      >
      <div class="book-detail">
        <div class="detail-cover-stage">
          <BookCover :book="book" large /><span class="detail-cover-note"
            >Uma história de {{ book.region || "todo o Brasil" }}</span
          >
        </div>
        <div>
          <span class="eyebrow">{{ book.genre }} · {{ book.language }}</span>
          <h1>{{ book.title }}</h1>
          <p class="subtitle">{{ book.subtitle }}</p>
          <RouterLink class="author-by" :to="'/autores/' + book.authorId"
            >Por {{ book.author }} <ArrowUpRight :size="17"
          /></RouterLink>
          <p :class="['synopsis', { clamped: !expanded }]">
            {{ book.synopsis }}
          </p>
          <button
            v-if="book.synopsis.length > 200"
            class="underlined"
            @click="expanded = !expanded"
          >
            {{ expanded ? "Ler menos" : "Ler a sinopse completa" }}
            <ChevronDown :size="16" />
          </button>
          <div class="book-facts">
            <div>
              <span>Publicação</span><strong>{{ book.year }}</strong>
            </div>
            <div>
              <span>Páginas</span><strong>{{ book.pages }}</strong>
            </div>
            <div>
              <span>Formato</span><strong>{{ book.format }}</strong>
            </div>
            <div>
              <span>Arquivo</span><strong>{{ filesize(book.size) }}</strong>
            </div>
          </div>
          <div class="book-actions">
            <RouterLink
              v-if="book.online"
              :to="'/ler/' + book.id"
              class="button dark"
              ><BookOpen :size="20" />Ler online</RouterLink
            ><a
              v-if="book.download"
              :href="'/api/file/' + book.id + '?download=1'"
              class="button"
              ><Download :size="20" />Baixar livro
              <small>{{ book.format }} · {{ filesize(book.size) }}</small></a
            ><button class="button save-button" @click="saveBook(book)">
              <Bookmark :size="20" :fill="saved ? 'currentColor' : 'none'" />{{
                saved ? "Na minha estante" : "Salvar na minha estante"
              }}
            </button>
          </div>
          <p v-if="book.owner.startsWith('demo-')" class="demo-note">
            Obra de demonstração · Texto original de exemplo e autor fictício.
          </p>
        </div>
      </div>
    </div>
    <section class="inside-story">
      <div class="container">
        <span class="eyebrow">Além da sinopse</span>
        <h2>Por dentro da história</h2>
        <div class="inside-grid">
          <div>
            <Leaf />
            <h3>A atmosfera</h3>
            <p>{{ book.atmosphere || "Uma nova voz para descobrir." }}</p>
          </div>
          <div>
            <Star />
            <h3>O que atravessa as páginas</h3>
            <p>{{ book.themes || book.keywords || book.genre }}</p>
          </div>
          <blockquote>
            “{{ book.quote || book.title }}”<cite>{{ book.author }}</cite>
          </blockquote>
        </div>
      </div>
    </section>
    <section v-if="book.excerpt" class="container section excerpt">
      <span class="eyebrow">Uma primeira página para você</span>
      <h2>Antes de mergulhar…</h2>
      <p>{{ book.excerpt }}</p>
      <RouterLink v-if="book.online" :to="'/ler/' + book.id" class="underlined"
        >Continue essa história <ArrowRight :size="18"
      /></RouterLink>
    </section>
    <section class="container section">
      <SectionTitle
        kicker="Um livro sempre leva a outro"
        title="Talvez você também goste"
      /><BookGrid :books="related" /></section
  ></template>
  <div v-else class="container section">
    <EmptyState title="Livro não encontrado."
      ><RouterLink to="/explorar">Voltar à biblioteca</RouterLink></EmptyState
    >
  </div>
</template>
