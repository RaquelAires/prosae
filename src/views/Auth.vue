<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowUpRight,
  ArrowLeft,
  Eye,
  EyeOff,
  BookOpen,
  PenLine,
  Bookmark,
  LockKeyhole,
  LoaderCircle,
} from "lucide-vue-next";
import { api, refresh, notify, safeReturnTo } from "../store";
const route = useRoute(),
  router = useRouter(),
  signup = computed(() => route.path === "/cadastro");
const form = reactive({
  name: "",
  email: "",
  password: "",
  confirm: "",
  remember: false,
});
const busy = ref(false),
  error = ref(""),
  show = ref(false),
  errorBox = ref<HTMLDivElement>();
const destination = computed(() => safeReturnTo(route.query.retorno));
watch(
  () => route.path,
  () => {
    error.value = "";
    form.password = "";
    form.confirm = "";
    show.value = false;
  },
);
async function submit() {
  error.value = "";
  if (signup.value && form.password !== form.confirm) {
    error.value = "As senhas não coincidem.";
    return;
  }
  busy.value = true;
  try {
    await api(signup.value ? "auth/register" : "auth/login", {
      name: form.name,
      email: form.email,
      password: form.password,
      remember: form.remember,
    });
    form.password = "";
    form.confirm = "";
    await refresh();
    notify(
      signup.value
        ? "Sua conta está pronta. Boas leituras!"
        : "Que bom ter você de volta!",
    );
    await router.replace(destination.value);
  } catch (e: any) {
    error.value = e.message;
    errorBox.value?.focus();
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <section class="auth-section">
    <div class="container auth-layout">
      <aside class="auth-art">
        <span class="eyebrow">Um Brasil inteiro para chamar de seu</span>
        <h1>SUAS PRÓXIMAS<br /><em>HISTÓRIAS</em><br />COMEÇAM AQUI.</h1>
        <p>
          Guarde descobertas, encontre sua voz e continue de onde a imaginação
          parou.
        </p>
        <div class="auth-animal">
          <div />
          <img
            src="/assets/onca.png"
            alt="Onça-pintada ilustrada, símbolo da Prosaê"
          />
        </div>
        <span class="auth-art-note">Muitos sotaques. Um lugar para você.</span>
      </aside>
      <div class="auth-form-panel">
        <RouterLink to="/explorar" class="auth-back"
          ><ArrowLeft :size="16" />Explorar sem entrar</RouterLink
        >
        <div class="auth-tabs">
          <RouterLink
            :to="{ path: '/entrar', query: { retorno: destination } }"
            :class="{ active: !signup }"
            >Entrar</RouterLink
          ><RouterLink
            :to="{ path: '/cadastro', query: { retorno: destination } }"
            :class="{ active: signup }"
            >Criar conta</RouterLink
          >
        </div>
        <span class="eyebrow">{{
          signup
            ? "Toda grande história começa assim"
            : "Sua estante estava com saudade"
        }}</span>
        <h2>
          {{ signup ? "A próxima página é sua." : "Bom ter você por aqui." }}
        </h2>
        <p class="auth-intro">
          {{
            signup
              ? "Crie sua conta gratuita para ler, guardar e publicar suas histórias."
              : "Entre na sua conta para continuar suas leituras e cuidar das suas histórias."
          }}
        </p>
        <div
          v-if="error"
          ref="errorBox"
          class="form-error"
          role="alert"
          tabindex="-1"
        >
          {{ error }}
        </div>
        <form @submit.prevent="submit">
          <fieldset :disabled="busy" class="auth-fields">
            <label v-if="signup" class="field"
              >Seu nome<input
                v-model="form.name"
                name="name"
                autocomplete="name"
                minlength="2"
                maxlength="80"
                required
                placeholder="Como podemos chamar você?" /></label
            ><label class="field"
              >E-mail<input
                v-model="form.email"
                name="email"
                type="email"
                autocomplete="email"
                maxlength="254"
                required
                placeholder="voce@exemplo.com" /></label
            ><label class="field"
              >Senha
              <div class="password-field">
                <input
                  v-model="form.password"
                  name="password"
                  :type="show ? 'text' : 'password'"
                  :autocomplete="signup ? 'new-password' : 'current-password'"
                  :minlength="signup ? 12 : undefined"
                  maxlength="128"
                  required
                  :placeholder="
                    signup
                      ? 'Crie uma senha com pelo menos 12 caracteres'
                      : 'Sua senha'
                  "
                /><button
                  type="button"
                  :aria-label="show ? 'Ocultar senha' : 'Mostrar senha'"
                  :aria-pressed="show"
                  @click="show = !show"
                >
                  <EyeOff v-if="show" :size="19" /><Eye v-else :size="19" />
                </button>
              </div>
              <small v-if="signup"
                >Use entre 12 e 128 caracteres. Uma frase longa também
                vale.</small
              ></label
            ><label v-if="signup" class="field"
              >Confirmar senha<input
                v-model="form.confirm"
                name="confirm"
                :type="show ? 'text' : 'password'"
                autocomplete="new-password"
                minlength="12"
                maxlength="128"
                required
                placeholder="Repita sua senha" /></label
            ><label class="check-field auth-remember"
              ><input v-model="form.remember" type="checkbox" />Manter conectado
              por 30 dias</label
            ><button type="submit" class="button dark auth-submit">
              <LoaderCircle v-if="busy" :size="19" class="spin" /><template
                v-else
                >{{ signup ? "Criar minha conta" : "Entrar na minha conta"
                }}<ArrowUpRight :size="20" /></template
              ><span v-if="busy">{{
                signup ? "Criando sua conta…" : "Entrando…"
              }}</span>
            </button>
          </fieldset>
        </form>
        <div class="auth-features">
          <span><Bookmark :size="16" />Sua estante</span
          ><span><BookOpen :size="16" />Seu ritmo</span
          ><span><PenLine :size="16" />Sua voz</span>
        </div>
        <p class="auth-security">
          <LockKeyhole :size="14" />Seus dados de acesso são protegidos. A senha
          não é exibida no perfil.
        </p>
      </div>
    </div>
  </section>
</template>
