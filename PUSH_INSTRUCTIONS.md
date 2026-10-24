# Publish B-School Atlas on GitHub Pages

It's free, needs no domain, and the public repository doubles as a resume project.

## One-time setup (about 5 minutes)
0. Using Claude Desktop instead? Follow `HANDOFF.md`; it does all of this for you.
1. Sign in at github.com and create a **new public repository** named `bschool-atlas`. Leave it empty (no README, no license).
2. In a terminal, from this project folder:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/bschool-atlas.git
   git push -u origin main
   ```
3. On GitHub, open the repo, then **Settings**, then **Pages**. Under **Build and deployment**, set **Source** to **GitHub Actions**.
4. Open the **Actions** tab. The "Deploy to GitHub Pages" run takes about a minute. When it turns green, the site is live at:
   `https://<your-username>.github.io/bschool-atlas/`
5. On the repo's main page, click the gear next to **About**, paste the site URL into **Website**, and add topics such as `mba`, `calculator`, `javascript`, `education`.
6. Replace the live-site placeholder at the top of `README.md` and the link in `linkedin_post.md`, then commit and push.

## Updating later
Edit, commit and `git push`. The workflow runs the tests and redeploys automatically. If the tests fail, nothing is deployed.

## Adding it to your resume
**B-School Atlas** – Web app for MBA applicants to compare global programmes, check Indian B-school cut-offs by entrance exam, and estimate payback, NPV and IRR.
Plain JavaScript, 7 languages, 25 automated tests, CI/CD on GitHub Actions. <live link> · <repo link>

## Custom domain (optional)
Buy a domain, add it under **Settings**, then **Pages**, then **Custom domain**, and follow GitHub's DNS instructions. Everything keeps working on the free `github.io` address if you never do this.
