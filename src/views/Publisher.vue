<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  ImagePlus,
  UploadCloud,
  Save,
} from "lucide-vue-next";
import {
  state,
  api,
  refresh,
  notify,
  filesize,
  regions,
  genres,
} from "../store";
import BookCover from "../components/BookCover.vue";
import type { Book } from "../types";
const route = useRoute(),
  router = useRouter(),
  step = ref(0),
  id = ref(""),
  busy = ref(false),
  progress = ref(0),
  error = ref(""),
  filename = ref("");
const blank = () => ({
  title: "",
  subtitle: "",
  author: state.me.profile?.name || state.me.user?.name || "",
  synopsis: "",
  genre: "Romance",
  keywords: "",
  language: "Português",
  year: 2026,
  pages: 1,
  file: "",
  cover: "",
  crop: 50,
  format: "PDF",
  size: 0,
  online: true,
  download: true,
  atmosphere: "",
  themes: "",
  quote: "",
  excerpt: "",
  region: "",
  color: "#00613f",
  rights: false,
});
const data = reactive<any>(blank());
watch(
  () => route.query.editar,
  (v) => {
    const b = state.me.publications.find((b) => b.id === v);
    Object.assign(data, blank(), b || {}, { rights: false });
    id.value = b?.id || "";
    filename.value = b ? "Arquivo " + b.format + " enviado anteriormente" : "";
    step.value = 0;
  },
  { immediate: true },
);
async function upload(event: Event, kind: "book" | "cover") {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  error.value = "";
  busy.value = true;
  progress.value = 0;
  try {
    if (file.size > (kind === "book" ? 25 : 5) * 1048576)
      throw new Error(
        "O limite é " +
          (kind === "book" ? "25 MB para livros." : "5 MB para capas."),
      );
    if (kind === "book") {
      if (!/\.(pdf|epub)$/i.test(file.name))
        throw new Error("Escolha um arquivo PDF ou EPUB.");
      if (/\.epub$/i.test(file.name)) {
        const JSZip = (await import("jszip")).default,
          zip = await JSZip.loadAsync(file);
        if (
          (await zip.file("mimetype")?.async("text")) !==
            "application/epub+zip" ||
          !zip.file("META-INF/container.xml")
        )
          throw new Error("Este arquivo não é um EPUB válido.");
      } else if ((await file.slice(0, 5).text()) !== "%PDF-")
        throw new Error("Este arquivo não é um PDF válido.");
    } else if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
      throw new Error("Use uma capa em JPG, PNG ou WebP.");
    const result: any = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload?kind=" + kind);
      xhr.setRequestHeader("x-filename", encodeURIComponent(file.name));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable)
          progress.value = Math.round((e.loaded / e.total) * 100);
      };
      xhr.onerror = () =>
        reject(new Error("A conexão caiu durante o envio. Tente novamente."));
      xhr.onload = () => {
        try {
          const d = JSON.parse(xhr.responseText);
          xhr.status >= 400 ? reject(new Error(d.error)) : resolve(d);
        } catch {
          reject(new Error("Resposta inválida durante o envio."));
        }
      };
      xhr.send(file);
    });
    if (kind === "book") {
      Object.assign(data, {
        file: result.id,
        size: result.size,
        format: result.format,
      });
      filename.value = file.name;
      if (result.format === "PDF")
        try {
          const lib = await import("pdfjs-dist");
          lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
          const pdf = await lib.getDocument({
            data: await file.arrayBuffer(),
            isEvalSupported: false,
          }).promise;
          data.pages = pdf.numPages;
          await pdf.destroy();
        } catch {
          notify("Informe a quantidade de páginas na próxima etapa.");
        }
    } else data.cover = result.id;
    progress.value = 100;
    notify(
      kind === "book"
        ? "Livro enviado com sucesso."
        : "Capa enviada. Ajuste o enquadramento abaixo.",
    );
  } catch (e: any) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
