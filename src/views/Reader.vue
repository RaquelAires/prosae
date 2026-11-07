<script setup lang="ts">
import {
  ref,
  shallowRef,
  computed,
  onMounted,
  onBeforeUnmount,
  watch,
  nextTick,
} from "vue";
import { useRoute } from "vue-router";
import {
  ArrowLeft,
  Bookmark,
  Expand,
  List,
  Minus,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-vue-next";
import { state, findBook, api, login } from "../store";
import LoadingState from "../components/LoadingState.vue";
type Chapter = { title: string; parts: { tag: string; text: string }[] };
const route = useRoute(),
  book = computed(() => findBook(String(route.params.id))),
  busy = ref(true),
  error = ref(""),
  pdf = shallowRef<any>(null),
  chapters = shallowRef<Chapter[]>([]),
  index = ref(0),
  count = ref(1),
  font = ref(21),
  spacing = ref(1.9),
  theme = ref("sepia"),
  zoom = ref(1),
  fit = ref(true),
  toc = ref(false),
  bookmark = ref(""),
  sync = ref(""),
  rendering = ref(false),
  canvas = ref<HTMLCanvasElement>(),
  area = ref<HTMLDivElement>();
let docTask: any,
  renderTask: any,
  saveTimer: ReturnType<typeof setTimeout>,
  ready = false,
  stopped = false,
  restoreScroll = 0;
const progress = computed(() =>
  Math.round(((index.value + 1) / count.value) * 100),
);
async function load() {
  if (!book.value) {
    error.value = "Livro não encontrado.";
    busy.value = false;
    return;
  }
  const b = book.value;
  try {
    if (!b.online)
      throw new Error(
        "O autor não disponibilizou a leitura online desta obra.",
      );
    const shelf = state.me.shelf.find((s) => s.book === b.id);
    let resume: any;
    try {
      resume = JSON.parse(
        shelf?.location ||
          sessionStorage.getItem("prosae-reading-" + b.id) ||
          "null",
      );
    } catch {}
    bookmark.value = shelf?.bookmark || "";
    const response = await fetch("/api/file/" + b.id);
    if (!response.ok) {
      const d: any = await response.json();
      throw new Error(d.error);
    }
    const buffer = await response.arrayBuffer();
    if (b.format === "PDF") {
      const lib = await import("pdfjs-dist");
      lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      docTask = lib.getDocument({ data: buffer, isEvalSupported: false });
      const result = await docTask.promise;
      if (stopped) {
        await result.destroy();
        return;
      }
      pdf.value = result;
      count.value = result.numPages;
    } else {
      const JSZip = (await import("jszip")).default,
        zip = await JSZip.loadAsync(buffer),
        container = zip.file("META-INF/container.xml");
      if (!container) throw new Error("Estrutura EPUB inválida.");
      const parser = new DOMParser(),
        xml = parser.parseFromString(
          await container.async("text"),
          "application/xml",
        ),
        root = xml
          .getElementsByTagName("rootfile")[0]
          ?.getAttribute("full-path");
      if (!root || !zip.file(root))
        throw new Error("Conteúdo EPUB não encontrado.");
      const opf = parser.parseFromString(
          await zip.file(root)!.async("text"),
          "application/xml",
        ),
        base = root.includes("/")
          ? root.slice(0, root.lastIndexOf("/") + 1)
          : "",
        items = new Map(
          Array.from(opf.getElementsByTagName("item")).map((n) => [
            n.getAttribute("id"),
            n.getAttribute("href"),
          ]),
        ),
        content: Chapter[] = [];
      for (const ref of Array.from(opf.getElementsByTagName("itemref"))) {
        const href = items.get(ref.getAttribute("idref"));
        if (!href) continue;
        const file = zip.file(
          decodeURIComponent(
            new URL(base + href, "https://epub.local/").pathname.slice(1),
          ),
        );
        if (!file) continue;
        const doc = parser.parseFromString(
          await file.async("text"),
          "application/xhtml+xml",
        );
        doc
          .querySelectorAll("script,style,iframe,object,embed,form,svg,math")
          .forEach((n) => n.remove());
        const body = doc.querySelector("body");
        if (!body) continue;
        const parts = Array.from(
          body.querySelectorAll("h1,h2,h3,p,li,blockquote,pre"),
        )
          .filter((el) => !el.parentElement?.closest("p,li,blockquote"))
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.trim() || "",
          }))
          .filter((x) => x.text);
        if (!parts.length && body.textContent?.trim())
          parts.push({ tag: "p", text: body.textContent.trim() });
        if (parts.length)
          content.push({
            title:
              doc.querySelector("h1,h2,title")?.textContent?.trim() ||
              "Capítulo " + (content.length + 1),
            parts,
          });
      }
      if (!content.length)
        throw new Error(
          "Não encontramos texto legível neste EPUB. Obras com DRM não são compatíveis.",
        );
      chapters.value = content;
      count.value = content.length;
    }
    if (stopped) return;
    index.value = Math.max(
      0,
      Math.min(count.value - 1, Number(resume?.index) || 0),
    );
    restoreScroll = Number(resume?.scroll) || 0;
    busy.value = false;
    ready = true;
    await nextTick();
    await renderPage();
    if (area.value) area.value.scrollTop = restoreScroll;
    api("read/" + b.id, {}).catch(() => {});
    scheduleSave();
  } catch (e: any) {
    if (!stopped) {
      error.value = e.message || "Não foi possível abrir este arquivo.";
      busy.value = false;
    }
  }
}
let renderingVersion = 0;
async function renderPage() {
  if (!pdf.value || !canvas.value || busy.value) return;
  const version = ++renderingVersion;
  renderTask?.cancel();
  rendering.value = true;
  try {
    const page = await pdf.value.getPage(index.value + 1);
    if (version !== renderingVersion || stopped) return;
    const original = page.getViewport({ scale: 1 }),
      scale = fit.value
        ? Math.max(260, (area.value?.clientWidth || 850) - 50) / original.width
        : zoom.value,
      viewport = page.getViewport({ scale }),
      pixel = Math.min(window.devicePixelRatio || 1, 2),
      c = canvas.value;
    c.width = viewport.width * pixel;
    c.height = viewport.height * pixel;
    c.style.width = viewport.width + "px";
    c.style.height = viewport.height + "px";
    renderTask = page.render({
      canvasContext: c.getContext("2d"),
      canvas: c,
      viewport,
      transform: pixel === 1 ? undefined : [pixel, 0, 0, pixel, 0, 0],
    });
    await renderTask.promise;
  } catch (e: any) {
    if (e.name !== "RenderingCancelledException")
      error.value = "Não foi possível desenhar esta página.";
  } finally {
    if (version === renderingVersion) rendering.value = false;
  }
}
async function persist(mark = bookmark.value, done = false) {
  if (!ready || busy.value || error.value || !book.value) return;
  const location = JSON.stringify({
    index: index.value,
    scroll: area.value?.scrollTop || 0,
  });
  try {
    sessionStorage.setItem("prosae-reading-" + book.value.id, location);
  } catch {}
  if (!state.me.user) return;
  await api("shelf", {
    book: book.value.id,
    status: done ? "Concluídos" : "Lendo",
    progress: done ? 100 : progress.value,
    location,
    bookmark: mark,
  });
  sync.value = done
    ? "Leitura concluída. Livro movido para Concluídos."
    : "Leitura sincronizada";
}
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(
    () =>
      persist().catch(
        () => (sync.value = "Não foi possível sincronizar agora."),
      ),
    900,
  );
}
async function go(delta: number) {
  const next = index.value + delta;
  if (next < 0 || next >= count.value) return;
  await persist().catch(() => {});
  index.value = next;
  toc.value = false;
  await nextTick();
  if (area.value) area.value.scrollTop = 0;
}
async function mark() {
  if (!state.me.user) {
    login();
    return;
  }
  const value = JSON.stringify({
    index: index.value,
    scroll: area.value?.scrollTop || 0,
  });
  try {
    await persist(value);
    bookmark.value = value;
    sync.value = "Marcador salvo";
  } catch {
    sync.value = "Não foi possível salvar o marcador.";
  }
}
async function jumpMark() {
  try {
    const m = JSON.parse(bookmark.value);
    index.value = Math.min(count.value - 1, m.index);
    await nextTick();
    if (area.value) area.value.scrollTop = m.scroll || 0;
  } catch {}
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    sync.value = "Tela cheia não disponível neste navegador.";
  }
}
function key(e: KeyboardEvent) {
  if ((e.target as HTMLElement).matches("input,select,textarea")) return;
  if (e.key === "ArrowRight") go(1);
  if (e.key === "ArrowLeft") go(-1);
}
watch([index, zoom, fit], async () => {
  await nextTick();
  await renderPage();
  scheduleSave();
});
onMounted(() => {
  load();
  window.addEventListener("keydown", key);
  window.addEventListener("resize", renderPage);
});
onBeforeUnmount(() => {
  persist().catch(() => {});
  stopped = true;
  clearTimeout(saveTimer);
  renderTask?.cancel();
  docTask?.destroy();
  window.removeEventListener("keydown", key);
  window.removeEventListener("resize", renderPage);
});
</script>
<template>
  <div :class="['reader', 'reader-' + theme]">
    <header class="reader-header">
      <RouterLink
        :to="book ? '/livro/' + book.id : '/explorar'"
        class="reader-back"
        ><ArrowLeft :size="20" /><span>Voltar ao livro</span></RouterLink
      >
      <div>
        <strong>{{ book?.title }}</strong
        ><small>{{ book?.author }}</small>
      </div>
      <button
        class="icon-button"
        aria-label="Alternar tela cheia"
        @click="fullscreen"
      >
        <Expand :size="21" />
      </button>
    </header>
    <div class="reader-toolbar">
      <button :aria-expanded="toc" @click="toc = !toc">
        <List :size="18" />Sumário</button
      ><template v-if="book?.format === 'EPUB'"
        ><div class="font-controls">
          <button
            aria-label="Diminuir fonte"
            @click="font = Math.max(14, font - 2)"
          >
            A−</button
          ><span>{{ font }}px</span
          ><button
            aria-label="Aumentar fonte"
            @click="font = Math.min(36, font + 2)"
          >
            A+
          </button>
        </div>
        <label
          >Espaçamento<select v-model.number="spacing">
            <option :value="1.5">Compacto</option>
            <option :value="1.9">Confortável</option>
            <option :value="2.3">Amplo</option>
          </select></label
        ><label
          >Tema<select v-model="theme">
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
            <option value="sepia">Sépia</option>
          </select></label
        ></template
      ><template v-else
        ><button
          aria-label="Diminuir zoom"
          @click="
            fit = false;
            zoom = Math.max(0.4, zoom - 0.2);
          "
        >
          <Minus :size="18" /></button
        ><span>{{ fit ? "Largura" : Math.round(zoom * 100) + "%" }}</span
        ><button
          aria-label="Aumentar zoom"
          @click="
            fit = false;
            zoom = Math.min(3, zoom + 0.2);
          "
        >
          <Plus :size="18" /></button
        ><button @click="fit = true">Ajustar à largura</button></template
      ><button class="bookmark-action" @click="mark">
        <Bookmark
          :size="18"
          :fill="bookmark ? 'currentColor' : 'none'"
        />Marcar</button
      ><button v-if="bookmark" @click="jumpMark">Ir ao marcador</button
      ><button
        v-if="index === count - 1 && state.me.user && !busy"
        @click="persist(bookmark, true)"
      >
        Concluir leitura
      </button>
    </div>
    <aside v-if="toc" class="reader-toc">
      <div>
        <h2>Sumário</h2>
        <button
          class="icon-button"
          aria-label="Fechar sumário"
          @click="toc = false"
        >
          <X />
        </button>
      </div>
      <button
        v-for="(_, i) in count"
        :key="i"
        :class="{ active: i === index }"
        @click="
          index = i;
          toc = false;
        "
      >
        {{
          book?.format === "PDF"
            ? "Página " + (i + 1)
            : chapters[i]?.title || "Capítulo " + (i + 1)
        }}
      </button>
    </aside>
    <div ref="area" class="reading-area" @scroll="scheduleSave">
      <LoadingState v-if="busy" />
      <div v-else-if="error" role="alert" class="reader-error">
        <h2>Não foi possível abrir esta leitura.</h2>
        <p>{{ error }}</p>
        <RouterLink to="/explorar">Voltar à biblioteca</RouterLink>
      </div>
      <div v-else-if="book?.format === 'PDF'" class="pdf-page">
        <span v-if="rendering" class="render-status" role="status"
          >Preparando página…</span
        ><canvas
          ref="canvas"
          :aria-label="'Página ' + (index + 1) + ' do livro ' + book.title"
        />
      </div>
      <article
        v-else
        class="epub-page"
        :style="{ fontSize: font + 'px', lineHeight: spacing }"
      >
        <template v-for="(part, i) in chapters[index]?.parts" :key="i"
          ><h2 v-if="part.tag.startsWith('h')">{{ part.text }}</h2>
          <blockquote v-else-if="part.tag === 'blockquote'">
            {{ part.text }}
          </blockquote>
          <p v-else>{{ part.text }}</p></template
        >
      </article>
    </div>
    <footer class="reader-footer">
      <button :disabled="index === 0 || busy" @click="go(-1)">
        <ChevronLeft :size="20" /><span>Anterior</span>
      </button>
      <div>
        <span
          >{{ book?.format === "PDF" ? "Página" : "Capítulo" }}
          {{ index + 1 }} de {{ count }} · {{ progress }}%</span
        >
        <div class="progress-line">
          <i :style="{ width: progress + '%' }" />
        </div>
        <small role="status"
          ><template v-if="state.me.user">{{
            sync || "Seu progresso será sincronizado."
          }}</template
          ><a
            v-else
            :href="'/signin-with-chatgpt?return_to=/ler/' + book?.id"
            target="_top"
            >Entre para sincronizar a leitura entre dispositivos.</a
          ></small
        >
      </div>
      <button :disabled="index === count - 1 || busy" @click="go(1)">
        <span>Próximo</span><ChevronRight :size="20" />
      </button>
    </footer>
  </div>
</template>
