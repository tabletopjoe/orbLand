# orbLand

Minimal black canvas at `/` (centered circle, ~50% area). **Orbs** (solar system + link lists) lives at `/orbs`; **About** at `/about`. Work in progress.

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

3. Open [http://localhost:3000](http://localhost:3000) for the landing canvas, or [http://localhost:3000/orbs](http://localhost:3000/orbs) for the interactive solar system and link panels.

On `/orbs`, you should see a sun at the center with planets orbiting and moons where revealed.

## Controls

35px icons along the right edge of the canvas, revealed after clicking control toggle in upper-right corner. 

- **Planet speed** – adjust orbit speed of the planet
- **Moon speed** – adjust orbit speed of the moon
- **Trails** – orbit trail length (0 = off; higher = longer trails, more work for the GPU/CPU)
- **Orbit radius** – adjust planet and moon orbit radii

Click an icon to open its popover; click outside to close.

## Project Structure

```
orbLand/
├── server.js       # Express server
├── public/
│   ├── index.html      # Landing (canvas)
│   ├── js/landing.js   # Landing canvas draw
│   ├── orbs.html       # Solar system + link categories
│   ├── about.html
│   ├── css/landing.css # Landing page
│   ├── css/style.css   # Orbs: theme vars, link panels, sliders
│   └── js/main.js      # Orbs simulation and UI
└── package.json
```

## Theme

Colors are defined via CSS custom properties in `style.css`:

- `--bg-color`
- `--sun-color`
- `--planet-color`
- `--moon-color`
