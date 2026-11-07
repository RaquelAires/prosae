<script setup lang="ts">
import { ArrowUpRight } from "lucide-vue-next";
import type { Book } from "../types";
import BookCover from "./BookCover.vue";
defineProps<{ book: Book }>();
</script>
<template>
  <article class="book-card">
    <RouterLink
      :to="'/livro/' + book.id"
      class="cover-link"
      :aria-label="'Conhecer ' + book.title"
      ><BookCover :book="book" /><span class="cover-hover"
        >Conhecer a história <ArrowUpRight :size="19" /></span
    ></RouterLink>
    <div class="card-top">
      <span class="tiny">{{ book.genre }}</span
      ><span class="file-label">{{ book.format }}</span>
    </div>
    <RouterLink :to="'/livro/' + book.id"
      ><h3>{{ book.title }}</h3></RouterLink
    ><RouterLink class="card-author" :to="'/autores/' + book.authorId">{{
      book.author
    }}</RouterLink>
    <p class="card-summary">{{ book.synopsis.split(" Uma obra")[0] }}</p>
  </article>
</template>
