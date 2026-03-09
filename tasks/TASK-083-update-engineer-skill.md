# Blueprint: TASK-083 — Update Engineer Skill

**Status:** Draft
**Complexity:** Low
**Author:** Architect (via /architect skill)
**Date:** 2026-03-09

---

## 1. Overview

### Objective
Update both engineer-skill files (Claude Code and OpenCode) so they read the task's git branch from the blueprint, commit to that branch after each phase, and support user-commanded git operations (stage, commit, push, undo) throughout implementation.

### Scope
**In scope:**
- **Claude Code skill** (`/root/.claude/skills/engineer-skill/SKILL.md`):
  - Add git branch read step to Activation Protocol
  - Add per-phase git commit step to Execution Flow Per Phase
  - Add git commit info to Phase Completion Report template
  - Add a **Git Operations** section
  - Append git-specific rules to Hard Rules
- **OpenCode skill** (`/root/.openclaw/workspace/skills/engineer-skill/SKILL.md`):
  - Same git additions adapted to its simpler structure (no documentation template or documentation update section)

**Out of scope:**
- Creating the git branch — that is the architect's responsibility (TASK-084, already complete)
- Changes to the architect-skill — TASK-084
- Any frontend or backend application code changes
- Automated git scripting or tooling

### Affected Systems
| Area | Files | Change Type |
|------|-------|-------------|
| Claude Code engineer skill | `/root/.claude/skills/engineer-skill/SKILL.md` | Modify |
| OpenCode engineer skill | `/root/.openclaw/workspace/skills/engineer-skill/SKILL.md` | Modify |

### Dependencies
- TASK-084 (architect-skill update) must be complete — the engineer reads `**Git Branch:**` from blueprints produced by the updated architect-skill. **Confirmed complete.**
- `github-skill` at `/root/.openclaw/workspace/skills/github-skill/SKILL.md` — defines conventional commit format and repo paths. Referenced as source of truth, no changes needed.
- Cashflow repo at `/var/www/cashflow-manager/` must be a git repo — confirmed.

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Engineer commits to wrong branch | Low | Medium | Explicit step to verify active branch before first commit |
| Engineer commits unrelated files | Low | Medium | Instruct to stage specific files only, never `git add .` |
| Merge conflict on branch push | Low | Low | Engineer pulls before pushing; reports blocker to user |
| Skill update breaks existing workflow | Low | Low | All changes are additive; no existing steps removed |

---

## 2. Security Considerations

- **Input validation:** N/A — skill file (prompt), not executable code
- **Authentication:** Git operations run as the server user on `/var/www/cashflow-manager/`. No new auth surface.
- **Data exposure:** None — skill file contains no secrets
- **Attack surface:** None introduced

---

## 3. Architecture Decisions

### Approach
Add git operations as a first-class concern in the engineer-skill workflow — not an afterthought in the checklist. The engineer reads the `**Git Branch:**` field from the blueprint at activation time, verifies it is on that branch, commits after each completed phase with a conventional commit message, and pushes on user command or at phase completion. A dedicated **Git Operations** reference section makes the commands easily findable.

### Alternatives Considered
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Git operations only in post-completion checklist | Simple, minimal change | Engineers forget; commits pile up at the end | Rejected — per-phase commits are safer and more reversible |
| Separate git-skill for engineer to call | Clean separation | Extra friction; engineers may skip | Rejected — inline instructions are more reliable |

### Schema Changes
None

### API Contract Changes
None

---

## 4. Implementation Phases

### Phase 1: Add Git Branch Read to Activation Protocol
**Goal:** Engineer reads and verifies the task's git branch at startup before touching any files.

**Files to create/modify:**
- `/root/.claude/skills/engineer-skill/SKILL.md` — Modify Activation Protocol steps

**Steps:**
1. Locate the **Activation Protocol** section (the numbered steps 1–5).
2. After step 1 (read the blueprint), insert a new step:

```
2. Read the **Git Branch** field from the blueprint header (e.g., `**Git Branch:** task/083-update-engineer-skill`).
   - Run: `git -C /var/www/cashflow-manager branch --show-current`
   - If the active branch does not match the blueprint's Git Branch, check it out:
     `git -C /var/www/cashflow-manager checkout task/[ID]-[slug]`
   - If the branch does not exist locally: `git -C /var/www/cashflow-manager checkout -b task/[ID]-[slug]`
   - Confirm the correct branch is active before proceeding.
   - **If the blueprint has no Git Branch field**, proceed without git operations and note it in the Phase Completion Report.
```

3. Renumber the remaining steps accordingly (old 2 → 3, old 3 → 4, old 4 → 5, old 5 → 6).

**Risk Level:** Low
**Rollback:** Remove the inserted step and restore the original step numbers.

**Exit Criteria:**
- [ ] Activation Protocol contains a step that reads `**Git Branch:**` from the blueprint
- [ ] Step includes commands to verify and switch to the task branch
- [ ] Step includes a graceful fallback if no Git Branch field is present
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 2: Add Per-Phase Git Commit to Execution Flow
**Goal:** Engineer stages and commits task-specific files after each phase completes successfully.

