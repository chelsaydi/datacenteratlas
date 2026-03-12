# Data Center World Map

A single-page site that shows **active data center counts** on an interactive world map. Each marker is a major hub (metro/region); click for details.

## Run locally

Browsers block `fetch()` to local JSON when opening `index.html` as a file. Use any static server:

```bash
cd "/Users/chelseasaydi/Data center"
python3 -m http.server 8080
```

Then open **http://localhost:8080**

## IT investment strip

`meta.investment` in `data/centers.json` drives the **IT investment to date** banner:

- `amountUsd` — base total in USD (shown compact, e.g. `$415B`)
- `asOf` — label year/quarter for the base figure
- `caption` — short disclaimer line
- `perSecondUsd` — optional; if set, the on-screen total **increments every second** by this amount (illustrative “live” run-rate). Set to `0` or remove to keep a static number.

## Water consumed strip

`meta.water` in `data/centers.json` drives the **water consumed to date** block (next to investment):

- `litersCumulative` — base total in liters (very large numbers show as trillion / quadrillion L)
- `asOf` — label year for the base figure
- `caption` — disclaimer (e.g. cooling & operations, illustrative)
- `perSecondLiters` — optional; total **ticks up every second** by this many liters. Set to `0` to keep static.

## Customize

- **Data**: Edit `data/centers.json`. Each hub needs `name`, `country`, `lat`, `lng`, `count` (active sites), and optional `type`.
- **Tiles**: In `js/app.js`, swap the `L.tileLayer` URL for another provider if you prefer a different basemap.
- **Styling**: `css/styles.css` uses a dark theme; adjust `--accent` and fonts in `:root`.

## Live news panel

The right-hand column loads **headlines from Google News** (data centers, fires, outages, incidents) via the free [rss2json](https://rss2json.com/) API. If feeds fail (rate limit/offline), use **Refresh** or the Google News link shown.

## Stack

- [Leaflet](https://leafletjs.com/) + OpenStreetMap (CARTO dark tiles)
- News: Google News RSS → rss2json (no API key for light use)
- No build step—plain HTML/CSS/JS

## Note on numbers

The bundled JSON uses **representative aggregated counts** per hub for demo purposes. For production, plug in your own API or dataset (e.g., internal inventory, or a licensed colocation database).
