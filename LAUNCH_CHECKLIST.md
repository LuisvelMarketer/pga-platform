# 🚀 PGA Platform - Launch Checklist

**Use this checklist when you're ready to make the repository public after patent approval.**

**Estimated Time:** 30 minutes
**Prerequisites:** ✅ Patent approved and filed

---

## 📋 Pre-Launch Verification (5 min)

Before making the repository public, verify everything is ready:

### ✅ Code Quality Check

```bash
# Run all checks locally
npm run lint
npm run typecheck
npm test
npm run build
```

**Expected:** All commands should pass without errors.

---

### ✅ Security Scan

```bash
# Check for secrets in git history
git log --all --full-history -- "*secret*" "*password*" "*.env*" "*key*" "*token*"

# Check for TODO/FIXME that should be addressed
grep -r "TODO\|FIXME\|XXX\|HACK" packages/core/src --exclude-dir=node_modules
```

**Expected:**
- No secrets found in git history
- Review any TODOs/FIXMEs (optional to fix before launch)

---

### ✅ Documentation Review

```bash
# Verify key documentation exists
ls -la README.md CONTRIBUTING.md SECURITY.md LICENSE
ls -la .github/ISSUE_TEMPLATE/ .github/pull_request_template.md
```

**Expected:** All files should exist.

---

## 🌍 Make Repository Public (2 min)

### Step 1: Change Visibility

1. Go to: `https://github.com/pga-ai/pga-platform/settings`

2. Scroll to bottom → **"Danger Zone"**

3. Click **"Change visibility"**

4. Select **"Make public"**

5. Type repository name to confirm: `pga-ai/pga-platform`

6. Click **"I understand, change repository visibility"**

---

### Step 2: Verify Branch Protection is Active

1. Go to: `https://github.com/pga-ai/pga-platform/settings/branches`

2. Verify the `main` branch rule shows:
   - ✅ Require pull request reviews (1 approval)
   - ✅ Require status checks: `validate`, `Test (20.x)`, `build`
   - ✅ Require conversation resolution
   - ✅ Do not allow bypassing

3. **Important:** The warning "won't be enforced on private repository" should now be **GONE**.

**Expected:** Branch protection is now active and enforced.

---

### Step 3: Verify Dependabot is Active

1. Go to: `https://github.com/pga-ai/pga-platform/settings/security_analysis`

2. Verify these are enabled:
   - ✅ Dependabot alerts
   - ✅ Dependabot security updates
   - ✅ Dependabot version updates

3. Check for any existing alerts:
   - Go to: `https://github.com/pga-ai/pga-platform/security/dependabot`

**Expected:** Dependabot is active. You may see some alerts/PRs being created.

---

## 🏷️ Create First Public Release (10 min)

### Step 1: Verify Current State

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Verify version in package.json
cat packages/core/package.json | grep '"version"'
```

**Expected:** Should show `"version": "0.4.0"`

---

### Step 2: Create Release Tag

```bash
# Create annotated tag for v0.4.0
git tag -a v0.4.0 -m "Release v0.4.0 - Gene Bank, THK, Intelligence Boost

Features:
- 🧬 Gene Bank: Horizontal Knowledge Transfer system
- 🔄 Multi-Model Support (OpenAI adapter)
- 📊 Evaluation Framework for PGA benchmarking
- 🚀 Intelligence Boost (0% → 100% agent upgrade)
- 📝 Complete documentation and unit tests
- 🏗️ Full CI/CD and operational infrastructure

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# Push tag to trigger release workflow
git push origin v0.4.0
```

---

### Step 3: Monitor Release Workflow

1. Go to: `https://github.com/pga-ai/pga-platform/actions`

2. You should see a new workflow run: **"Release v0.4.0"**

3. Wait for it to complete (approx 3-5 minutes)

**Expected:**
- ✅ Verify job passes
- ✅ GitHub Release created automatically
- ⏸️ NPM publish will be skipped (needs NPM_TOKEN secret)

---

### Step 4: Update GitHub Release (Optional)

1. Go to: `https://github.com/pga-ai/pga-platform/releases`

2. Click **Edit** on v0.4.0 release

3. Add any additional release notes, screenshots, or demos

4. Click **"Update release"**

---

## 📦 Publish to npm (Optional - 5 min)

**Only do this if you want to publish to npm registry.**

### Step 1: Create npm Access Token

1. Go to: `https://www.npmjs.com/settings/YOUR_USERNAME/tokens`

2. Click **"Generate New Token"** → Select **"Automation"**

3. Copy the token (starts with `npm_...`)

---

### Step 2: Add NPM_TOKEN Secret to GitHub

1. Go to: `https://github.com/pga-ai/pga-platform/settings/secrets/actions`

2. Click **"New repository secret"**

3. Name: `NPM_TOKEN`

4. Value: Paste your npm token

