# GitHub Push/Pull — No Complications — With $cd

You said you messed up merges and spent hours retrieving working version, hence folder copies like finance-engine-v3.5. This guide fixes that.

## Golden Rule — Always $cd to right folder BEFORE any git command

```bash
# 1. Open terminal
# 2. Always check where you are
pwd
# Should show .../project-onion

# 3. $cd to project root FIRST — before any git
cd ~/projects/project-onion
pwd
# Now you are in right folder

# 4. Check git status BEFORE pull/push
git status
# Should show branch and modified files

# 5. Pull latest BEFORE you start work — avoid merge mess
git checkout main
git pull origin main

# 6. Create feature branch per module — not main direct
git checkout -b feature/05-fusion-engine
# Example: feature/01-anchor-service, feature/08-pastel-ux

# 7. Work only in your module folder
cd ~/projects/project-onion/modules/05-fusion-engine
# Edit PRD.md, API.yaml etc.

# 8. Add only your module files — not whole repo
cd ~/projects/project-onion
git add modules/05-fusion-engine/
git status
# Check only your module files staged

# 9. Commit with conventional message
git commit -m "feat(fusion): add weekly bucket milestone + significance_score >0.5"

# 10. Push feature branch
git push origin feature/05-fusion-engine

# 11. On GitHub, create PR → Squash and merge → Delete branch
# This avoids hours of merge fix — one commit per feature

# 12. Tag working version — replaces folder copies like v3.5
git checkout main
git pull origin main
git tag v0.1-working-demo
git push origin v0.1-working-demo
# If you mess up, retrieve in 5 seconds:
git checkout v0.1-working-demo
```

## How to retrieve working version — replaces multiple versions folder approach

```bash
# List tags — your saved working versions
git tag

# Checkout tag to new branch — 5 seconds, not hours
git checkout -b restore-v01 v0.1-working-demo

# Or view file from tag without checkout
git show v0.1-working-demo:modules/05-fusion-engine/PRD.md
```

## Never do this — what caused rabbit hole
- ❌ Copy folder finance-engine-v3.5 to finance-engine-v3.6 — use git tag instead
- ❌ git add . from wrong folder — always cd to project root first
- ❌ Commit on main direct — always feature branch
- ❌ git merge main into feature — use rebase or squash merge via PR

## For hackathon team machines — multi-user value
```bash
cd ~/projects/project-onion
git pull origin main
# Each person works on different module folder
# Person A: modules/02-file-crawler/
# Person B: modules/04-harvester/
# Person C: modules/08-experience-pwa/
# No conflicts because different folders
```

## README auto-update without huge tokens
- GitHub Action .github/workflows/readme.yml runs on push
- It cats PRD.md + API.yaml > README.md — no LLM, <500 tokens
- If you need summary, Action calls Bedrock with only PRD.md ~200 tokens, not whole repo
- You never manually update README

File: .github/workflows/readme.yml (auto-created)
