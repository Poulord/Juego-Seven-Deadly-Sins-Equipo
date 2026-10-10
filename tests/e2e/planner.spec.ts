import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
test("reuse, duplicate, edit, filter, compare, persist and delete", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByRole("button", { name: "Probar con ejemplos ficticios" })
    .click();
  mkdirSync("output/playwright", { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "output/playwright/desktop.png",
    fullPage: true,
  });
  await expect(
    page.getByRole("heading", { name: "Asalto a Taranis", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Duplicar Asalto a Taranis", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Editar Asalto a Taranis · copia",
      exact: true,
    })
    .click();
  await page.getByLabel("Nombre del equipo").fill("Mi prueba independiente");
  await page
    .getByText("Ajustar estadísticas de esta pieza", { exact: true })
    .click();
  await page
    .locator(".piece-detail")
    .getByLabel("Ataque", { exact: true })
    .fill("1000");
  await page
    .getByRole("button", { name: "Guardar equipo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mi prueba independiente", exact: true }),
  ).toBeVisible();
  const original = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Asalto a Taranis", exact: true }),
  });
  await expect(original.locator(".card-stats")).toContainText("3025"); // es-ES formats four-digit values without grouping.
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Mi prueba independiente" }),
  ).toBeVisible();
  await page.getByLabel("Buscar equipos").fill("Taranis");
  await expect(
    page.getByRole("heading", { name: "Explorador de Britannia", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Buscar equipos").fill("");
  await original.getByLabel("Comparar", { exact: true }).check();
  await page
    .locator("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Mi prueba independiente",
        exact: true,
      }),
    })
    .getByLabel("Comparar", { exact: true })
    .check();
  await page
    .getByRole("button", { name: "Comparar equipos", exact: true })
    .click();
  await expect(page.locator("table")).toContainText("Mi prueba independiente");
  await expect(page.locator("table")).toContainText("+275 vs. equipo 1");
  await page.getByRole("button", { name: "Mis equipos", exact: false }).click();
  await page
    .getByRole("button", {
      name: "Eliminar Mi prueba independiente",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mi prueba independiente" }),
  ).toHaveCount(0);
  await expect(original).toBeVisible();
  expect(errors).toEqual([]);
});
test("catalog creation and mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Conectar cuenta", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Las cuentas estarán disponibles",
  );
  await page.getByRole("button", { name: "Cerrar diálogo" }).click();
  await page.getByRole("button", { name: "Catálogo", exact: true }).click();
  await page.getByRole("button", { name: "Nueva entrada" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Mi espada");
  await page.getByLabel("Ataque", { exact: true }).fill("800");
  await page.getByRole("button", { name: "Guardar entrada" }).click();
  await expect(
    page.getByRole("heading", { name: "Mi espada", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Mis equipos", exact: false }).click();
  await page.getByRole("button", { name: "Crear mi primer equipo" }).click();
  await page
    .getByLabel("Pieza del catálogo")
    .selectOption({ label: "Mi espada · Sin verificar" });
  await page
    .getByRole("button", { name: "Guardar equipo", exact: true })
    .click();
  await expect(page.locator(".card-stats")).toContainText("800");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "output/playwright/mobile.png",
    fullPage: true,
  });
});
