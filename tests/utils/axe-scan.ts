import { expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Critical/serious axe violations fail the test; moderate/minor are attached for reference.
 * `strict` fails on every violation - used by the mock-mode suite, which is already clean. */
export async function scan(page: Page, testInfo: TestInfo, { strict = false } = {}) {
  const results = await new AxeBuilder({ page }).analyze();

  await testInfo.attach("axe-results.json", {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });

  const bySeverity = (impact: string) => results.violations.filter((v) => v.impact === impact);
  const critical = bySeverity("critical");
  const serious = bySeverity("serious");
  const moderate = bySeverity("moderate");
  const minor = bySeverity("minor");

  testInfo.annotations.push({
    type: "a11y-summary",
    description: `critical=${critical.length} serious=${serious.length} moderate=${moderate.length} minor=${minor.length}`,
  });

  const describe = (v: (typeof results.violations)[number]) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s)) — ${v.helpUrl}`;

  expect(critical.map(describe), "critical accessibility violations").toEqual([]);
  expect(serious.map(describe), "serious accessibility violations").toEqual([]);
  if (strict) {
    expect(moderate.map(describe), "moderate accessibility violations").toEqual([]);
    expect(minor.map(describe), "minor accessibility violations").toEqual([]);
  }
}
