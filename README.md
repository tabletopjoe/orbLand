# orbLand

A minimal 2D solar system simulator: one sun at center, one planet, one moon. Stylized and theme-based.

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

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see a sun at the center with a planet orbiting it and a moon orbiting the planet.

## Controls

35px icons along the right edge of the canvas:

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
│   ├── index.html
│   ├── css/style.css   # Theme vars, icon strip, popovers
│   └── js/main.js      # Simulation and icon handlers
└── package.json
```

## Theme

Colors are defined via CSS custom properties in `style.css`:

- `--bg-color`
- `--sun-color`
- `--planet-color`
- `--moon-color`
