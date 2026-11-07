<script setup lang="ts">
import { Leaf } from "lucide-vue-next";
import type { Book } from "../types";
import { imageUrl } from "../store";
defineProps<{ book: Partial<Book>; large?: boolean }>();
</script>
<template>
  <div
    :class="['cover', { 'large-cover': large }]"
    :style="{ background: book.color }"
  >
    <img
      v-if="book.cover"
      :src="imageUrl(book.cover)"
      :alt="'Capa de ' + book.title"
      :style="{ objectPosition: '50% ' + (book.crop || 50) + '%' }"
      :loading="large ? 'eager' : 'lazy'"
    />
    <div v-else class="cover-placeholder">
      <span>{{ book.genre }}</span
      ><strong>{{ book.title || "Sua próxima história" }}</strong
      ><Leaf /><small>{{ book.author }}</small>
    </div>
  </div>
</template>
