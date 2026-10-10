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
