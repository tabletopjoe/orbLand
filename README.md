# orbLand

**orbLand** is a personal web dev / resume site organized as a **hub and spokes**: the **landing** page at `/` is the hub—a chromatic ring canvas with navigation that branches out like wheel spokes to other areas.

**First spokes**

- **About** — opens in-canvas copy on the landing page (toggle via the nav).
- **Orbs** — interactive solar system, link panels, and controls at [`/orbs`](http://localhost:3000/orbs).

More project spokes will link from the landing as they are added.

The traditional **resume** page (print-friendly) remains at [`/about`](http://localhost:3000/about).

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
├── server.js           # Express server
├── public/
│   ├── index.html      # Landing hub (canvas)
│   ├── js/landing.js   # Landing canvas, gears, overlays
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
