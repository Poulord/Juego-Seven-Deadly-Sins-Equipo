import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
let db: PGlite;
const alice = "00000000-0000-0000-0000-000000000001",
  bob = "00000000-0000-0000-0000-000000000002";
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values ('${alice}'),('${bob}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to authenticated;`,
  );
  const name = readdirSync("supabase/migrations").find((n) =>
    n.endsWith("_initial_planner.sql"),
  )!;
  await db.exec(readFileSync(`supabase/migrations/${name}`, "utf8"));
  for (const migration of readdirSync("supabase/migrations")
    .sort()
    .filter((n) => n !== name))
    await db.exec(readFileSync(`supabase/migrations/${migration}`, "utf8"));
  await db.exec(
    "insert into public.game_imports(sha256,source,status,counts) values ('test','test','ready','{}'); insert into public.game_personajes(slug,nombre) values ('reference','Reference');",
  );
});
afterAll(async () => {
  await db.close();
});
async function asUser(user: string, query: string) {
  await db.exec(
    `reset role;set role authenticated;set request.jwt.claim.sub='${user}';`,
  );
  return db.query(query);
}
describe("Postgres ownership policies", () => {
  it("shared catalog is readable and cannot be changed by users or anonymous clients", async () => {
    await db.exec("reset role;set role anon;");
    expect(
      (await db.query("select * from public.game_personajes")).rows,
    ).toHaveLength(1);
    await expect(
      db.query("update public.game_personajes set nombre='hacked'"),
    ).rejects.toThrow();
    await asUser(alice, "select * from public.game_personajes");
    await expect(
      db.query("insert into public.game_personajes(slug) values ('hacked')"),
    ).rejects.toThrow();
    await expect(
      db.query("delete from public.game_personajes"),
    ).rejects.toThrow();
  });
  it("party plans isolate two owners, deny reassignment and anonymous writes", async () => {
    const id = "10000000-0000-0000-0000-000000000001";
    const payload = JSON.stringify({ version: 2, id, heroes: [] });
    await asUser(
      alice,
      `insert into public.party_plans(id,user_id,data) values ('${id}','${alice}','${payload}')`,
    );
    expect(
      (await asUser(bob, "select * from public.party_plans")).rows,
    ).toHaveLength(0);
    await expect(
      asUser(
        bob,
        `insert into public.party_plans(id,user_id,data) values ('${id}','${alice}','${payload}')`,
      ),
    ).rejects.toThrow();
    await expect(
      asUser(
        alice,
        `update public.party_plans set user_id='${bob}' where id='${id}'`,
      ),
    ).rejects.toThrow();
    await asUser(
      bob,
      `insert into public.party_plans(id,user_id,data) values ('${id}','${bob}','${payload}')`,
    );
    expect(
      (await asUser(alice, "select * from public.party_plans")).rows,
    ).toHaveLength(1);
    await db.exec("reset role;set role anon;");
    await expect(
      db.query("select * from public.party_plans"),
    ).rejects.toThrow();
  });
  for (const table of ["teams", "catalog_entries"])
    it(`${table}: denies foreign reads, writes, reassignment and anonymous access`, async () => {
      const data =
        table === "teams"
          ? {
              id: "same-id",
              name: "A",
              character: {},
              pieces: {},
              base: {},
              sets: [],
              tags: [],
              updatedAt: "",
            }
          : {
              id: "same-id",
              name: "A",
              kind: "Pieza",
              stats: {},
              modifiers: [],
              thresholds: [],
            };
      await asUser(
        alice,
        `insert into public.${table}(id,user_id,data) values ('same-id','${alice}','${JSON.stringify(data)}');`,
      );
      expect(
        (await asUser(bob, `select * from public.${table}`)).rows,
      ).toHaveLength(0);
      await expect(
        asUser(
          bob,
          `insert into public.${table}(id,user_id,data) values ('same-id','${alice}','${JSON.stringify(data)}')`,
        ),
      ).rejects.toThrow();
      expect(
        (
          await asUser(
            bob,
            `update public.${table} set data=jsonb_set(data,'{name}','"stolen"') where user_id='${alice}' returning id`,
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await asUser(
            bob,
            `delete from public.${table} where user_id='${alice}' returning id`,
          )
        ).rows,
      ).toHaveLength(0);
      await expect(
        asUser(
          alice,
          `update public.${table} set user_id='${bob}' where id='same-id'`,
        ),
      ).rejects.toThrow();
      await asUser(
        bob,
        `insert into public.${table}(id,user_id,data) values ('same-id','${bob}','${JSON.stringify(data)}');`,
      );
      expect(
        (await asUser(bob, `select * from public.${table}`)).rows,
      ).toHaveLength(1);
      await db.exec("reset role;set role anon;");
      await expect(db.query(`select * from public.${table}`)).rejects.toThrow();
    });
});
