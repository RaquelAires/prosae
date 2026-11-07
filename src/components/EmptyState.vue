<script setup lang="ts">
import { BookOpen } from "lucide-vue-next";
defineProps<{ title: string }>();
</script>
<template>
  <div class="empty">
    <BookOpen :size="38" />
    <h2>{{ title }}</h2>
    <slot />
  </div>
</template>
