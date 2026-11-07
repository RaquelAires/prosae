import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { cloudflare } from "@cloudflare/vite-plugin";
export default defineConfig({
  plugins: [
    vue(),
    cloudflare({
      viteEnvironment: { name: "server" },
      persistState: { path: ".wrangler/state" },
    }),
  ],
  server: { host: "127.0.0.1", port: 5173 },
});
