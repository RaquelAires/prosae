<script setup lang="ts">
import type { Book } from "../types";
import BookCard from "./BookCard.vue";
defineProps<{ books: Book[] }>();
</script>
<template>
  <div class="book-grid">
    <BookCard v-for="book in books" :key="book.id" :book="book" />
  </div>
</template>
