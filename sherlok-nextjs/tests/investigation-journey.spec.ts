import { expect, test, type Page } from "@playwright/test";

const investigationId = "unrelated-fictional-case";
const snapshot = {
  investigation_id: investigationId,
  is_complete: false,
  case_file: {
    mystery_text: "A lighthouse keeper reports a missing signal lantern.",
    canonical_material: "Lighthouse log: the signal lantern went dark after midnight.",
    material_blocks: [],
    material_warnings: [],
    evidence: [{ id: "CLUE-7", classification: "observed_fact", statement: "The lantern was dark after midnight.", source_references: [] }],
    suspect_profiles: [],
    skeptic_reviews: [],
  },
};

const reviewSnapshot = {
  ...snapshot,
  is_complete: true,
  case_file: {
    ...snapshot.case_file,
    verdict: {
      confidence: "moderate",
      conclusions: [{ rank: 1, suspect: "The lighthouse keeper", explanation: "The signal log is incomplete.", evidence_ids: ["CLUE-7"] }],
      limitations: ["No witness confirms the final entry."],
      review_status: "awaiting_review",
    },
  },
};

async function mockInvestigationApi(page: Page) {
  await page.route("**/api/investigations", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({ json: { investigation_id: investigationId } });
      return;
    }
    await route.fallback();
  });
  await page.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({ json: snapshot }));
  await page.route(`**/api/investigations/${investigationId}/events**`, (route) => route.fulfill({
    contentType: "text/event-stream",
    body: `id: 1\nevent: evidence_collection_started\ndata: {"event_id":1,"event_type":"evidence_collection_started","investigation_id":"${investigationId}","stage":"evidence_collection","status":"working","timestamp":"2026-09-12T00:00:00Z","evidence_ids":[]}\n\n`,
  }));
}

test("starts an unrelated case, opens its case file, and follows evidence", async ({ page }) => {
  await mockInvestigationApi(page);
  await page.goto("/");
  await page.getByLabel("Paste case material").fill("A lighthouse keeper reports a missing signal lantern.");
  await page.getByRole("button", { name: "Start investigation" }).click();
  await expect(page).toHaveURL(new RegExp(`/agent-workspace\\?investigation_id=${investigationId}`));
  await expect(page.getByRole("heading", { name: "Agent Workspace" })).toBeVisible();
  await page.getByRole("link", { name: "Open Case File" }).click();
  await expect(page).toHaveURL(new RegExp(`/case/overview\\?investigation_id=${investigationId}`));
  await page.getByRole("link", { name: "Evidence" }).click();
  await expect(page.getByText("CLUE-7")).toBeVisible();
});

test("redirects the legacy agent route without losing the investigation ID", async ({ page }) => {
  await mockInvestigationApi(page);
  await page.goto(`/case/agents?investigation_id=${investigationId}`);
  await expect(page).toHaveURL(new RegExp(`/agent-workspace\\?investigation_id=${investigationId}`));
  await expect(page.getByRole("heading", { name: "Agent Workspace" })).toBeVisible();
});

test("shows a safe recovery message for an unknown investigation", async ({ page }) => {
  await page.route("**/api/investigations/unknown-case", (route) => route.fulfill({
    status: 404,
    json: { detail: { stage: "case_file", message: "The investigation was not found.", recovery_action: "Start a new investigation." } },
  }));
  await page.goto("/case/overview?investigation_id=unknown-case");
  await expect(page.getByRole("heading", { name: "Case file unavailable" })).toBeVisible();
  await expect(page.getByText("The investigation was not found.")).toBeVisible();
});

test("records a decision and sends guided re-investigation through the public commands", async ({ page }) => {
  const commands: { path: string; body: string }[] = [];
  await page.route(`**/api/investigations/${investigationId}/decision`, async (route) => {
    commands.push({ path: "decision", body: route.request().postData() ?? "" });
    await route.fulfill({ json: reviewSnapshot });
  });
  await page.route(`**/api/investigations/${investigationId}/reinvestigation`, async (route) => {
    commands.push({ path: "reinvestigation", body: route.request().postData() ?? "" });
    await route.fulfill({ json: { ...reviewSnapshot, is_complete: false } });
  });
  await page.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({ json: reviewSnapshot }));
  await page.goto(`/case/verdict?investigation_id=${investigationId}`);
  await page.getByRole("button", { name: "Accept proposal" }).click();
  await expect.poll(() => commands).toContainEqual({ path: "decision", body: '{"action":"accept"}' });

  const secondPage = await page.context().newPage();
  await secondPage.route(`**/api/investigations/${investigationId}/reinvestigation`, async (route) => {
    commands.push({ path: "reinvestigation", body: route.request().postData() ?? "" });
    await route.fulfill({ json: { ...reviewSnapshot, is_complete: false } });
  });
  await secondPage.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({ json: reviewSnapshot }));
  await secondPage.goto(`/case/verdict?investigation_id=${investigationId}`);
  await secondPage.getByPlaceholder("Required guidance note").fill("Check the final log entry.");
  await secondPage.getByRole("button", { name: "Request re-investigation" }).click();
  await expect.poll(() => commands).toContainEqual({ path: "reinvestigation", body: '{"note":"Check the final log entry."}' });
});
