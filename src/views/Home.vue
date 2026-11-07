<script setup lang="ts">
import { ref, watch } from "vue";
import { ArrowUpRight, PenLine, Waves, Leaf, Star } from "lucide-vue-next";
import { state, regions } from "../store";
import BookGrid from "../components/BookGrid.vue";
import SectionTitle from "../components/SectionTitle.vue";
const paused = ref(false);
watch(paused, (v) =>
  document.documentElement.classList.toggle("motion-off", v),
);
const moments = [
  ["Romance", "Para sentir tudo.", "yellow", "♡"],
  ["Fantasia", "Para ir além.", "blue", "✦"],
  ["Poesia", "Para respirar.", "green", "❧"],
  ["Contos", "Para uma pausa.", "rust", "≋"],
];
</script>
<template>
  <section class="hero">
    <div class="container hero-grid">
      <div class="hero-copy">
        <span class="eyebrow"
          ><span class="mini-flag" />Uma biblioteca com a nossa cara</span
        >
        <h1>HISTÓRIAS QUE<br />ATRAVESSAM<br /><em>O BRASIL.</em></h1>
        <p>
          Descubra novas vozes, encontre sua próxima leitura e leve histórias
          com você.
        </p>
        <div class="hero-buttons">
          <RouterLink to="/explorar" class="button yellow"
            >Explorar livros <ArrowUpRight :size="21" /></RouterLink
          ><RouterLink to="/publicar" class="button outline"
            >Publicar minha obra <PenLine :size="19"
          /></RouterLink>
        </div>
        <div class="hero-caption">
          <span>01 — MUITOS SOTAQUES. INFINITAS HISTÓRIAS.</span
          ><Waves :size="30" />
        </div>
      </div>
      <div
        class="hero-art"
        aria-label="Onça-pintada brasileira ilustrada entre folhas"
      >
        <div class="sun-disc" />
        <div class="blue-block" />
        <div class="botanic leaf-one"><Leaf /></div>
        <div class="botanic leaf-two"><Leaf /></div>
        <img
          class="hero-jaguar"
          src="/assets/onca.png"
          alt="Onça-pintada em ilustração brasileira"
        /><Star class="hero-star" />
        <div class="art-label">
          A imaginação<br />é da nossa natureza. <ArrowUpRight />
        </div>
        <button
          class="motion-toggle"
          :aria-pressed="paused"
          @click="paused = !paused"
        >
          {{ paused ? "Ativar movimentos" : "Pausar movimentos" }}
        </button>
      </div>
    </div>
  </section>
  <div class="ticker">
    <span>DA NOSSA TERRA</span><Star :size="19" /><span>PARA A SUA ESTANTE</span
    ><Star :size="19" /><span>TODA VOZ TEM LUGAR</span><Star :size="19" /><span
      >PROSA QUE APROXIMA</span
    >
  </div>
  <section class="container section">
    <SectionTitle
      kicker="Uma nova história acabou de começar"
      title="Acabaram de chegar"
    /><BookGrid
      :books="
        [...state.books].sort((a, b) => b.created - a.created).slice(0, 4)
      "
    />
  </section>
  <section class="regional">
    <div class="container regional-grid">
      <div>
        <span class="eyebrow">Cinco regiões. Um país de vozes.</span>
        <h2>DAQUI,<br />DE TODO<br /><em>CANTO.</em></h2>
        <p>
          Tem um Brasil inteiro entre as páginas. Escolha um canto e deixe uma
          história te levar.
        </p>
        <div class="region-links">
          <RouterLink
            v-for="(region, i) in regions"
            :key="region"
            :to="{ path: '/explorar', query: { q: region } }"
            ><span>0{{ i + 1 }}</span
            >{{ region }}<ArrowUpRight :size="18"
          /></RouterLink>
        </div>
      </div>
      <div class="regional-art">
        <img
          src="/assets/arara.png"
          alt="Arara-canindé azul e amarela"
          loading="lazy"
        /><span class="regional-stamp"
          >Nossa diversidade<br />também se escreve.</span
        >
      </div>
    </div>
  </section>
  <section class="container section">
    <SectionTitle
      kicker="Palavras que encontram o seu ritmo"
      title="Uma leitura para cada momento"
      :link="false"
    />
    <div class="moment-grid">
      <RouterLink
        v-for="[genre, title, color, mark] in moments"
        :key="genre"
        :class="['moment', color]"
        :to="{ path: '/explorar', query: { q: genre } }"
        ><span>{{ genre }}</span>
        <h3>{{ title }}</h3>
        <ArrowUpRight /><span class="moment-mark" aria-hidden="true">{{
          mark
        }}</span></RouterLink
      >
    </div>
  </section>
  <section class="container section independent">
    <SectionTitle
      kicker="Encontre quem escreve novos caminhos"
      title="Vozes independentes"
    /><BookGrid :books="state.books.slice(0, 4)" />
    <div class="author-call">
      <div>
        <span class="eyebrow">Ei, autor. A próxima página é sua.</span>
        <h2>Seu Brasil merece ser lido.</h2>
        <p>
          Compartilhe sua obra, encontre leitores e faça parte dessa história.
        </p>
      </div>
      <RouterLink to="/publicar" class="button yellow"
        >Comece sua história <ArrowUpRight
      /></RouterLink>
    </div>
  </section>
</template>
