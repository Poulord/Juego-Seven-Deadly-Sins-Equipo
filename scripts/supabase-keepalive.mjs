import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const checks = [
  {
    table: "game_imports",
    query: "select=sha256,status&status=eq.ready&limit=1",
    valid: (row) => row.status === "ready" && typeof row.sha256 === "string",
  },
  {
    table: "game_personajes",
    query: "select=slug&limit=1",
    valid: (row) => typeof row.slug === "string",
  },
  {
    table: "game_armas",
    query: "select=id&limit=1",
    valid: (row) => Number.isInteger(row.id),
  },
];

/** Three bounded, read-only requests against the public catalog. No private plans or Auth calls. */
export async function keepAlive({
  url,
  publishableKey,
  fetchImpl = fetch,
  wait = delay,
  log = console.log,
  attempts = 3,
}) {
  const origin = new URL(url);
  if (
    origin.protocol !== "https:" ||
    !origin.hostname.endsWith(".supabase.co") ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new Error("Se requiere la URL HTTPS de un proyecto Supabase.");
  if (!publishableKey?.startsWith("sb_publishable_"))
    throw new Error("Se requiere una clave publicable de Supabase.");
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 3)
    throw new Error("Reintentos fuera del límite.");

  const report = [];
  for (const check of checks) {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const response = await fetchImpl(
          new URL(`/rest/v1/${check.table}?${check.query}`, origin),
          {
            method: "GET",
            headers: {
              apikey: publishableKey,
              Accept: "application/json",
              "Cache-Control": "no-cache",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(15000),
            redirect: "error",
          },
        );
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          if (retryable && attempt < attempts) {
            await wait(2000 * attempt);
            continue;
          }
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        if (
          !Array.isArray(data) ||
          data.length !== 1 ||
          !data[0] ||
          !check.valid(data[0])
        )
          throw new Error("Respuesta del catálogo vacía o inválida");
        report.push({ table: check.table, attempts: attempt });
        log(`${check.table}: OK (intento ${attempt})`);
        break;
      } catch (error) {
        // HTTP, JSON and catalog errors will not recover through immediate retries.
        const transientNetwork =
          error instanceof TypeError ||
          (error instanceof Error &&
            ["TimeoutError", "AbortError"].includes(error.name));
        if (transientNetwork && attempt < attempts) {
          await wait(2000 * attempt);
          continue;
        }
        throw new Error(
          `Fallo al consultar ${check.table}: ${error instanceof Error ? error.message : "error de red"}`,
        );
      }
    }
  }
  return report;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const config = JSON.parse(
      readFileSync(
        new URL("../supabase/healthcheck.json", import.meta.url),
        "utf8",
      ),
    );
    const report = await keepAlive({
      url: process.env.SUPABASE_URL || config.url,
      publishableKey:
        process.env.SUPABASE_PUBLISHABLE_KEY || config.publishableKey,
    });
    console.log(
      `Comprobación completada: ${report.length} lecturas · ${new Date().toISOString()}`,
    );
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "No se pudo comprobar Supabase",
    );
    process.exitCode = 1;
  }
}