5. Click **"Add secret"**

---

### Step 3: Trigger Release Again

```bash
# Delete and recreate tag to trigger workflow again
git tag -d v0.4.0
git push origin :refs/tags/v0.4.0

# Recreate and push
git tag -a v0.4.0 -m "Release v0.4.0 - Gene Bank, THK, Intelligence Boost

Features:
- 🧬 Gene Bank: Horizontal Knowledge Transfer system
- 🔄 Multi-Model Support (OpenAI adapter)
- 📊 Evaluation Framework for PGA benchmarking
- 🚀 Intelligence Boost (0% → 100% agent upgrade)
- 📝 Complete documentation and unit tests
- 🏗️ Full CI/CD and operational infrastructure

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin v0.4.0
```

---

### Step 4: Verify npm Package

1. Wait 2-3 minutes for publish to complete

2. Check package page: `https://www.npmjs.com/package/@pga-ai/core`

3. Try installing:
   ```bash
   npm install @pga-ai/core
   ```

**Expected:** Package appears on npm and can be installed.

---

## 🎯 Final Verification (5 min)

### Step 1: Run Certification Script

```bash
# Make script executable
chmod +x scripts/verify-certification.sh

# Run verification
./scripts/verify-certification.sh
```

**Expected Output:**
```
✅ A. Fundamentos:        4/4 (100%)
✅ B. CI/CD:              4/4 (100%)
✅ C. Seguridad:          4/4 (100%)
✅ D. Gobernanza:         4/4 (100%)
✅ E. Release:            4/4 (100%)
✅ F. Producto:           4/4 (100%)

🎯 TOTAL: 24/24 = 10/10
```

---

### Step 2: Test Branch Protection

Create a test PR to verify branch protection blocks bad code:

```bash
# Create test branch
git checkout -b test/branch-protection

# Make a trivial change that will fail linter
echo "const unused = 'test'" >> packages/core/src/index.ts

# Commit and push
git add .
git commit -m "test: verify branch protection"
git push origin test/branch-protection
```

1. Go to GitHub and create a PR from `test/branch-protection` → `main`

2. **Expected:**
   - ❌ CI fails (linter error for unused variable)
   - ❌ Merge button is **disabled** (can't merge)
   - ✅ Status check "validate" shows as failed

3. Fix the issue:
   ```bash
   git checkout test/branch-protection
   git checkout packages/core/src/index.ts  # Revert change
   git push origin test/branch-protection --force
   ```

4. **Expected:**
   - ✅ CI passes
   - ✅ Merge button becomes **enabled** (but still needs 1 approval)
   - ✅ Request shows "Awaiting review from @luisvelasquez"

5. Close the PR without merging (it was just a test)

---

### Step 3: Update README Badges (Optional)

Add status badges to README.md:

```markdown
# PGA Platform

[![CI](https://github.com/pga-ai/pga-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/pga-ai/pga-platform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://badge.fury.io/js/@pga%2Fcore.svg)](https://www.npmjs.com/package/@pga-ai/core)
```

Commit and push:
```bash
git add README.md
git commit -m "docs: add status badges"
git push origin main
```

---

## 🎉 Post-Launch Tasks (Optional)

### Community Setup

- [ ] Enable GitHub Discussions: `Settings → Features → Discussions`
- [ ] Create Discussion categories: Announcements, Q&A, Ideas, Show & Tell
- [ ] Pin welcome discussion

### Marketing

- [ ] Tweet/post about launch on social media
- [ ] Post on relevant subreddits (r/MachineLearning, r/LangChain)
- [ ] Share on Hacker News (Show HN: PGA Platform)
- [ ] Write launch blog post on pga.ai

### Monitoring

- [ ] Set up GitHub Watch → All Activity (to monitor new issues/PRs)
- [ ] Check Dependabot alerts weekly
- [ ] Review CI/CD metrics in GitHub Actions

---

## 🏆 Success Criteria

After completing this checklist, you should have:

- ✅ Repository is public
- ✅ Branch protection actively enforcing quality gates
- ✅ Dependabot monitoring dependencies
- ✅ v0.4.0 release published on GitHub
- ✅ Package published on npm (if you chose to)
- ✅ **10/10 Operational Maturity Certification** 🎯
- ✅ CI/CD blocking bad merges
- ✅ Test PR demonstrating protection works

---

## 📞 Support

If you encounter any issues during launch:

1. Check GitHub Actions logs: `https://github.com/pga-ai/pga-platform/actions`
2. Review branch protection settings: `https://github.com/pga-ai/pga-platform/settings/branches`
3. Check Dependabot status: `https://github.com/pga-ai/pga-platform/security/dependabot`

---

**Good luck with your launch! 🚀**

**Expected Total Time:** 30 minutes
**Result:** 10/10 Certified Platform, ready for community adoption