**Files to create/modify:**
- `/root/.claude/skills/engineer-skill/SKILL.md` — Modify Execution Flow Per Phase section

**Steps:**
1. Locate the **Execution Flow Per Phase** numbered list (steps 1–8).
2. Between step 6 (Update the task documentation file) and step 7 (Output the Phase Completion Report), insert a new step:

```
7. Stage and commit phase changes to the task branch:
   a. Stage only the files modified in this phase (never `git add .`):
      `git -C /var/www/cashflow-manager add <file1> <file2> ...`
   b. Commit with a conventional message referencing the task and phase:
      `git -C /var/www/cashflow-manager commit -m "feat: TASK-[ID] phase [N] — [one-line description]"`
   c. Push to the remote branch:
      `git -C /var/www/cashflow-manager push -u origin task/[ID]-[slug]`
   d. If the user has not yet asked to push, stage and commit only — ask before pushing:
      > "Phase [N] committed locally. Push to remote?"
```

3. Renumber the original step 7 (Phase Completion Report) → step 8, and step 8 (STOP) → step 9.

**Risk Level:** Low
**Rollback:** Remove the inserted step and restore original step numbers.

**Exit Criteria:**
- [ ] Execution Flow contains a git commit step between documentation update and Phase Completion Report
- [ ] Step specifies staged files explicitly (no `git add .`)
- [ ] Step uses conventional commit format with task ID and phase number
- [ ] Step includes push with confirmation option
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 3: Add Git Operations Reference Section
**Goal:** Provide the engineer with a self-contained git command reference for operations the user may request.

**Files to create/modify:**
- `/root/.claude/skills/engineer-skill/SKILL.md` — Add new `## Git Operations` section after Hard Rules, before Task Documentation Template

**Steps:**
1. Locate the end of the **Hard Rules** section.
2. Insert a new `## Git Operations` section containing:
   - Check current branch
   - Stage specific files (with warning: never `git add .`)
   - Commit with conventional format
   - Push branch
   - View uncommitted changes (`diff`, `status`)
   - Undo uncommitted changes (single file)
   - Undo last commit (keep changes staged)
   - Merge task branch to main (3-command sequence)
   - Abandon task branch (full rollback)
   - "When to run each operation" table mapping user language to git actions

**Risk Level:** Low
**Rollback:** Remove the inserted `## Git Operations` section entirely.

**Exit Criteria:**
- [ ] New `## Git Operations` section exists between Hard Rules and Task Documentation Template
- [ ] Section covers all 9 operations listed above
- [ ] "When to run each operation" table maps user language (e.g., "undo", "merge to main") to git commands
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 4: Update Phase Completion Report Template
**Goal:** Surface git commit info in each Phase Completion Report.

**Files to create/modify:**
- `/root/.claude/skills/engineer-skill/SKILL.md` — Modify Phase Completion Report Template

**Steps:**
1. Locate the **Phase Completion Report Template** code block.
2. After the `### Files modified:` block, add:

```
### Git commit:
- Branch: `task/[ID]-[slug]`
- Commit: `[commit hash or "not yet committed"]`
- Pushed: Yes / No / Awaiting confirmation
```

**Risk Level:** Low
**Rollback:** Remove the inserted `### Git commit:` block from the template.

**Exit Criteria:**
- [ ] Phase Completion Report template contains a `### Git commit:` section
- [ ] Section includes branch name, commit hash placeholder, and push status
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 5: Add Git Hard Rules
**Goal:** Prevent common git mistakes by adding explicit git rules to Hard Rules.

**Files to create/modify:**
- `/root/.claude/skills/engineer-skill/SKILL.md` — Append git rules to Hard Rules section

**Steps:**
1. Locate the **Hard Rules** section bullet list.
2. Append these 5 rules:
   - DO NOT use `git add .` — always stage specific files only
   - DO NOT commit to `main` directly — always commit to the task branch from the blueprint
   - DO NOT force push (`git push --force`) without explicit user instruction
   - ALWAYS confirm the active branch matches the blueprint's `**Git Branch:**` before the first commit
   - ALWAYS use conventional commit format: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

**Risk Level:** Low
**Rollback:** Remove the 5 appended git rules from Hard Rules.

**Exit Criteria:**
- [ ] Hard Rules contains 5 new git-specific rules
- [ ] Rules cover: no `git add .`, no direct main commits, no force push, branch verification, conventional commits
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 6: Update OpenCode Engineer Skill
**Goal:** Apply equivalent git workflow additions to the OpenCode engineer-skill, adapted to its simpler structure.

**Files to create/modify:**
- `/root/.openclaw/workspace/skills/engineer-skill/SKILL.md` — Modify

