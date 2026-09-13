import { expect, test } from "@playwright/test";

const investigationId = "uncertain-timeline-case";

function emptyTimelineSnapshot(isComplete: boolean) {
  return {
    transport_version: "1.0.0",
    investigation_id: investigationId,
    is_complete: isComplete,
    case_file: {
      mystery_text: "A fictional harbor beacon was not recorded at dawn.",
      canonical_material: "",
      material_blocks: [],
      material_warnings: [],
      human_notes: [],
      source_text: {},
      revised_specialists: [],
      evidence: [],
      suspect_profiles: [],
      timeline: { events: [], issues: [] },
      skeptic_reviews: [],
    },
  };
}

test("renders an uncertain uncited event on the routed Timeline page", async ({ page }) => {
  await page.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({
    json: {
      transport_version: "1.0.0",
      investigation_id: investigationId,
      is_complete: false,
      case_file: {
        mystery_text: "A fictional harbor beacon was not recorded at dawn.",
        canonical_material: "",
        material_blocks: [],
        material_warnings: [],
        human_notes: [],
        source_text: {},
        revised_specialists: [],
        evidence: [],
        suspect_profiles: [],
        timeline: {
          events: [{ order: null, time: null, statement: "The beacon status is not established.", status: "unknown", evidence_ids: [] }],
          issues: [],
        },
        skeptic_reviews: [],
      },
    },
  }));

  await page.goto(`/case/timeline?investigation_id=${investigationId}`);

  const uncertainEvents = page.getByRole("heading", { name: "Unordered or uncertain events" }).locator("..");
  await expect(uncertainEvents).toContainText("The beacon status is not established.");
  await expect(uncertainEvents).toContainText("Unknown");
  await expect(uncertainEvents).toContainText("No citations supplied.");
  await expect(uncertainEvents.getByRole("link")).toHaveCount(0);
});

test("distinguishes a pending Timeline result from a completed empty result", async ({ page }) => {
  await page.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({ json: emptyTimelineSnapshot(false) }));

  await page.goto(`/case/timeline?investigation_id=${investigationId}`);
  await expect(page.getByRole("heading", { name: "Timeline reconciliation is in progress" })).toBeVisible();

  await page.unroute(`**/api/investigations/${investigationId}`);
  await page.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({ json: emptyTimelineSnapshot(true) }));
  await page.reload();

  await expect(page.getByRole("heading", { name: "No timeline results reported" })).toBeVisible();
});

test("shows an explicit unknown-investigation state on the Timeline route", async ({ page }) => {
  await page.route("**/api/investigations/missing-timeline", (route) => route.fulfill({
    status: 404,
    json: { detail: { stage: "case_file", message: "The investigation was not found.", recovery_action: "Start a new investigation." } },
  }));

  await page.goto("/case/timeline?investigation_id=missing-timeline");

  await expect(page.getByRole("heading", { name: "Investigation not found" })).toBeVisible();
  await expect(page.getByText("Start a new investigation.")).toBeVisible();
});
