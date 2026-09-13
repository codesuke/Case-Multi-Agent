import { expect, test, type Page } from "@playwright/test";

const investigationId = "unrelated-fictional-case";
const snapshot = {
  transport_version: "1.0.0" as const,
  investigation_id: investigationId,
  is_complete: false,
  case_file: {
    mystery_text: "A lighthouse keeper reports a missing signal lantern.",
    canonical_material: "Lighthouse log: the signal lantern went dark after midnight.",
    material_blocks: [],
    material_warnings: [],
    human_notes: [],
    source_text: {},
    revised_specialists: [],
    evidence: [
      { id: "CLUE-7", classification: "observed_fact", statement: "The lantern was dark after midnight.", source_references: [] },
      { id: "CLUE-9", classification: "observed_fact", statement: "The lighthouse door was unlocked.", source_references: [] },
    ],
    suspect_profiles: [],
    timeline: {
      events: [{ order: 1, time: "00:10", statement: "The lantern went dark.", status: "supported", evidence_ids: ["CLUE-7"] }],
      issues: [{ kind: "contradiction", statement: "The door record conflicts with the keeper's statement.", evidence_ids: ["CLUE-9"] }],
    },
    skeptic_reviews: [],
  },
};

const reviewSnapshot = {
  ...snapshot,
  is_complete: true,
  case_file: {
    ...snapshot.case_file,
    verdict: {
      confidence: 65,
      conclusions: [{ rank: 1, suspect: "The lighthouse keeper", explanation: "The signal log is incomplete.", evidence_ids: ["CLUE-7"] }],
      limitations: ["No witness confirms the final entry."],
      review_status: "awaiting_review",
    },
  },
};

type StartFailure = {
  stage: string;
  message: string;
  recovery_action: string;
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
    body: `id: 1\nevent: evidence_collection_started\ndata: {"transport_version":"1.0.0","event_id":1,"event_type":"evidence_collection_started","investigation_id":"${investigationId}","stage":"evidence_collection","status":"working","timestamp":"2026-09-12T00:00:00Z","evidence_ids":[]}\n\n`,
  }));
}

async function mockStartFailure(
  page: Page,
  status: number,
  detail: StartFailure,
) {
  await page.route("**/api/investigations", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({ status, json: { detail } });
  });
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
  await expect(page.getByRole("heading", { name: /CLUE-7/ })).toBeVisible();
});

test("opens cited Evidence from Timeline events and issues in the same Case File", async ({ page }) => {
  await mockInvestigationApi(page);
  await page.goto(`/case/timeline?investigation_id=${investigationId}`);

  await page.getByRole("heading", { name: "Chronological events" }).locator("..").getByRole("link", { name: "CLUE-7" }).click();
  await expect(page).toHaveURL(new RegExp(`/case/evidence\\?investigation_id=${investigationId}#evidence-CLUE-7`));
  await expect(page.locator("#evidence-CLUE-7")).toContainText("The lantern was dark after midnight.");

  await page.goBack();
  await page.getByRole("heading", { name: "Open timeline issues" }).locator("..").getByRole("link", { name: "CLUE-9" }).click();
  await expect(page).toHaveURL(new RegExp(`/case/evidence\\?investigation_id=${investigationId}#evidence-CLUE-9`));
  await expect(page.locator("#evidence-CLUE-9")).toContainText("The lighthouse door was unlocked.");
});

test("rejects an unsupported file before it sends the start command", async ({ page }) => {
  let startCalls = 0;
  await page.route("**/api/investigations", async (route) => {
    if (route.request().method() === "POST") startCalls += 1;
    await route.fallback();
  });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "case-image.png",
    mimeType: "image/png",
    buffer: Buffer.from("not case material"),
  });

  await expect(page.getByText("case-image.png can’t be used.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Start investigation" })).toBeDisabled();
  expect(startCalls).toBe(0);
});

