# orbLand

**orbLand** is a personal web dev / resume site.
The **landing** page at `/` features a rotating-rings design.

**First Sections**

- **Consult** — opens in-canvas copy on the landing page (toggle via the nav).
- **About** — opens in-canvas copy
- **Orbs** — interactive solar system, link panels, and controls at [`/orbs`](http://localhost:3000/orbs).

More project spokes will link from the landing as they are added.

Traditional **resume** page (print-friendly) at [`/about`](http://localhost:3000/about).

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)

### Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start the server**

   ```bash
   npm start
   ```

3. Open [http://localhost:3000](http://localhost:3000) for the landing hub, or [http://localhost:3000/orbs](http://localhost:3000/orbs) for Orbs.

On `/orbs`, you should see a sun at the center with planets orbiting and moons where revealed.

## Contact form

The **CONTACT** row in the Consulting overlay opens a contact/interest form (`public/js/contact.js`). Submissions go to `POST /api/contact` (`lib/contact.js`), which:

1. saves the inquiry to `orbland.contact_submissions` in the shared Neon Postgres database (famList owns `public`; orbLand owns the `orbland` schema), and
2. emails a notification through [Resend](https://resend.com), with reply-to set to the visitor.

If either step fails, the submission still succeeds as long as the other one worked. Spam protection is a hidden honeypot field, a minimum fill time, and a per-instance rate limit.

| Env var | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon connection string (injected by the Vercel Storage integration) |
| `RESEND_API_KEY` | Enables email notifications |
| `CONTACT_TO` | Notification recipient (default `consult@dianilo.onmicrosoft.com`) |
| `CONTACT_FROM` | Sender on a Resend-verified domain, e.g. `orbLand <contact@schlnkr.com>` |

Schema changes live in `db/migrations/*.sql`; apply them with `npm run db:migrate` (tracked in `orbland._migrations`). For local dev, put the env vars in `.env` and run `npm run dev`. With neither `DATABASE_URL` nor `RESEND_API_KEY` set locally, submissions are only logged to the console.

## Orbs controls

Icons along the right edge of the canvas (use the control toggle in the upper-right to show them).

- **Planet speed** — orbit speed of the planet  
- **Moon speed** — orbit speed of the moon  
- **Trails** — orbit trail length (0 = off; higher = longer trails, more GPU/CPU work)  
- **Orbit radius** — planet and moon orbit radii  

Click an icon to open its popover; click outside to close.

## Project structure

```
orbLand/
├── server.js           # Express server (+ POST /api/contact)
├── lib/contact.js      # Contact form handler (Neon + Resend)
├── db/migrations/      # SQL for the orbland schema
├── scripts/db-migrate.js
├── public/
│   ├── index.html      # Landing hub (canvas)
│   ├── js/landing.js   # Landing canvas, gears, overlays
│   ├── js/contact.js   # Contact form dialog
│   ├── orbs.html
│   ├── about.html      # Resume (also linked from Orbs)
│   ├── css/landing.css
│   ├── css/style.css   # Orbs: theme vars, link panels, sliders
│   └── js/main.js      # Orbs simulation and UI
└── package.json
```

## Theme (Orbs)

Colors use CSS custom properties in `style.css`:

- `--bg-color`
- `--sun-color`
- `--planet-color`
- `--moon-color`
