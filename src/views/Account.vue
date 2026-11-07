<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import {
  User,
  LogOut,
  ArrowUpRight,
  Eye,
  EyeOff,
  ShieldCheck,
  LoaderCircle,
} from "lucide-vue-next";
import { state, api, notify, logout } from "../store";
const router = useRouter(),
  form = reactive({ current: "", password: "", confirm: "" }),
  busy = ref(false),
  leaving = ref(false),
  error = ref(""),
  success = ref(""),
  show = ref(false);
async function changePassword() {
  error.value = "";
  success.value = "";
  if (form.password !== form.confirm) {
    error.value = "As novas senhas não coincidem.";
    return;
  }
  busy.value = true;
  try {
    await api("auth/password", {
      currentPassword: form.current,
      password: form.password,
    });
    form.current = form.password = form.confirm = "";
    success.value =
      "Senha alterada. As outras sessões da sua conta foram encerradas.";
    notify("Senha atualizada.");
  } catch (e: any) {
    error.value = e.message;
  } finally {
    busy.value = false;
  }
}
async function signOut() {
  leaving.value = true;
  try {
    await logout();
    await router.replace("/entrar");
  } catch (e: any) {
    error.value = e.message;
  } finally {
    leaving.value = false;
  }
}
</script>
<template>
  <div class="container section account-page">
    <div class="page-heading">
      <span class="eyebrow">Um espaço só seu</span>
      <h1>Minha <em>conta.</em></h1>
      <p>Cuide dos seus dados e continue escrevendo sua história.</p>
    </div>
    <div class="account-layout">
      <aside class="account-summary">
        <div class="avatar"><User :size="38" /></div>
        <h2>{{ state.me.profile?.name || state.me.user?.name }}</h2>
        <p>{{ state.me.user?.email }}</p>
        <RouterLink class="button dark" to="/estante?aba=perfil"
          >Editar perfil de autor <ArrowUpRight :size="18" /></RouterLink
        ><RouterLink class="underlined" to="/estante"
          >Abrir minha estante <ArrowUpRight :size="17" /></RouterLink
        ><button
          class="underlined account-logout"
          :disabled="leaving"
          @click="signOut"
        >
          <LogOut :size="17" />{{ leaving ? "Saindo…" : "Sair da minha conta" }}
        </button>
      </aside>
      <section class="account-password">
        <ShieldCheck :size="28" />
        <h2>Uma senha só sua.</h2>
        <p>
          Para mudar sua senha, confirme a atual. As outras sessões serão
          encerradas.
        </p>
        <div v-if="error" class="form-error" role="alert">{{ error }}</div>
        <div v-if="success" class="form-success" role="status">
          {{ success }}
        </div>
        <form @submit.prevent="changePassword">
          <fieldset :disabled="busy" class="auth-fields">
            <label class="field"
              >Senha atual<input
                v-model="form.current"
                :type="show ? 'text' : 'password'"
                autocomplete="current-password"
                required
                maxlength="128" /></label
            ><label class="field"
              >Nova senha<input
                v-model="form.password"
                :type="show ? 'text' : 'password'"
                autocomplete="new-password"
                required
                minlength="12"
                maxlength="128"
              /><small>Entre 12 e 128 caracteres.</small></label
            ><label class="field"
              >Confirmar nova senha<input
                v-model="form.confirm"
                :type="show ? 'text' : 'password'"
                autocomplete="new-password"
                required
                minlength="12"
                maxlength="128" /></label
            ><button
              type="button"
              class="underlined password-visibility"
              :aria-pressed="show"
              @click="show = !show"
            >
              <EyeOff v-if="show" :size="17" /><Eye v-else :size="17" />{{
                show ? "Ocultar senhas" : "Mostrar senhas"
              }}</button
            ><button type="submit" class="button dark">
              <LoaderCircle v-if="busy" class="spin" :size="18" />{{
                busy ? "Atualizando…" : "Atualizar senha"
              }}
            </button>
          </fieldset>
        </form>
      </section>
    </div>
  </div>
</template>
