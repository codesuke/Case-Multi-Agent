import { expect, test, type Page } from "@playwright/test";

const investigationId = "clocktower-bell-case";

const snapshot = {
  transport_version: "1.0.0",
  investigation_id: investigationId,
  is_complete: false,
  case_file: {
    mystery_text: "The clocktower bell disappeared before the noon recital.",
    canonical_material: "The custodian recorded the bell in place at 11:40.",
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

const liveSnapshot = {
  ...snapshot,
  is_complete: true,
  case_file: {
    ...snapshot.case_file,
    evidence: [{
      id: "CLOCK-2",
      classification: "observed_fact",
      statement: "The recital log records the bell at 11:40.",
      source_references: [],
    }],
    suspect_profiles: [{
      suspect: "The stage manager",
      motive: [{
        statement: "The stage manager controlled access to the recital platform.",
        status: "supported",
        evidence_ids: ["CLOCK-2"],
      }],
      opportunity: [],
    }],
    timeline: {
      events: [{
        order: 1,
        time: "11:40",
        statement: "The custodian recorded the bell before the recital.",
        status: "supported",
        evidence_ids: ["CLOCK-2"],
      }],
      issues: [{
        kind: "gap",
        statement: "The recital log does not identify who locked the platform.",
        evidence_ids: ["CLOCK-2"],
      }],
    },
    skeptic_reviews: [{
      outcome: "approved",
      findings: [{
        specialist: "suspect_analyst",
        kind: "missing_citation",
        claim: "The stage manager controlled access to the recital platform.",
        explanation: "The access Claim needs continued Human review.",
      }],
    }],
    verdict: {
      confidence: 58,
      conclusions: [{
        rank: 1,
        suspect: "The stage manager",
        explanation: "Access to the recital platform remains the strongest current lead.",
        evidence_ids: ["CLOCK-2"],
      }],
      limitations: ["The bell was not observed after 11:40."],
      review_status: "awaiting_review",
    },
  },
};

async function serveSnapshot(page: Page) {
  await page.route(
    `**/api/investigations/${investigationId}`,
    (route) => route.fulfill({ json: snapshot }),
  );
}

async function serveLiveInvestigation(page: Page) {
  await page.route(
    `**/api/investigations/${investigationId}`,
    (route) => route.fulfill({ json: liveSnapshot }),
  );
  await page.route(
    `**/api/investigations/${investigationId}/events**`,
    (route) => route.fulfill({
      contentType: "text/event-stream",
      body: `id: 1\nevent: lead_detective_completed\ndata: ${JSON.stringify({
        transport_version: "1.0.0",
        event_id: 1,
        event_type: "lead_detective_completed",
        investigation_id: investigationId,
        stage: "lead_detective",
        status: "completed",
        timestamp: "2026-09-13T00:00:00Z",
        evidence_ids: ["CLOCK-2"],
        message: "Clocktower synthesis completed.",
      })}\n\n`,
    }),
  );
}

test("Case Overview does not invent provider or workflow state", async ({ page }) => {
  await serveSnapshot(page);

  await page.goto(`/case/overview?investigation_id=${investigationId}`);

  await expect(page.getByText(snapshot.case_file.canonical_material)).toBeVisible();
  await expect(page.getByText("Gemini", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Case materials initialized", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Agents are analyzing the case", { exact: true })).toHaveCount(0);
});

test("every investigation result route renders the current Investigation Snapshot", async ({ page }) => {
  await serveLiveInvestigation(page);

  const routes = [
    ["/agent-workspace", "Agent Workspace"],
    ["/case/overview", liveSnapshot.case_file.canonical_material],
    ["/case/evidence", liveSnapshot.case_file.evidence[0].statement],
    ["/case/timeline", liveSnapshot.case_file.timeline.events[0].statement],
    ["/case/analysis", liveSnapshot.case_file.suspect_profiles[0].motive[0].statement],
    ["/case/verdict", liveSnapshot.case_file.verdict.conclusions[0].explanation],
  ] as const;

  for (const [route, expectedText] of routes) {
    await page.goto(`${route}?investigation_id=${investigationId}`);
    await expect(page.getByText(expectedText, { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Subject B", { exact: true })).toHaveCount(0);
    await expect(page.getByText("A supplied record describes access outside the expected time window.", { exact: true })).toHaveCount(0);
    await expect(page.getByText("The available evidence most strongly supports a restricted-access scenario.", { exact: true })).toHaveCount(0);
  }

  await page.goto(`/case/evidence?investigation_id=${investigationId}`);
  await expect(page.getByText("Evidence Collector", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Evidence extracted", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Ready for analysis", { exact: true })).toHaveCount(0);

  await page.goto(`/case/agents?investigation_id=${investigationId}`);
  await expect(page).toHaveURL(new RegExp(`/agent-workspace\\?investigation_id=${investigationId}`));
  await expect(page.getByRole("heading", { name: "Agent Workspace" })).toBeVisible();
});

test("every investigation result route renders a safe recovery state", async ({ page }) => {
  const resultRoutes = [
    "/agent-workspace",
    "/case/overview",
    "/case/evidence",
    "/case/timeline",
    "/case/analysis",
    "/case/verdict",
    "/case/agents",
  ];

  for (const route of resultRoutes) {
    await page.goto(route);
    await expect(page.getByText(/Start an investigation/i)).toBeVisible();
    await expect(page.getByText(liveSnapshot.case_file.canonical_material)).toHaveCount(0);
  }

  await page.route("**/api/investigations/unknown-clocktower", (route) => route.fulfill({
    status: 404,
    json: {
      detail: {
        stage: "case_file",
        message: "The investigation was not found.",
        recovery_action: "Start a new investigation.",
      },
    },
  }));
  await page.route("**/api/investigations/unknown-clocktower/events**", (route) => route.fulfill({
    contentType: "text/event-stream",
    body: "",
  }));

  for (const route of resultRoutes.slice(0, -1)) {
    await page.goto(`${route}?investigation_id=unknown-clocktower`);
    await expect(page.getByText(/The investigation was not found\./).first()).toBeVisible();
    await expect(page.getByText(liveSnapshot.case_file.canonical_material)).toHaveCount(0);
  }
});

test("result workspaces reject transport failures and incompatible snapshots safely", async ({ page }) => {
  await page.route("**/api/investigations/unavailable-clocktower", (route) => route.fulfill({
    status: 503,
    json: {
      detail: {
        stage: "investigation_service",
        message: "The investigation service is unavailable.",
        recovery_action: "Try again after the service restarts.",
      },
    },
  }));
  await page.goto("/case/evidence?investigation_id=unavailable-clocktower");
  await expect(page.getByRole("heading", { name: "Case file unavailable" })).toBeVisible();
  await expect(page.getByText(/Try again after the service restarts\./)).toBeVisible();

  await page.route("**/api/investigations/incompatible-clocktower", (route) => route.fulfill({
    json: { result: "not-an-investigation-snapshot" },
  }));
  await page.goto("/case/overview?investigation_id=incompatible-clocktower");
  await expect(page.getByRole("heading", { name: "Case file unavailable" })).toBeVisible();
  await expect(page.getByText(/case file data was incompatible/i)).toBeVisible();

  await page.route("**/api/investigations/incompatible-agent", (route) => route.fulfill({
    json: { result: "not-an-investigation-snapshot" },
  }));
  await page.route("**/api/investigations/incompatible-agent/events**", (route) => route.fulfill({
    contentType: "text/event-stream",
    body: "",
  }));
  await page.goto("/agent-workspace?investigation_id=incompatible-agent");
  await expect(page.getByRole("heading", { name: "Investigation unavailable" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Workflow stages" })).toHaveCount(0);
  await expect(page.getByText("Waiting for safe investigation events…")).toHaveCount(0);
});

test("Agent Workspace shows an honest loading state before its snapshot arrives", async ({ page }) => {
  await page.route(
    `**/api/investigations/${investigationId}`,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      await route.fulfill({ json: liveSnapshot });
    },
  );
  await page.route(
    `**/api/investigations/${investigationId}/events**`,
    (route) => route.fulfill({ contentType: "text/event-stream", body: "" }),
  );

  await page.goto(`/agent-workspace?investigation_id=${investigationId}`);
  await expect(page.getByRole("heading", { name: "Loading Agent Workspace" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Workflow stages" })).toHaveCount(0);
  await expect(page.getByText("Waiting for safe investigation events…")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Agent Workspace", exact: true })).toBeVisible();
});

test("completed empty Case File sections are not presented as pending", async ({ page }) => {
  const completedEmptySnapshot = {
    ...snapshot,
    is_complete: true,
    case_file: {
      ...snapshot.case_file,
      canonical_material: "",
    },
  };
  await page.route(
    `**/api/investigations/${investigationId}`,
    (route) => route.fulfill({ json: completedEmptySnapshot }),
  );

  await page.goto(`/case/overview?investigation_id=${investigationId}`);
  await expect(page.getByText("No source material is available in this Case File.")).toBeVisible();
  await expect(page.getByText("Material is still being prepared.")).toHaveCount(0);

  await page.goto(`/case/evidence?investigation_id=${investigationId}`);
  await expect(page.getByText("The completed Case File does not include displayable source material.")).toBeVisible();
  await expect(page.getByText("Material is still being prepared.")).toHaveCount(0);

  await page.goto(`/case/analysis?investigation_id=${investigationId}`);
  await page.getByRole("tab", { name: "Skeptic review" }).click();
  await expect(page.getByText("No Skeptic reviews were reported for this Case File.")).toBeVisible();
  await expect(page.getByText("Skeptic review has not started yet.")).toHaveCount(0);

  await page.goto(`/case/verdict?investigation_id=${investigationId}`);
  await expect(page.getByRole("heading", { name: "No proposed Verdict" })).toBeVisible();
  await expect(page.getByText("The investigation completed without a proposed Verdict.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verdict pending" })).toHaveCount(0);
});

test("Case File navigation and Evidence targets preserve the investigation ID", async ({ page }) => {
  await serveLiveInvestigation(page);
  const evidenceTarget = `/case/evidence?investigation_id=${investigationId}#evidence-CLOCK-2`;

  await page.goto(`/case/overview?investigation_id=${investigationId}`);
  await expect(page.getByRole("link", { name: "Evidence", exact: true })).toHaveAttribute(
    "href",
    `/case/evidence?investigation_id=${investigationId}`,
  );
  await expect(page.getByRole("link", { name: "Agent Workspace", exact: true })).toHaveAttribute(
    "href",
    `/agent-workspace?investigation_id=${investigationId}`,
  );

  for (const route of ["timeline", "analysis", "verdict"]) {
    await page.goto(`/case/${route}?investigation_id=${investigationId}`);
    await expect(page.getByRole("link", { name: "CLOCK-2" }).first()).toHaveAttribute("href", evidenceTarget);
  }
});
