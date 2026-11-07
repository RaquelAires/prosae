import type { Env } from "./env";
import { getRequestUser } from "./identity";
import { seedBooks, seedProfiles, sampleFiles } from "./data";
import JSZip from "jszip";
import { isAdministrator } from "./permissions";
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { status });
}
const clean = (v: unknown, max = 1000) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
export function createApi(env: Env) {
  const db = () => {
    if (!env.DB) fail("Banco temporariamente indisponível.", 503);
    return env.DB!;
  };
  const bucket = () => {
    if (!env.BUCKET) fail("Armazenamento temporariamente indisponível.", 503);
    return env.BUCKET!;
  };
  async function allBooks() {
    await db().batch(
      seedBooks.map((b) =>
        db()
          .prepare(
            "INSERT OR IGNORE INTO books(id,owner,data,status,created) VALUES(?,?,?,?,?)",
          )
          .bind(b.id, b.owner, JSON.stringify(b), "published", b.created),
      ),
    );
    const r = await db()
      .prepare(
        "SELECT b.*,COALESCE(m.blocked,0) AS blocked,COALESCE(m.reason,'') AS moderation_reason FROM books b LEFT JOIN moderation m ON m.book=b.id",
      )
      .all();
    return r.results.map((x: any) => ({
      ...JSON.parse(x.data),
      id: x.id,
      owner: x.owner,
      status: x.status,
      created: x.created,
      reads: x.reads,
      downloads: x.downloads,
      blocked: x.blocked === 1,
      moderationReason: x.moderation_reason,
    }));
  }
  async function handle(req: Request) {
    try {
      const path = new URL(req.url).pathname
          .split("/")
          .filter(Boolean)
          .slice(1),
        method = req.method,
        u = await getRequestUser(req, env),
        uid = u?.userId;
      const requireUser = () => uid || fail("Entre para continuar.", 401);
      if (method !== "GET") {
        const origin = req.headers.get("origin");
        if (origin && origin !== new URL(req.url).origin)
          fail("Origem da solicitação inválida.", 403);
      }
      if (path[0] === "admin") {
        requireUser();
        if (!isAdministrator(uid, env))
          fail("Esta área é exclusiva da administração.", 403);
        if (method === "GET" && path[1] === "catalog") {
          const books = (await allBooks()).filter((b) => b.status !== "draft");
          const users = await db()
            .prepare("SELECT COUNT(*) AS count FROM users")
            .first<{ count: number }>();
          const events = await db()
            .prepare(
              "SELECT id,title,action,reason,created FROM moderation_events ORDER BY created DESC LIMIT 30",
            )
            .all();
          return json({
            books: books.map((b) => ({
              id: b.id,
              title: b.title,
              author: b.author,
              genre: b.genre,
              status: b.status,
              reads: b.reads,
              downloads: b.downloads,
              blocked: b.blocked,
              reason: b.moderationReason,
            })),
            stats: {
              accounts: users?.count || 0,
              published: books.filter(
                (b) => b.status === "published" && !b.blocked,
              ).length,
              blocked: books.filter((b) => b.blocked).length,
            },
            events: events.results,
          });
        }
        if (method === "POST" && path[1] === "moderation" && path[2]) {
          const body: any = await req.json();
          if (!["block", "restore"].includes(body.action))
            fail("Ação inválida.");
          const reason = clean(body.reason, 500);
          if (reason.length < 5)
            fail("Explique o motivo com pelo menos 5 caracteres.");
          const b = (await allBooks()).find(
            (b) => b.id === path[2] && b.status !== "draft",
          );
          if (!b) fail("Obra não encontrada no catálogo.", 404);
          const blocked = body.action === "block";
          if (b.blocked === blocked)
            fail("A obra já está nesse estado. Atualize o painel.", 409);
          const now = Date.now();
          await db().batch([
            db()
              .prepare(
                "INSERT INTO moderation(book,blocked,reason,actor,updated) VALUES(?,?,?,?,?) ON CONFLICT(book) DO UPDATE SET blocked=excluded.blocked,reason=excluded.reason,actor=excluded.actor,updated=excluded.updated",
              )
              .bind(b.id, blocked ? 1 : 0, reason, uid!, now),
            db()
              .prepare(
                "INSERT INTO moderation_events(id,book,title,action,reason,actor,created) VALUES(?,?,?,?,?,?,?)",
              )
              .bind(
                crypto.randomUUID(),
                b.id,
                b.title,
                body.action,
                reason,
                uid!,
                now,
              ),
          ]);
          return json({ ok: true });
        }
        return json({ error: "Operação administrativa não encontrada." }, 404);
      }
      if (path[0] === "me") {
        if (!uid) return json({ user: null, shelf: [], publications: [] });
        const p: any = await db()
          .prepare("SELECT data FROM profiles WHERE id=?")
          .bind(uid)
          .first();
        const shelf = await db()
          .prepare(
            "SELECT book,status,progress,location,bookmark FROM shelves WHERE owner=?",
          )
          .bind(uid)
          .all();
        return json({
          user: {
            id: uid,
            name: u!.displayName,
            email: u!.email,
            role: isAdministrator(uid, env) ? "admin" : "member",
          },
          profile: p
            ? JSON.parse(p.data)
            : {
                id: uid,
                name: u!.displayName,
                bio: "",
                region: "",
                link: "",
                photo: "",
              },
          shelf: shelf.results,
          publications: (await allBooks()).filter((b) => b.owner === uid),
        });
      }
      if (path[0] === "catalog")
        return json(
          (await allBooks())
            .filter((b) => b.status === "published" && !b.blocked)
            .map(({ moderationReason, ...book }) => book),
        );
      if (path[0] === "authors") {
        const r = await db().prepare("SELECT * FROM profiles").all();
        return json([
          ...seedProfiles,
          ...r.results.map((x: any) => ({ ...JSON.parse(x.data), id: x.id })),
        ]);
      }
      if (path[0] === "profile" && method === "PUT") {
        const id = requireUser(),
          body: any = await req.json();
        let link = clean(body.link, 300);
        if (link && !/^https?:\/\//i.test(link))
          fail("Use um link iniciado por https:// ou http://.");
        let photo = clean(body.photo, 200);
        if (
          photo &&
          !(await db()
            .prepare("SELECT id FROM assets WHERE id=? AND owner=? AND kind=?")
            .bind(photo, id, "cover")
            .first())
        )
          fail("Foto inválida.");
        const data = {
          id,
          name: clean(body.name, 100),
          bio: clean(body.bio, 2000),
          region: clean(body.region, 50),
          link,
          photo,
        };
        if (!data.name) fail("Informe seu nome.");
        await db().batch([
          db()
            .prepare(
              "INSERT INTO profiles(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
            )
            .bind(id, JSON.stringify(data)),
          db()
            .prepare("UPDATE users SET name=? WHERE id=?")
            .bind(data.name, id),
        ]);
        return json(data);
      }
      if (path[0] === "upload" && method === "POST") {
        const owner = requireUser(),
          kind =
            new URL(req.url).searchParams.get("kind") === "cover"
              ? "cover"
              : "book",
          max = kind === "cover" ? 5242880 : 26214400;
        if (Number(req.headers.get("content-length")) > max)
          fail("Arquivo acima do limite.", 413);
        const file = await req.arrayBuffer();
        if (!file.byteLength || file.byteLength > max)
          fail("Arquivo vazio ou acima do limite.", 413);
        const bytes = new Uint8Array(file),
          head = new TextDecoder().decode(bytes.slice(0, 12));
        let type = "";
        if (kind === "book") {
          if (head.startsWith("%PDF-")) type = "application/pdf";
          else if (bytes[0] === 80 && bytes[1] === 75) {
            try {
              const zip = await JSZip.loadAsync(file);
              const entries = Object.values(zip.files);
              if (
                entries.length > 2000 ||
                entries.reduce(
                  (n: number, x: any) => n + (x._data?.uncompressedSize || 0),
                  0,
                ) >
                  100 * 1048576
              )
                fail("EPUB muito grande após descompactação.");
              if (
                (await zip.file("mimetype")?.async("text")) !==
                  "application/epub+zip" ||
                !zip.file("META-INF/container.xml")
              )
                fail("EPUB inválido.");
              type = "application/epub+zip";
            } catch {
              fail(
                "Envie um EPUB válido, sem DRM e com até 100 MB descompactados.",
              );
            }
          } else fail("Envie um PDF ou EPUB válido.");
        } else {
          if (bytes[0] === 137 && head.includes("PNG")) type = "image/png";
          else if (bytes[0] === 255 && bytes[1] === 216) type = "image/jpeg";
          else if (head.startsWith("RIFF") && head.includes("WEBP"))
            type = "image/webp";
          else fail("Envie uma imagem JPG, PNG ou WebP.");
        }
        const id = crypto.randomUUID();
        await bucket().put(id, file, { httpMetadata: { contentType: type } });
        await db()
          .prepare(
            "INSERT INTO assets(id,owner,kind,type,size,filename) VALUES(?,?,?,?,?,?)",
          )
          .bind(
            id,
            owner,
            kind,
            type,
            file.byteLength,
            clean(req.headers.get("x-filename"), 180),
          )
          .run();
        return json({
          id,
          size: file.byteLength,
          type,
          format: type.includes("pdf") ? "PDF" : "EPUB",
        });
      }
      if (path[0] === "image") {
        const a: any = await db()
          .prepare("SELECT * FROM assets WHERE id=? AND kind=?")
          .bind(path[1], "cover")
          .first();
        if (!a) fail("Imagem não encontrada.", 404);
        const obj = await bucket().get(a.id);
        if (!obj) fail("Imagem não encontrada.", 404);
        return new Response(obj.body, {
          headers: {
            "Content-Type": a.type,
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      if (path[0] === "file") {
        const b = (await allBooks()).find((b) => b.id === path[1]);
        if (!b || ((b.status !== "published" || b.blocked) && b.owner !== uid))
          fail("Livro não encontrado.", 404);
        const download = new URL(req.url).searchParams.get("download") === "1";
        if ((download && !b.download) || (!download && !b.online))
          fail("O autor não disponibilizou esta opção.", 403);
        if (download)
          await db()
            .prepare("UPDATE books SET downloads=downloads+1 WHERE id=?")
            .bind(b.id)
            .run();
        const headers = {
          "Content-Type":
            b.format === "PDF" ? "application/pdf" : "application/epub+zip",
          "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(b.title + "." + b.format.toLowerCase())}`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        };
        if (b.file.startsWith("/samples/")) {
          const encoded = sampleFiles[b.file];
          if (!encoded) fail("Arquivo indisponível.", 404);
          return new Response(
            Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)),
            { headers },
          );
        }
        const obj = await bucket().get(b.file);
        if (!obj) fail("Arquivo indisponível.", 404);
        return new Response(obj.body, { headers });
      }
      if (path[0] === "book") {
        if (method === "GET") {
          const b = (await allBooks()).find((b) => b.id === path[1]);
          if (
            !b ||
            ((b.status !== "published" || b.blocked) && b.owner !== uid)
          )
            fail("Livro não encontrado.", 404);
          const { moderationReason, ...publicBook } = b;
          return json(b.owner === uid ? b : publicBook);
        }
        const owner = requireUser(),
          existing = path[1]
            ? (await allBooks()).find((b) => b.id === path[1])
            : null;
        if (path[1] && (!existing || existing.owner !== owner))
          fail("Você não pode alterar esta obra.", 403);
        if (method === "DELETE") {
          await db()
            .prepare(
              "UPDATE books SET status='withdrawn' WHERE id=? AND owner=?",
            )
            .bind(path[1], owner)
            .run();
          return json({ ok: true });
        }
        if (existing?.blocked)
          fail(
            "Esta obra está suspensa pela administração: " +
              existing.moderationReason,
            403,
          );
        const body: any = await req.json(),
          id = existing?.id ?? crypto.randomUUID(),
          status = body.status === "published" ? "published" : "draft";
        const data: any = {
          id,
          owner,
          authorId: owner,
          title: clean(body.title, 140),
          subtitle: clean(body.subtitle, 200),
          author: clean(body.author, 100),
          synopsis: clean(body.synopsis, 8000),
          genre: clean(body.genre, 50),
          keywords: clean(body.keywords, 300),
          language: clean(body.language, 40) || "Português",
          year: Math.min(2100, Math.max(1500, Number(body.year) || 2026)),
          pages: Math.max(1, Math.min(20000, Number(body.pages) || 1)),
          file: clean(body.file, 100),
          cover: clean(body.cover, 100),
          crop: Math.min(100, Math.max(0, Number(body.crop) || 50)),
          online: body.online === true,
          download: body.download === true,
          atmosphere: clean(body.atmosphere, 300),
          themes: clean(body.themes, 400),
          quote: clean(body.quote, 500),
          excerpt: clean(body.excerpt, 3000),
          region: clean(body.region, 50),
          color: ["#1546bc", "#00613f", "#efc434", "#ac492e"].includes(
            body.color,
          )
            ? body.color
            : "#00613f",
          status,
        };
        if (
          status === "published" &&
          (!data.title ||
            !data.author ||
            !data.synopsis ||
            !data.genre ||
            !data.file ||
            !data.cover ||
            !body.rights ||
            (!data.online && !data.download))
        )
          fail(
            "Complete os dados, livro e capa, escolha a disponibilidade e confirme a autorização.",
          );
        if (data.file) {
          const a: any = await db()
            .prepare(
              "SELECT * FROM assets WHERE id=? AND owner=? AND kind='book'",
            )
            .bind(data.file, owner)
            .first();
          if (!a) fail("Arquivo do livro inválido.");
          data.size = a.size;
          data.format = a.type === "application/pdf" ? "PDF" : "EPUB";
        }
        if (
          data.cover &&
          !(await db()
            .prepare(
              "SELECT id FROM assets WHERE id=? AND owner=? AND kind='cover'",
            )
            .bind(data.cover, owner)
            .first())
        )
          fail("Capa inválida.");
        await db().batch([
          db()
            .prepare(
              "INSERT INTO books(id,owner,data,status,created) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status",
            )
            .bind(
              id,
              owner,
              JSON.stringify(data),
              status,
              existing?.created ?? Date.now(),
            ),
          db()
            .prepare("INSERT OR IGNORE INTO profiles(id,data) VALUES(?,?)")
            .bind(
              owner,
              JSON.stringify({
                id: owner,
                name: data.author || u!.displayName,
                bio: "",
                region: data.region,
                link: "",
                photo: "",
              }),
            ),
        ]);
        return json({
          ...data,
          created: existing?.created ?? Date.now(),
          reads: existing?.reads ?? 0,
          downloads: existing?.downloads ?? 0,
        });
      }
      if (path[0] === "shelf") {
        const owner = requireUser(),
          body: any = await req.json(),
          book = (await allBooks()).find(
            (b) => b.id === body.book && b.status === "published" && !b.blocked,
          );
        if (!book) fail("Livro não encontrado.", 404);
        const id = owner + ":" + book.id;
        if (method === "DELETE") {
          await db()
            .prepare("DELETE FROM shelves WHERE id=? AND owner=?")
            .bind(id, owner)
            .run();
          return json({ ok: true });
        }
        const status = ["Quero ler", "Lendo", "Concluídos"].includes(
            body.status,
          )
            ? body.status
            : "Quero ler",
          progress = Math.max(0, Math.min(100, Number(body.progress) || 0));
        await db()
          .prepare(
            "INSERT INTO shelves(id,owner,book,status,progress,location,bookmark) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,progress=excluded.progress,location=excluded.location,bookmark=excluded.bookmark",
          )
          .bind(
            id,
            owner,
            book.id,
            status,
            progress,
            clean(body.location, 2000),
            clean(body.bookmark, 2000),
          )
          .run();
        return json({ ok: true });
      }
      if (path[0] === "read" && method === "POST") {
        const b = (await allBooks()).find(
          (b) =>
            b.id === path[1] &&
            b.status === "published" &&
            !b.blocked &&
            b.online,
        );
        if (!b) fail("Leitura não disponível.", 404);
        await db()
          .prepare("UPDATE books SET reads=reads+1 WHERE id=?")
          .bind(b.id)
          .run();
        return json({ ok: true });
      }
      return json({ error: "Página não encontrada." }, 404);
    } catch (e: any) {
      return json(
        {
          error: e.status
            ? e.message
            : "Não foi possível concluir a operação. Tente novamente.",
        },
        e.status || 500,
      );
    }
  }
  return handle;
}
