import { expect, test } from "@playwright/test";

const investigationId = "harbor-case";

const snapshot = {
  transport_version: "1.0.0",
  investigation_id: investigationId,
  is_complete: false,
  case_file: {
    mystery_text: "A fictional harbor signal went dark.",
    canonical_material: "",
    material_warnings: ["One supplied table could not be read with full certainty.", "A supplied list has no page location."],
    material_blocks: [
      {
        id: "log-section",
        kind: "section",
        nesting: 0,
        ordinal: 1,
        text: "Night watch log",
        source_reference: {
          block_id: "log-section",
          source_name: "Harbor log",
          heading: "Night watch",
          page: 2,
          paragraph: 1,
        },
      },
      {
        id: "log-note",
        kind: "paragraph",
        nesting: 1,
        ordinal: 2,
        text: "The west signal was dark after midnight.",
        source_reference: {
          block_id: "log-note",
          source_name: "Harbor log",
          heading: "Night watch",
          page: 2,
          paragraph: 2,
        },
      },
      {
        id: "log-list",
        kind: "unordered_list_item",
        nesting: 1,
        ordinal: 3,
        text: "The patrol boat returned before dawn.",
        source_reference: {
          block_id: "log-list",
          source_name: "Patrol note",
          list_position: "item 2",
        },
      },
      {
        id: "light-table",
        kind: "table",
        nesting: 0,
        ordinal: 4,
        text: "Light observations",
        source_reference: {
          block_id: "light-table",
          source_name: "Harbor log",
          table_row: 1,
        },
        table: {
          title: "Light observations",
          headers: ["Time", "Signal"],
          rows: [["00:15", "Dark"]],
          is_uncertain: true,
          header_references: [{ block_id: "light-table", source_name: "Harbor log", table_row: 1, table_column: 1 }],
          row_references: [{ block_id: "light-table", source_name: "Harbor log", table_row: 2 }],
          cell_references: [[{ block_id: "light-table", source_name: "Harbor log", table_row: 2, table_column: 1 }]],
        },
      },
    ],
    human_notes: [],
    source_text: {},
    revised_specialists: [],
    evidence: [],
    suspect_profiles: [],
    timeline: { events: [], issues: [] },
    skeptic_reviews: [],
  },
};

test("reads curated material, warns about uncertainty, and keeps the investigation ID", async ({ page }) => {
  await page.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({ json: snapshot }));

  await page.goto(`/case/overview?investigation_id=${investigationId}`);

  const material = page.getByRole("region", { name: "Canonical case material" });
  await expect(material).toContainText("Night watch log");
  await expect(material).toContainText("The west signal was dark after midnight.");
  await expect(material).toContainText("Harbor log");
  await expect(material).toContainText("Night watch");
  await expect(material).toContainText("page 2");
  await expect(material).toContainText("paragraph 2");
  await expect(material).toContainText("The patrol boat returned before dawn.");
  await expect(material).toContainText("Patrol note");
  await expect(material).toContainText("item 2");
  await expect(material.getByRole("table", { name: "Light observations" })).toContainText("00:15");
  await expect(material.getByText("Table structure is uncertain.")).toBeVisible();
  await expect(material.getByText("Table source references")).toBeVisible();
  await expect(material).toContainText("table row 2");
  await expect(material).toContainText("table column 1");
  await expect(material.getByRole("alert")).toContainText("One supplied table could not be read with full certainty.");
  await expect(material.getByRole("alert")).toContainText("A supplied list has no page location.");
  await expect(page.getByRole("link", { name: "Evidence" })).toHaveAttribute(
    "href",
    `/case/evidence?investigation_id=${investigationId}`,
  );
});

test("shows an honest empty state when the Case File has no canonical material", async ({ page }) => {
  await page.route(`**/api/investigations/${investigationId}`, (route) => route.fulfill({
    json: {
      ...snapshot,
      case_file: {
        ...snapshot.case_file,
        canonical_material: "",
        material_blocks: [],
        material_warnings: [],
      },
    },
  }));

  await page.goto(`/case/overview?investigation_id=${investigationId}`);

  await expect(page.getByText("No canonical case material is available for this Case File.")).toBeVisible();
});
