# Kaskia abiline

AI shop assistant for [kaskia.ee](https://kaskia.ee). It helps customers choose the size of the Kaskia purgijahuti, answers questions only from confirmed facts, collects bulk inquiries from companies, and shows the owners what customers ask.

Built with Claude Code for the course MMT5790 Tarkvaratehnoloogiad (worksheet 08).

## Stack

- Next.js 16 (App Router, TypeScript), Tailwind CSS 4, shadcn/ui (Base UI), lucide-react
- PostgreSQL on Render through Prisma 6
- Claude API (`@anthropic-ai/sdk`): `claude-haiku-5-5` by default, `claude-sonnet-5-5` optional

## Pages

| Path | What it is |
|---|---|
| `/` | Full-page customer chat |
| `/widget` | Compact chat for the iframe on kaskia.ee |
| `/embed.js` | Script that adds the chat bubble to a page: `<script src="https://<app>.onrender.com/embed.js" defer></script>` |
| `/haldus` | Owner view (password): chats, unanswered questions, company inquiries, facts, test chat with model, prompt and settings |

## Deployment (Render)

Render deploys every push to `main`.

- Build command: `npm install && npm run build` (`prisma generate && next build`)
- Start command: `npm start` (`prisma migrate deploy && prisma db seed && next start`)
- Environment variables: see `.env.example` (`DATABASE_URL` is the Internal Database URL of the Render Postgres)

The seed only fills empty tables: the facts from `data/kaskia-faktid.csv`, the default system prompt and the default settings. Changes made in `/haldus` are never overwritten. To replace the facts later, upload a new CSV in `/haldus` → Faktid.

## Notes

- The Claude API no longer accepts `temperature`, `top_p` or `top_k` (API version 2026-10-21), so the owner settings are effort (`output_config.effort`) and answer length.
- The customer chat id is kept in `localStorage`, not in a cookie, because the widget runs in a third-party iframe where browsers block cookies.
- Customer messages are rate limited (20 per chat per 10 minutes, 60 per visitor per hour). Visitors are counted by a salted hash of the IP; the raw IP is never stored.
