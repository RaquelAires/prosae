<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { Search, ArrowUpRight } from "lucide-vue-next";
import { state, imageUrl } from "../store";
import BookGrid from "../components/BookGrid.vue";
import SectionTitle from "../components/SectionTitle.vue";
import EmptyState from "../components/EmptyState.vue";
const route = useRoute(),
  query = ref(""),
  profile = computed(() => state.authors.find((p) => p.id === route.params.id)),
  filtered = computed(() =>
    state.authors.filter((p) =>
      (p.name + " " + p.region)
        .toLowerCase()
        .includes(query.value.toLowerCase()),
    ),
  );
const initials = (n: string) =>
  n
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("");
</script>
<template>
  <div class="container section">
    <template v-if="route.params.id"
      ><template v-if="profile"
        ><RouterLink to="/autores" class="back-link"
          >← Todas as vozes</RouterLink
        >
        <div class="author-profile">
          <div class="avatar">
            <img
              v-if="profile.photo"
              :src="imageUrl(profile.photo)"
              :alt="'Foto de ' + profile.name"
            /><span v-else>{{ initials(profile.name) }}</span>
          </div>
          <div>
            <span class="eyebrow"
              >Uma voz de {{ profile.region || "todo o Brasil" }}</span
            >
            <h1>{{ profile.name }}</h1>
            <p>{{ profile.bio || "Uma nova voz chegando à Prosaê." }}</p>
            <a
              v-if="profile.link"
              :href="profile.link"
              target="_blank"
              rel="noopener noreferrer"
              class="underlined"
              >Conheça o autor <ArrowUpRight :size="18"
            /></a>
          </div>
        </div>
        <SectionTitle
          kicker="Da imaginação para a sua estante"
          title="Obras publicadas"
          :link="false" /><BookGrid
          :books="
            state.books.filter((b) => b.authorId === profile!.id)
          " /></template
      ><EmptyState v-else title="Autor não encontrado."
        ><RouterLink to="/autores">Voltar ao diretório</RouterLink></EmptyState
      ></template
    ><template v-else
      ><div class="page-heading">
        <span class="eyebrow">Gente que transforma palavras em mundos</span>
        <h1>O Brasil tem <em>muitas vozes.</em></h1>
        <p>
          Encontre quem está escrevendo o próximo capítulo da nossa literatura.
        </p>
      </div>
      <div class="search-wrap">
        <Search /><input
          v-model="query"
          aria-label="Buscar autores"
          placeholder="Procure um nome, uma região…"
        />
      </div>
      <div class="authors-grid">
        <RouterLink
          v-for="p in filtered"
          :key="p.id"
          :to="'/autores/' + p.id"
          class="author-card"
          ><div class="avatar">
            <img
              v-if="p.photo"
              :src="imageUrl(p.photo)"
              :alt="'Foto de ' + p.name"
            /><span v-else>{{ initials(p.name) }}</span>
          </div>
          <span class="tiny">{{ p.region || "Brasil" }}</span>
          <h2>{{ p.name }}</h2>
          <p>{{ p.bio || "Uma nova voz para descobrir." }}</p>
          <span class="underlined"
            >Conhecer a obra <ArrowUpRight :size="17" /></span
        ></RouterLink>
      </div>
      <EmptyState v-if="!filtered.length" title="Nenhum autor por aqui ainda."
        ><button @click="query = ''">Limpar busca</button></EmptyState
      ></template
    >
  </div>
</template>
