import { test } from "node:test";
import assert from "node:assert/strict";
import { keepAlive } from "../scripts/supabase-keepalive.mjs";
const base = {
  url: "https://example.supabase.co",
  publishableKey: "sb_publishable_test",
  log: () => {},
  wait: async () => {},
};
const response = (data) => new Response(JSON.stringify(data), { status: 200 });
const dataFor = (url) =>
  url.pathname.includes("game_imports")
    ? [{ sha256: "test", status: "ready" }]
    : url.pathname.includes("game_personajes")
      ? [{ slug: "meliodas" }]
      : [{ id: 1 }];

test("runs exactly three small GET requests using a public key and no private tables", async () => {
  const calls = [];
  const report = await keepAlive({
    ...base,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response(dataFor(url));
    },
  });
  assert.equal(report.length, 3);
  assert.equal(calls.length, 3);
  for (const { url, options } of calls) {
    assert.equal(options.method, "GET");
    assert.equal(url.searchParams.get("limit"), "1");
    assert.equal(options.headers.apikey, base.publishableKey);
    assert.equal(options.redirect, "error");
    assert.equal(options.cache, "no-store");
    assert.ok(!url.pathname.includes("party_plans"));
  }
});
test("retries a transient server failure and recovers", async () => {
  let calls = 0;
  const report = await keepAlive({
    ...base,
    fetchImpl: async (url) =>
      ++calls === 1
        ? new Response("", { status: 503 })
        : response(dataFor(url)),
  });
  assert.equal(report[0].attempts, 2);
  assert.equal(calls, 4);
});
test("fails immediately for an invalid key or denied request", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return new Response("", { status: 401 });
  };
  await assert.rejects(keepAlive({ ...base, fetchImpl }), /HTTP 401/);
  assert.equal(calls, 1);
  await assert.rejects(
    keepAlive({ ...base, publishableKey: "sb_secret_test", fetchImpl }),
    /clave publicable/,
  );
  assert.equal(calls, 1);
});
test("fails for an empty catalog rather than reporting success", async () => {
  await assert.rejects(
    keepAlive({ ...base, fetchImpl: async () => response([]) }),
    /vacía o inválida/,
  );
});
test("stops after three failed network attempts", async () => {
  let calls = 0;
  await assert.rejects(
    keepAlive({
      ...base,
      fetchImpl: async () => {
        calls++;
        throw new TypeError("network failure");
      },
    }),
    /network failure/,
  );
  assert.equal(calls, 3);
});