test("keeps the User on Start Investigation and focuses a safe material failure", async ({ page }) => {
  await mockStartFailure(page, 400, {
    stage: "case_file",
    message: "The supplied material cannot be used.",
    recovery_action: "Add readable case material and try again.",
  });
  await page.goto("/");
  await page.getByLabel("Paste case material").fill("Unreadable material");
  await page.getByRole("button", { name: "Start investigation" }).click();

  await expect(page).toHaveURL(/\/$/);
  const alert = page
    .getByRole("region", { name: "Start investigation" })
    .getByRole("alert");
  await expect(alert).toContainText("The supplied material cannot be used.");
  await expect(alert).toContainText("Add readable case material and try again.");
  await expect(alert).toBeFocused();
});

test("shows a safe recovery action when the investigation service is unavailable", async ({ page }) => {
  await mockStartFailure(page, 503, {
    stage: "investigation_service",
    message: "The investigation service is unavailable.",
    recovery_action: "Wait a moment and try starting the investigation again.",
  });
  await page.goto("/");
  await page.getByLabel("Paste case material").fill("A signal lantern is missing.");
  await page.getByRole("button", { name: "Start investigation" }).click();

  const alert = page
    .getByRole("region", { name: "Start investigation" })
    .getByRole("alert");
  await expect(alert).toContainText("The investigation service is unavailable.");
  await expect(alert).toContainText("Wait a moment and try starting the investigation again.");
  await expect(alert).not.toContainText("127.0.0.1");
  await expect(alert).not.toContainText("SHERLOK_PYTHON_API_URL");
});

test("locks every material control while Start Investigation is pending", async ({ page }) => {
  let releaseStart: () => void;
  const startReleased = new Promise<void>((resolve) => {
    releaseStart = resolve;
  });
  let requestReceived: () => void;
  const startRequested = new Promise<void>((resolve) => {
    requestReceived = resolve;
  });
  await page.route("**/api/investigations", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    requestReceived();
    await startReleased;
    await route.fulfill({ json: { investigation_id: investigationId } });
  });
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles([
    { name: "case-material.txt", mimeType: "text/plain", buffer: Buffer.from("Case material") },
    { name: "case-image.png", mimeType: "image/png", buffer: Buffer.from("Not case material") },
  ]);
  await page.getByRole("button", { name: "Start investigation" }).click();
  await startRequested;

  await expect(page.getByRole("button", { name: "Preparing case file…" })).toBeDisabled();
  await expect(page.locator('input[type="file"]')).toBeDisabled();
  await expect(page.getByRole("button", { name: "Remove case-material.txt" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Dismiss case-image.png error" })).toBeDisabled();
  releaseStart!();
  await expect(page).toHaveURL(new RegExp(`/agent-workspace\\?investigation_id=${investigationId}`));
});

test("redirects the legacy agent route without losing the investigation ID", async ({ page }) => {
  await mockInvestigationApi(page);
  await page.goto(`/case/agents?investigation_id=${investigationId}`);
  await expect(page).toHaveURL(new RegExp(`/agent-workspace\\?investigation_id=${investigationId}`));
  await expect(page.getByRole("heading", { name: "Agent Workspace" })).toBeVisible();
});

test("shows structured preparation, parallel revision, and follow-up events without inventing a specialist order", async ({ page }) => {
  const events = [
    publicEvent(1, "case_structuring_started", "case_structuring", "working"),
    publicEvent(2, "case_structuring_completed", "case_structuring", "completed"),
    publicEvent(3, "suspect_analysis_started", "suspect_analysis", "working"),
    publicEvent(4, "timeline_reconciliation_started", "timeline_reconciliation", "working"),
    publicEvent(5, "specialist_revision_started", "specialist_revision", "revising", "suspect_analyst"),
    publicEvent(6, "follow_up_planning_completed", "follow_up_planning", "completed", undefined, ["LANTERN-4"]),
  ];
  await page.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({ json: snapshot }));
  await page.route(`**/api/investigations/${investigationId}/events**`, (route) => route.fulfill({
    contentType: "text/event-stream",
    body: events.map((event) => `id: ${event.event_id}\nevent: ${event.event_type}\ndata: ${JSON.stringify(event)}\n\n`).join(""),
  }));

  await page.goto(`/agent-workspace?investigation_id=${investigationId}`);

  const workflow = page.getByRole("region", { name: "Workflow stages" });
  await expect(workflow.getByRole("listitem").filter({ hasText: "Case Structurer" })).toContainText("completed");
  await expect(workflow.getByRole("listitem").filter({ hasText: "Suspect Analyst" })).toContainText("revising");
  await expect(workflow.getByRole("listitem").filter({ hasText: "Timeline Reconciler" })).toContainText("working");
  await expect(workflow.getByRole("listitem").filter({ hasText: "Follow-up Planner" })).toContainText("completed");
  await expect(page.getByText("LANTERN-4")).toBeVisible();
});

function publicEvent(
  eventId: number,
  eventType: string,
  stage: string,
  status: "working" | "completed" | "revising",
  specialist?: "suspect_analyst" | "timeline_reconciler",
  evidenceIds: string[] = [],
) {
  return {
    transport_version: "1.0.0",
    event_id: eventId,
    event_type: eventType,
    investigation_id: investigationId,
    stage,
    status,
    timestamp: "2026-09-13T00:00:00Z",
    specialist,
    evidence_ids: evidenceIds,
  };
}

test("shows a safe recovery message for an unknown investigation", async ({ page }) => {
  await page.route("**/api/investigations/unknown-case", (route) => route.fulfill({
    status: 404,
    json: { detail: { stage: "case_file", message: "The investigation was not found.", recovery_action: "Start a new investigation." } },
  }));
  await page.goto("/case/overview?investigation_id=unknown-case");
  await expect(page.getByRole("heading", { name: "Case file unavailable" })).toBeVisible();
  await expect(page.getByText("The investigation was not found.")).toBeVisible();
});

test("focuses a Skeptic finding's Claim and follows its cited Evidence", async ({ page }) => {
  await page.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({ json: analysisSnapshot }));

  await page.goto(`/case/analysis?investigation_id=${investigationId}`);
  await page.getByRole("tab", { name: /Skeptic review/ }).click();
  await expect(page.getByText("The stated motive needs stronger support.")).toBeVisible();

  await page.getByRole("button", { name: "Focus matching claim: The keeper needed the lantern to remain dark." }).click();
  const claim = page.getByRole("button", { name: "Inspect claim: The keeper needed the lantern to remain dark." });
  await expect(claim).toBeFocused();

  const evidenceLink = page.getByRole("link", { name: "CLUE-7" });
  await expect(evidenceLink).toHaveAttribute(
    "href",
    `/case/evidence?investigation_id=${investigationId}#evidence-CLUE-7`,
  );
  await evidenceLink.click();
  await expect(page).toHaveURL(new RegExp(`/case/evidence\\?investigation_id=${investigationId}#evidence-CLUE-7`));
});