**Context:** The OpenCode SKILL.md is a leaner version of the Claude Code skill. Key structural differences:
- Activation Protocol has 4 steps (no documentation check step, no confirmation prompt)
- Execution Flow Per Phase has 6 steps (no documentation update step)
- No Task Documentation Template section
- No Documentation Update section
- Phase Completion Report template has the same structure

**Steps:**
1. **Activation Protocol** — After step 1 (read the blueprint), insert the same git branch read step as Phase 1 above. Renumber remaining steps (old 2 → 3, old 3 → 4, old 4 → 5).
2. **Hard Rules** — Append the same 5 git-specific rules as Phase 5 above.
3. **Git Operations section** — Insert the same `## Git Operations` reference section after Hard Rules, before Execution Flow Per Phase (note: no Task Documentation Template exists here, so placement is after Hard Rules directly).
4. **Execution Flow Per Phase** — Between step 4 (run tests/linting) and step 5 (Phase Completion Report), insert the per-phase git commit step as Phase 2 above. Renumber step 5 → 6, step 6 → 7.
5. **Phase Completion Report Template** — Add the same `### Git commit:` block after `### Files modified:`.

**Risk Level:** Low
**Rollback:** Revert each inserted section individually. The OpenCode skill is version-controlled in `/root/.openclaw/` git repo — `git -C /root/.openclaw checkout -- workspace/skills/engineer-skill/SKILL.md` restores the original.

**Exit Criteria:**
- [ ] OpenCode Activation Protocol contains git branch read step
- [ ] OpenCode Hard Rules contains 5 new git rules
- [ ] OpenCode `## Git Operations` section exists after Hard Rules
- [ ] OpenCode Execution Flow contains per-phase git commit step
- [ ] OpenCode Phase Completion Report contains `### Git commit:` block
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 7: Final Review & Self-Validation
**Goal:** Confirm both SKILL.md files are internally consistent after all phases.

**Files to create/modify:**
- `/root/.claude/skills/engineer-skill/SKILL.md` — Read-only review
- `/root/.openclaw/workspace/skills/engineer-skill/SKILL.md` — Read-only review

**Steps:**
1. Re-read Claude Code SKILL.md. Verify:
   - Activation Protocol: git branch read is step 2, remaining steps renumbered correctly
   - Execution Flow: git commit step numbered correctly (between documentation update and Phase Completion Report)
   - Git Operations section exists between Hard Rules and Task Documentation Template
   - Phase Completion Report includes `### Git commit:` block
   - Hard Rules includes 5 git rules
2. Re-read OpenCode SKILL.md. Verify:
   - Activation Protocol: git branch read is step 2, remaining steps renumbered correctly
   - Execution Flow: git commit step numbered correctly (between linting step and Phase Completion Report)
   - Git Operations section exists after Hard Rules
   - Phase Completion Report includes `### Git commit:` block
   - Hard Rules includes 5 git rules
3. Confirm no broken markdown, no duplicate sections in either file.

**Risk Level:** Low
**Rollback:** N/A — review-only phase.

**Exit Criteria:**
- [ ] Both SKILL.md files read as coherent documents
- [ ] All cross-references are consistent in both files
- [ ] Git commands identical across both files (same `git -C /var/www/cashflow-manager` paths)
- [ ] Architect review: pending
- [ ] User manual test: pending

---

## 5. Testing Strategy

- **Unit tests:** N/A — skill file (prompt)
- **Integration tests:** After implementation, invoke `/engineer TASK-083` in both Claude Code and OpenCode and verify: (a) engineer reads Git Branch from blueprint, (b) engineer checks out correct branch, (c) after a phase, engineer stages specific files and commits
- **Manual verification (Claude Code):**
  1. Invoke `/engineer TASK-083` after the skill is updated
  2. Verify: engineer announces the branch `task/083-update-engineer-skill`
  3. Verify: after Phase 1 completes, a commit appears on `git log --oneline`
  4. Say "undo" → verify engineer runs `git checkout -- <file>` on the correct file
  5. Say "merge to main" → verify engineer runs the correct 3-command sequence
- **Manual verification (OpenCode):**
  1. Invoke `/engineer TASK-083` via Emily/OpenCode
  2. Same checks as above — confirm git operations reference the same `git -C /var/www/cashflow-manager` paths
- **Edge cases:**
  - Blueprint has no `**Git Branch:**` field → engineer proceeds without git and notes it in report
  - Branch has uncommitted changes from a previous session → engineer runs `git status` and reports before committing

---

## 6. Post-Completion Checklist

- [ ] All phases reviewed and approved
- [ ] No dead code, debug logs, or console.log left behind
- [ ] SSE events emitted for new mutations (if applicable) — N/A
- [ ] Frontend receives and handles new events (if applicable) — N/A
- [ ] Feature flag added (if applicable) — N/A
- [ ] Documentation in `/var/www/cashflow-manager/documentation/` updated
- [ ] Git branch created and pushed (skipped per user instruction for this task)
- [ ] All phase commits pushed to task branch (skipped per user instruction for this task)
