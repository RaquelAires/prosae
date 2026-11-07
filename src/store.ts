import { reactive } from "vue";
import type { Book, Profile } from "./types";
export type ShelfEntry = {
  book: string;
  status: string;
  progress: number;
  location: string;
  bookmark: string;
};
export const state = reactive({
  books: [] as Book[],
  authors: [] as Profile[],
  me: {
    user: null as null | { id: string; name: string },
    profile: null as Profile | null,
    shelf: [] as ShelfEntry[],
    publications: [] as Book[],
  },
  loading: true,
  error: "",
  toast: "",
});
export async function api(
  path: string,
  body?: unknown,
  method?: string,
): Promise<any> {
  const r = await fetch("/api/" + path, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d: any = await r.json();
  if (!r.ok)
    throw new Error(d.error || "Não foi possível completar a solicitação.");
  return d;
}
export async function refresh() {
  const [b, a, m] = await Promise.all([
    api("catalog"),
    api("authors"),
    api("me"),
  ]);
  state.books = b;
  state.authors = a;
  state.me = m;
}
let toastTimer: ReturnType<typeof setTimeout>;
export function notify(message: string) {
  state.toast = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (state.toast = ""), 4500);
}
export const login = (
  returnTo = window.location.pathname + window.location.search,
) =>
  window.location.assign(
    "/signin-with-chatgpt?return_to=" + encodeURIComponent(returnTo),
  );
export const imageUrl = (value: string) =>
  value?.startsWith("/") ? value : "/api/image/" + value;
export const filesize = (n: number) =>
  n >= 1048576
    ? (n / 1048576).toFixed(1) + " MB"
    : Math.max(1, Math.round(n / 1024)) + " KB";
export const genres = [
  "Todos",
  "Romance",
  "Fantasia",
  "Contos",
  "Poesia",
  "Literatura brasileira",
  "Não ficção",
];
export const regions = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
export function findBook(id: string) {
  return [...state.books, ...state.me.publications].find((b) => b.id === id);
}
export async function saveBook(book: Book, status = "Quero ler") {
  if (!state.me.user) {
    login();
    return;
  }
  try {
    const old = state.me.shelf.find((s) => s.book === book.id);
    await api("shelf", {
      book: book.id,
      status,
      progress: old?.progress || 0,
      location: old?.location || "",
      bookmark: old?.bookmark || "",
    });
    await refresh();
    notify("Livro salvo em “" + status + "”.");
  } catch (e: any) {
    notify(e.message);
  }
}
