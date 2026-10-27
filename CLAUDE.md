# Kaskia abiline

AI shop assistant for Kaskia (kaskia.ee). This project is a web app that runs on Render, not on this computer.

## Deployment

- Render deploys the app automatically from the `main` branch of this GitHub repo (loosgert/kaskia-abiline).
- The database is a Render PostgreSQL database. It is available only through the `DATABASE_URL` environment variable on Render.
- Do not set up a local database or a local server.
- Before every push, run `npm run build` and make sure the app builds without errors.
- After each finished task, commit and push to GitHub so that Render deploys the new version.

## Rules

- Environment variables: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`. They are set in Render. Never hard-code or print them.
- Claude API: official `@anthropic-ai/sdk`, server code only. Models `claude-haiku-5-5` (default) and `claude-sonnet-5-5`. Never send `temperature`, `top_p` or `top_k`.
- The UI is in Estonian. Customer-facing Estonian texts are approved copy: use them word for word and ask the owner before adding new ones.
- The assistant answers only from the facts in `data/kaskia-faktid.csv` (loaded into the `Fact` table). It never uses the word "õlu", never writes "teeme" or "Kaskia teeb" about products, does not say who manufactures the products, and uses no exclamation marks.
- The seed never overwrites facts the owners already have. When `data/kaskia-faktid.csv` changes, the owners upload it in /haldus → Faktid. When the default prompt changes, add the old prompt's SHA-256 to `PREVIOUS_DEFAULT_PROMPT_HASHES` so the seed updates an unedited stored prompt.