test("does not invent a Claim target or revision state", async ({ page }) => {
  const snapshotWithUnmatchedFinding = {
    ...analysisSnapshot,
    is_complete: true,
    case_file: {
      ...analysisSnapshot.case_file,
      suspect_profiles: [],
      revised_specialists: [],
      skeptic_reviews: [
        {
          outcome: "approved" as const,
          findings: [
            {
              specialist: "timeline_reconciler" as const,
              kind: "missing_citation" as const,
              claim: "The log entry has no cited Evidence.",
              explanation: "The timeline Claim is outside the displayed suspect profiles.",
            },
          ],
        },
      ],
    },
  };
  await page.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({ json: snapshotWithUnmatchedFinding }));

  await page.goto(`/case/analysis?investigation_id=${investigationId}`);
  await expect(page.getByText("No suspect profiles are available. Skeptic findings are available in the Skeptic review tab.")).toBeVisible();
  await expect(page.getByText("Suspect analysis has a reported revision.")).not.toBeVisible();
  await page.getByRole("tab", { name: /Skeptic review/ }).click();
  await expect(page.getByText("The timeline Claim is outside the displayed suspect profiles.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Focus matching claim/ })).toHaveCount(0);
});

test("shows a reported suspect-analysis revision", async ({ page }) => {
  await page.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({
    json: {
      ...analysisSnapshot,
      case_file: { ...analysisSnapshot.case_file, revised_specialists: ["suspect_analyst"] },
    },
  }));

  await page.goto(`/case/analysis?investigation_id=${investigationId}`);
  await expect(page.getByText("Suspect analysis has a reported revision.")).toBeVisible();
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
  await expect(secondPage).toHaveURL(new RegExp(`/agent-workspace\\?investigation_id=${investigationId}`));
});
