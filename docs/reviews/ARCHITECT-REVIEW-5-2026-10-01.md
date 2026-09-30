# Architect review 5: 1 Oct 2026 (M5)
**Scope:** the M5 commits (`d90e3c5`, `735c049`, `02069df`) and the six re-shot screens in `docs/reviews/shots/review5/`.

## Approved
These five screens are Approved:
- `admin-flags` (no autopilot);
- `biz-talent`;
- `company-workspace`;
- `neighbour-profile` (Report is present, and there's no score);
- `settings-privacy`.

The code checks pass: `grep -ri autopilot src tests` returns nothing, `Industry` is a string, and the report flow handles 400 and 404.

## Fix (1)
- **`biz-company`:** GreenLeaf Labs, a sustainability products company, shows the industry **"Sales"** again. This is the same finding as review 3, item 4, and it came back with the five-value industry fixture.
  - Add a realistic industry to the preview fixture list (e.g. "Sustainability & environment", as an admin-added industry), and give GreenLeaf that value.
  - The preview world must stay coherent.

## Noted, not blocking
- `evidenceUrls` isn't wired in the report sheet. Leave it for M6 (it needs uploads).
