# Halo Nite S6 Stats

Season 6 stats website for Halo Nite, hosted on GitHub Pages.

## Update workflow

After each session:

1. Update `data/S6 Carnage Report.xlsx` as usual (add new game rows)
2. Regenerate the JSON:
   ```bash
   python3 scripts/generate.py
   ```
3. Commit and push:
   ```bash
   git add "data/S6 Carnage Report.xlsx" docs/data/stats.json
   git commit -m "Halo Nite S6 — Night #X"
   git push
   ```

The site updates automatically within ~1 minute of pushing.

## Local preview

```bash
cd docs
python3 -m http.server 8080
# Open http://localhost:8080
```

> Note: open via `http://localhost:8080`, not as a `file://` path — the browser needs a server to load `stats.json`.

## Setup (first time)

```bash
pip3 install -r scripts/requirements.txt
```

## GitHub Pages setup

1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Source: **Deploy from branch** → `main` → `/docs`
4. Site will be live at `https://[username].github.io/[repo-name]`

## Pages

| Page | URL |
|------|-----|
| Season Overview | `index.html` |
| Player Profiles | `players.html` |
| Game Log | `games.html` |
| Team Stats | `teams.html` |
| Map Stats | `maps.html` |
| Season Records | `records.html` |
