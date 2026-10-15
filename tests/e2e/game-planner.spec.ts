import { test, expect } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import type { Catalog, Detail } from "../../src/game/types";
const catalog = JSON.parse(
  readFileSync("public/catalog/catalog.json", "utf8"),
) as Catalog;
test.setTimeout(90000);
test("four heroes, weapon compatibility, engraving, summary, independent copies and persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Crear formación", exact: true })
    .click();
  await expect(page.locator(".character-choice")).toHaveCount(28);
  await page.getByLabel("Rareza del héroe").selectOption("SR");
  await expect(page.locator(".character-choice")).toHaveCount(10);
  await page.getByLabel("Rareza del héroe").selectOption("");
  await page
    .locator(".character-choice")
    .filter({ hasText: "Meliodas" })
    .click();
  await page.getByLabel("Nombre de formación").fill("Taranis · equipo probado");
  const mel = catalog.personajes.find((c) => c.slug === "meliodas")!,
    styles = catalog.personaje_armas.filter((s) => s.personaje === mel.slug);
  const weapon = catalog.armas.find(
    (w) =>
      w.tipo_arma === styles[0].tipo_arma &&
      catalog.arma_encantamientos.some(
        (e) =>
          e.arma_id === w.id &&
          e.rareza ===
            catalog.arma_grados.find((g) => g.arma_id === w.id)?.rareza,
      ),
  )!;
  await page
    .getByRole("button", { name: "Seleccionar arma", exact: true })
    .click();
  await page.getByLabel("Buscar pieza").fill(weapon.nombre);
  await page
    .locator(".equipment-result")
    .filter({
      has: page.getByRole("heading", { name: weapon.nombre, exact: true }),
    })
    .locator(".grade-button")
    .first()
    .click();
  await expect(page.locator(".selected-item-label")).toContainText(
    weapon.nombre,
  );
  const grade = catalog.arma_grados.find((g) => g.arma_id === weapon.id)!;
  const enchant = catalog.arma_encantamientos.find(
    (e) => e.arma_id === weapon.id && e.rareza === grade.rareza,
  )!;
  await page
    .getByLabel("Añadir encantamiento", { exact: true })
    .selectOption(String(enchant.id));
  await page
    .getByRole("slider", { name: `Valor ${enchant.stat_nombre}`, exact: true })
    .press("End");
  await expect(page.locator(".roll-control output")).toHaveText(
    `${(enchant.max / (/Rate/.test(enchant.stat) ? 100 : 1)).toLocaleString("es-ES")}${/Rate/.test(enchant.stat) ? "%" : ""}`,
  );
  await page.getByLabel("Estilo de arma").selectOption(String(styles[1].id));
  await expect(
    page.getByRole("button", { name: "Seleccionar arma", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Estilo de arma").selectOption(String(styles[0].id));
  await page
    .getByRole("button", { name: "Seleccionar arma", exact: true })
    .click();
  await page.getByLabel("Buscar pieza").fill(weapon.nombre);
  await page
    .locator(".equipment-result")
    .filter({
      has: page.getByRole("heading", { name: weapon.nombre, exact: true }),
    })
    .locator(".grade-button")
    .first()
    .click();
  for (const name of ["Ban", "Daisy", "Elizabeth"]) {
    await page
      .getByRole("button", { name: "Añadir héroe", exact: true })
      .first()
      .click();
    await page
      .locator(".character-choice")
      .filter({ hasText: new RegExp(`^${name}`) })
      .click();
  }
  await expect(page.locator(".roster-chip")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "Añadir héroe", exact: true }),
  ).toHaveCount(0);
  await page.locator(".roster-chip").filter({ hasText: "Meliodas" }).click();
  await page.getByRole("button", { name: "Grabados", exact: true }).click();
  const detail = JSON.parse(
    readFileSync("public/catalog/heroes/meliodas.json", "utf8"),
  ) as Detail;
  await page
    .getByLabel("Grabado del héroe")
    .selectOption(String(detail.grabados[0].id));
  await expect(page.locator(".engraving-effect")).toContainText(
    detail.grabados[0].atuendo,
  );
  await page.getByRole("button", { name: "Armadura", exact: true }).click();
  await page
    .getByRole("button", { name: "Ranura Parte superior", exact: true })
    .click();
  const gear = catalog.armaduras.find(
    (g) => g.ranura === "Parte superior" && !g.personajes,
  )!;
  await page.getByLabel("Buscar pieza").fill(gear.nombre);
  await page
    .getByRole("button")
    .filter({
      has: page.getByRole("heading", { name: gear.nombre, exact: true }),
    })
    .click();
  await expect(page.locator(".selected-item-label")).toContainText(gear.nombre);
  await page
    .getByRole("button", { name: "Información de equipo", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Ataques combinados disponibles",
  );
  await expect(page.getByRole("dialog").locator(".summary-hero")).toHaveCount(
    4,
  );
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  mkdirSync("output/playwright", { recursive: true });
  await page.screenshot({
    path: "output/playwright/formation-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Guardar formación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Taranis · equipo probado",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Taranis · equipo probado",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Duplicar Taranis · equipo probado",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Editar Taranis · equipo probado · copia",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Quitar", exact: true }).click();
  await page
    .getByRole("button", { name: "Guardar formación", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Editar Taranis · equipo probado",
      exact: true,
    })
    .click();
  await expect(page.locator(".selected-item-label")).toContainText(
    weapon.nombre,
  );
  await page
    .getByRole("button", { name: "Volver a equipos", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Eliminar Taranis · equipo probado · copia",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Taranis · equipo probado · copia",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("read-only catalog, SR filter, skill reference, mobile layout", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Catálogo", exact: true }).click();
  await expect(page.locator(".game-catalog-card")).toHaveCount(28);
  await page.getByLabel("Rareza del catálogo").selectOption("SR");
  await expect(page.locator(".game-catalog-card")).toHaveCount(10);
  const sr = catalog.personajes.find((c) => c.rareza === "SR")!;
  await page
    .locator(".game-catalog-card")
    .filter({
      has: page.getByRole("heading", { name: sr.nombre, exact: true }),
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Ficha de referencia de solo lectura",
  );
  await expect(
    page.getByRole("button", { name: "Guardar entrada", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.getByRole("button", { name: "Formaciones", exact: true }).click();
  await page
    .getByRole("button", { name: "Crear formación", exact: true })
    .click();
  await page
    .locator(".character-choice")
    .filter({ hasText: "Meliodas" })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "output/playwright/formation-mobile.png",
    fullPage: true,
  });
});
