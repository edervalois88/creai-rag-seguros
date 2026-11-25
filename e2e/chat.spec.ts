import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("shows the effective endorsement, rule and real trace for each reply", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Grúa con endoso" }).click();
  const evidence = page.getByRole("complementary", {
    name: "Evidencia de la respuesta",
  });
  await expect(evidence).toContainText("100 km");
  await expect(evidence).toContainText("Precedencia del endoso");
  await expect(evidence).toContainText("AUTO-v2-8");
  await expect(evidence.getByRole("listitem")).toHaveCount(3);
  await evidence.getByText("Identificadores de ejecución").click();
  await expect(evidence.getByRole("definition").first()).toHaveText(
    /^[a-f0-9]{32}$/,
  );
  const firstTrace = await evidence
    .getByRole("definition")
    .first()
    .textContent();

  await page.getByRole("button", { name: "Grúa antes del endoso" }).click();
  await expect(evidence).toContainText("50 km");
  await expect(evidence.getByRole("definition").first()).not.toHaveText(
    firstTrace ?? "",
  );
  await page.getByRole("button", { name: "Ver evidencia" }).first().click();
  await expect(evidence).toContainText("100 km");
  await expect(evidence.getByRole("definition").first()).toHaveText(
    firstTrace ?? "",
  );

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations.map((violation) => violation.id)).toEqual([]);
});

test("requests context and records both simulated adjuster steps", async ({
  page,
}) => {
  await page.goto("/");
  const evidence = page.getByRole("complementary");
  await page.getByRole("button", { name: "Sin acceso a la póliza" }).click();
  await expect(evidence).toContainText("Acceso a la póliza");
  await expect(evidence).toContainText("Esta respuesta no usó cláusulas.");

  await page.getByRole("button", { name: "Consulta sin fecha" }).click();
  await expect(evidence).toContainText("Fecha del siniestro");
  await page.getByLabel("Fecha del siniestro").fill("2026-01-01");
  await page
    .getByRole("textbox", { name: "Escribe una pregunta" })
    .fill("¿Cuánto es el deducible?");
  await page.getByRole("button", { name: "Enviar", exact: true }).click();
  await expect(evidence).toContainText("5 %");

  await page.getByRole("button", { name: "Revisión humana" }).click();
  await expect(evidence).toContainText("Revisión del ajustador");
  await page.getByRole("button", { name: "Ver evidencia" }).last().click();
  await expect(evidence).toContainText("Acuse del ajustador");
  await evidence.getByText("Identificadores de ejecución").click();
  await expect(evidence).toContainText("Traza anterior");
});
