# SGM Water Pipeline Tracker

CGP Business Development — interactive pipeline dashboard for S&I SGM Water-Led Play.

## Live site

Once GitHub Pages is enabled, the dashboard will be at:  
`https://lilygardella.github.io/Water-Pipeline/`

## Enabling GitHub Pages

1. Go to **Settings → Pages** in this repository
2. Under **Source**, select **Deploy from a branch**
3. Choose branch **main**, folder **/ (root)**
4. Click **Save** — Pages will be live in ~1 minute

## Daily workflow (editing deals)

1. Open the live site
2. Edit deals directly in the dashboard (click any card → Edit)
3. When done, click **⬇ Download pipeline.json** from the unsaved-changes banner
4. Replace `data/pipeline.json` in your local clone with the downloaded file
5. `git add data/pipeline.json && git commit -m "Update pipeline data" && git push`

GitHub Pages serves the updated data on the next page load.

## Importing from Excel

Click **⬆ Import Excel** and upload `SGM_WaterLed_Play_Pipeline_Tracker.xlsm`.  
Choose **Replace all** to refresh everything, or **Merge** to add new deals only.  
After importing, download and commit `pipeline.json` as above.

## Data file

Deal data lives in `data/pipeline.json`. Edits made in the browser are held in  
localStorage until you download and commit the file — at which point all users  
see the update on their next page load.
