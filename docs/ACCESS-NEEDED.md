# Access needed

Checked 2026-09-26 from this Mac. Secrets were not printed.

## Already available

| Need | Status |
|---|---|
| GitHub `VikisolTechnologies` | `gh` is logged in with `repo` scope. Both Arena remotes are `github.com/VikisolTechnologies/...`. |
| Railway | Logged in as Vikisol Technologies. Project `arena-staging` is visible. `arena-api`, Postgres, and Redis are online. `api-arena.vikisol.in` serves the current backend commit. |
| Vercel | Logged in as `vikisoltech`. `arena.vikisol.in` serves the current frontend commit. |
| Demo accounts | Five roles are documented in `TEST-LOGINS.md`. A gitignored `.env.test` was created locally so Playwright can use them. Do not commit that file. |
| JennySol / One production | Not required for this mission, and One production must not be touched. |

## Still missing

1. **Sentry read.** `sentry-cli` is not installed, and no Sentry project was opened. Not required to keep building. Useful later for production errors.
2. **Playwright browsers on this Mac.** The suite could not launch (`npx playwright install` was started). This is a local tool install, not an account the founder needs to share.
3. **Railway service link inside the backend folder.** `railway status` shows project `arena-staging` but "Linked service: None". Deploys already happen from GitHub, so this does not block a normal push. Linking `arena-api` is only needed for service logs from the CLI.

No new API keys are requested. Do not paste Gemini, Cloudinary, Resend, database, or JWT values into chat.
