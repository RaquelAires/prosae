<script setup lang="ts">
import { ArrowUpRight } from "lucide-vue-next";
withDefaults(defineProps<{ kicker: string; title: string; link?: boolean }>(), {
  link: true,
});
</script>
<template>
  <div class="section-title">
    <div>
      <span class="eyebrow">{{ kicker }}</span>
      <h2>{{ title }}</h2>
    </div>
    <RouterLink v-if="link" to="/explorar" class="underlined"
      >Ver todos os livros <ArrowUpRight :size="18"
    /></RouterLink>
  </div>
</template>
