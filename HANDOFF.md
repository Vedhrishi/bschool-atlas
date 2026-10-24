# Hand-off: publish B-School Atlas from Claude Desktop

This folder is a complete git repository with one clean commit by **Pasupuleti VedhRishi <vedhrishi54@gmail.com>**. The steps below create the public GitHub repo and turn on GitHub Pages.

## Before you start
1. Unzip `bschool-atlas.zip` somewhere easy, for example `Documents/bschool-atlas`.
2. Open Claude Desktop, choose **Code**, and pick that folder as the project.
3. If Claude says the GitHub CLI isn't signed in, run `gh auth login` in a terminal once and follow the prompts.

## Paste this into Claude Desktop

> This folder is my project **B-School Atlas**, a static website (HTML/CSS/JS, no build step) with a GitHub Actions workflow in `.github/workflows/pages.yml` that tests and deploys it to GitHub Pages. Please:
> 1. Check `git log --format='%an <%ae>'` shows only `Pasupuleti VedhRishi <vedhrishi54@gmail.com>`, and that `git config user.name` / `user.email` in this repo are the same. Never use any other author name.
> 2. Check `gh auth status`. If I'm not signed in, tell me to run `gh auth login` and wait.
> 3. Run `node --test` and confirm all tests pass.
> 4. Create a **public** repo and push: `gh repo create bschool-atlas --public --source=. --remote=origin --push --description "Compare MBA destinations, Indian B-school cut-offs by exam, and payback"`
> 5. Turn on Pages with GitHub Actions as the source: `gh api -X POST repos/{owner}/bschool-atlas/pages -f build_type=workflow` (replace `{owner}` with my GitHub username; if Pages is already enabled, use `-X PUT` instead).
> 6. Start the deploy if it hasn't started: `gh workflow run "Deploy to GitHub Pages"`, then watch it with `gh run watch` until it succeeds.
> 7. Get the live URL (`https://<username>.github.io/bschool-atlas/`). Put it into: the "Live site" line at the top of `README.md`, the "Try it" line in `linkedin_post.md`, and the repo's website field (`gh repo edit --homepage <url>`). Add topics: `gh repo edit --add-topic mba,education,calculator,javascript,india,gmat,cat-exam`.
> 8. Commit those edits as "Add live site link" and push. Then open the live URL and tell me it works.

## After it's live
- **Resume line:** *B-School Atlas*: web app for MBA applicants to compare global programmes, find Indian B-schools by entrance-exam score, and estimate payback, NPV and IRR. Plain JavaScript, 7 languages, 30 automated tests, CI/CD with GitHub Actions. Add the live link and the repo link.
- **Future updates:** edit, commit and push. The site redeploys automatically after the tests pass.