function next() {
  if (step.value === 0 && !data.file) {
    error.value = "Envie o arquivo do livro para continuar.";
    return;
  }
  if (step.value === 1 && !data.cover) {
    error.value = "Envie uma capa para continuar.";
    return;
  }
  if (
    step.value === 2 &&
    (!data.title.trim() || !data.author.trim() || !data.synopsis.trim())
  ) {
    error.value = "Preencha título, nome do autor e sinopse.";
    return;
  }
  error.value = "";
  step.value = Math.min(3, step.value + 1);
}
async function submit(draft: boolean) {
  error.value = "";
  if (!draft && !data.rights) {
    error.value = "Confirme sua autorização para compartilhar esta obra.";
    return;
  }
  busy.value = true;
  try {
    const b = await api("book" + (id.value ? "/" + id.value : ""), {
      ...data,
      status: draft ? "draft" : "published",
    });
    id.value = b.id;
    await refresh();
    notify(
      draft
        ? "Rascunho salvo na sua conta."
        : "Sua história já está na biblioteca!",
    );
    if (!draft) router.push("/estante?aba=publicacoes");
  } catch (e: any) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <div class="container section publisher">
    <div v-if="!state.me.user" class="auth-gate">
      <span class="eyebrow">A próxima página é sua</span>
      <h1>Seu Brasil<br />merece ser lido.</h1>
      <p>
        Entre para publicar livros, guardar rascunhos e encontrar novos
        leitores.
      </p>
      <a
        href="/signin-with-chatgpt?return_to=/publicar"
        target="_top"
        class="button dark"
        >Entrar com ChatGPT <ArrowUpRight :size="20"
      /></a>
    </div>
    <template v-else
      ><div class="page-heading">
        <span class="eyebrow">Do seu mundo para muitos outros</span>
        <h1>{{ id ? "Cuide da sua" : "Publique sua" }} <em>história.</em></h1>
        <p>Um capítulo de cada vez. Você pode salvar e continuar depois.</p>
      </div>
      <ol class="publish-steps">
        <li
          v-for="(label, i) in ['Arquivo', 'Capa', 'Sobre a obra', 'Revisão']"
          :key="label"
          :class="{ active: i === step, done: i < step }"
        >
          <span
            ><Check v-if="i < step" :size="17" /><template v-else>{{
              i + 1
            }}</template></span
          >{{ label }}
        </li>
      </ol>
      <div class="publish-layout">
        <div class="publish-panel">
          <div v-if="error" role="alert" class="form-error">{{ error }}</div>
          <template v-if="step === 0"
            ><span class="eyebrow">01 · As palavras primeiro</span>
            <h2>O começo de uma boa história.</h2>
            <p>
              Envie sua obra em PDF ou EPUB. O arquivo será guardado na sua
              conta.
            </p>
            <label class="upload-zone"
              ><UploadCloud :size="44" /><strong>{{
                filename || "Escolha o arquivo do seu livro"
              }}</strong
              ><span>PDF ou EPUB · até 25 MB</span
              ><input
                type="file"
                accept=".pdf,.epub,application/pdf,application/epub+zip"
                :disabled="busy"
                @change="upload($event, 'book')"
            /></label>
            <p v-if="data.file" class="upload-success">
              <Check :size="18" />{{ data.format }} ·
              {{ filesize(data.size) }} · Arquivo enviado
            </p>
            <p class="helper">
              PDF preserva a diagramação. EPUB adapta o texto à tela. Obras com
              DRM não são compatíveis.
            </p></template
          ><template v-else-if="step === 1"
            ><span class="eyebrow">02 · A primeira impressão</span>
            <h2>Uma capa para abrir caminhos.</h2>
            <p>Escolha a imagem que vai apresentar sua história ao mundo.</p>
            <label class="upload-zone"
              ><ImagePlus :size="42" /><strong>Enviar ou substituir capa</strong
              ><span>JPG, PNG ou WebP · até 5 MB</span
              ><input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                :disabled="busy"
                @change="upload($event, 'cover')" /></label
            ><label v-if="data.cover" class="field"
              >Enquadramento vertical<input
                v-model.number="data.crop"
                type="range"
                min="0"
                max="100"
              /><span class="helper"
                >Mova para ajustar a área visível na prévia.</span
              ></label
            ></template
          ><template v-else-if="step === 2"
            ><span class="eyebrow">03 · Conte um pouco mais</span>
            <h2>O que faz sua obra ser sua?</h2>
            <div class="form-grid">
              <label class="field"
                >Título *<input v-model="data.title" maxlength="140" /></label
              ><label class="field"
                >Subtítulo<input
                  v-model="data.subtitle"
                  maxlength="200" /></label
              ><label class="field"
                >Nome do autor *<input
                  v-model="data.author"
                  maxlength="100" /></label
              ><label class="field"
                >Ano de publicação<input
                  v-model.number="data.year"
                  type="number"
                  min="1500"
                  max="2100" /></label
              ><label class="field"
                >Quantidade de páginas<input
                  v-model.number="data.pages"
                  type="number"
                  min="1"
                  max="20000" /></label
              ><label class="field"
                >Gênero<select v-model="data.genre">
                  <option v-for="g in genres.slice(1)" :key="g">{{ g }}</option>
                </select></label
              ><label class="field"
                >Idioma<select v-model="data.language">
                  <option>Português</option>
                  <option>Espanhol</option>
                  <option>Inglês</option>
                  <option>Outro</option>
                </select></label
              ><label class="field"
                >Região (opcional)<select v-model="data.region">
                  <option value="">Brasil</option>
                  <option v-for="r in regions" :key="r">{{ r }}</option>
                </select></label
              >
            </div>
            <label class="field"
              >Sinopse *<textarea
                v-model="data.synopsis"
                rows="5"
                maxlength="8000"
              /></label
            ><label class="field"
              >Palavras-chave<input
                v-model="data.keywords"
                placeholder="Ex.: amizade, Amazônia, recomeço"
                maxlength="300"
            /></label>
            <h3>Por dentro da história</h3>
            <label class="field"
              >Qual é a atmosfera?<input
                v-model="data.atmosphere"
                maxlength="300"
                placeholder="Ex.: solar, misteriosa, nostálgica" /></label
            ><label class="field"
              >Quais temas atravessam a obra?<input
                v-model="data.themes"
                maxlength="400"
                placeholder="Ex.: pertencimento, natureza, memória" /></label
            ><label class="field"
              >Uma frase de destaque<input
                v-model="data.quote"
                maxlength="500" /></label
            ><label class="field"
              >Trecho de apresentação (opcional)<textarea
                v-model="data.excerpt"
                rows="4"
                maxlength="3000"
              />
            </label>
            <fieldset>
              <legend>Como os leitores podem acessar?</legend>
              <label class="check-field"
                ><input v-model="data.online" type="checkbox" />Leitura
                online</label
              ><label class="check-field"
                ><input v-model="data.download" type="checkbox" />Download do
                arquivo</label
              >
            </fieldset></template
          ><template v-else
            ><span class="eyebrow">04 · Pronto para encontrar leitores?</span>
            <h2>Uma última olhada.</h2>
            <h3>{{ data.title }}</h3>
            <p>
              {{ data.author }} · {{ data.genre }} · {{ data.language }} ·
              {{ data.year }}
            </p>
            <p>{{ data.synopsis }}</p>
            <div class="review-summary">
              <span
                ><FileText :size="18" />{{ data.format }} ·
                {{ filesize(data.size) }} · {{ data.pages }} páginas</span
              ><span>{{
                data.online ? "Leitura online disponível" : "Sem leitura online"
              }}</span
              ><span>{{
                data.download ? "Download disponível" : "Sem download"
              }}</span>
            </div>
            <label class="check-field rights"
              ><input v-model="data.rights" type="checkbox" />Confirmo que sou
              responsável por esta obra e tenho autorização para compartilhar o
              livro e a capa nas condições selecionadas.</label
            >
            <p class="helper">
              Você pode editar ou retirar a obra em Minha estante.
            </p></template
          >
          <div v-if="busy" class="upload-progress" role="status">
            <span>{{
              progress > 0
                ? "Enviando arquivo: " + progress + "%"
                : "Preparando…"
            }}</span
            ><progress max="100" :value="progress" />
          </div>
          <div class="publish-controls">
            <button
              :disabled="busy || step === 0"
              class="button"
              @click="
                step--;
                error = '';
              "
            >
              <ArrowLeft :size="18" />Voltar</button
            ><button
              v-if="step < 3"
              class="button dark"
              :disabled="busy"
              @click="next"
            >
              Continuar <ArrowRight :size="18" /></button
            ><button
              v-else
              class="button dark"
              :disabled="busy"
              @click="submit(false)"
            >
              Publicar obra <ArrowUpRight :size="18" />
            </button>
          </div>
          <button
            class="underlined draft-save"
            :disabled="busy"
            @click="submit(true)"
          >
            <Save :size="17" />Salvar como rascunho
          </button>
        </div>
        <aside class="publish-preview">
          <span class="eyebrow">Assim sua história vai aparecer</span
          ><BookCover :book="data as Partial<Book>" large />
          <h3>{{ data.title || "O título da sua história" }}</h3>
          <p>{{ data.author || "Seu nome de autor" }}</p>
          <span class="pill">{{ data.genre }}</span>
          <p class="helper">
            A prévia acompanha cada detalhe que você preenche.
          </p>
        </aside>
      </div></template
    >
  </div>
</template>
