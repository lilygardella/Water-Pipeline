# SGM Water Pipeline Tracker

CGP Business Development — interactive pipeline dashboard for S&I SGM Water-Led Play.

## Running locally

```bash
npm install
node server.js
# Open http://localhost:3000
```

## Deploying to Render (free, shareable URL)

1. Push this repo to GitHub (already done)
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo `lilygardella/Water-Pipeline`
4. Render auto-detects `render.yaml` — click **Deploy**
5. Your team gets a public URL like `https://water-pipeline.onrender.com`

> **Note:** The free Render tier spins down after 15 min of inactivity (first load takes ~30s to wake). Upgrade to Starter ($7/mo) to keep it always-on.

## Importing data

Click **⬆ Import Excel** in the top-right and upload the `SGM_WaterLed_Play_Pipeline_Tracker.xlsm` file.  
Choose **Replace all** to refresh everything, or **Merge** to add new deals only.

## Data persistence

Deal edits are saved to `data/pipeline.json`. On Render, the `/data` folder is mounted as a persistent disk so edits survive redeploys.
