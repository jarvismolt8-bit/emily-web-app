# Blueprint: TASK-084 — Update Architect Skill

**Status:** Draft
**Complexity:** Low
**Author:** Architect (via /architect skill)
**Date:** 2026-03-09
**Git Branch:** `task/084-update-architect-skill`

---

## 1. Overview

### Objective
Update the architect-skill to create a task-scoped git branch at planning time, record it in the blueprint and documentation, and document the full branch lifecycle so engineers can safely commit, push, and rollback.

### Scope
**In scope:**
- Add a **Step 4: Create Git Branch** to the Activation Protocol in `/root/.claude/skills/architect-skill/SKILL.md`
- Add a **Git Branch** metadata field to the Blueprint Template header
- Add a **Git Workflow** section (section 7) to the Blueprint Template
- Add a **Git Branch** field to the Task Documentation Template (Step 5)
- Add Git merge/rollback steps to **Post-Completion Checklist**

**Out of scope:**
- Changes to `engineer-skill` — that is TASK-083
- Changes to `github-skill` — that skill is a dependency, not modified here
- Any frontend or backend application code changes
- Automated branch creation scripts or tooling

### Affected Systems
| Area | Files | Change Type |
|------|-------|-------------|
| Architect skill | `/root/.claude/skills/architect-skill/SKILL.md` | Modify |
| Blueprint output | `/var/www/cashflow-manager/tasks/TASK-[ID]-[slug].md` (future files) | Template change only |
| Task documentation | `/var/www/cashflow-manager/documentation/{id}-{slug}.md` (future files) | Template change only |

### Dependencies
- `github-skill` at `/root/.openclaw/workspace/skills/github-skill/SKILL.md` — defines git conventions (branch naming, commit format, repo paths). No changes needed; referenced as source of truth.
- Cashflow repo must be a git repo at `/var/www/cashflow-manager/` — confirmed.

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Architect creates branch on wrong repo | Low | Medium | Specify exact repo path (`/var/www/cashflow-manager`) in the skill instructions |
| Branch already exists for a task | Low | Low | Instruction to check existing branches before creating; use `checkout -b` which will error gracefully |
| Branch name conflicts (special chars in task name) | Low | Low | Define strict slug format: lowercase, hyphens only, max 40 chars |
| Skill update breaks existing blueprint workflow | Low | Medium | Changes are additive only — no existing steps removed |

---

## 2. Security Considerations

- **Input validation:** Branch names derived from task slugs — must strip non-alphanumeric characters. Spec states: lowercase letters, numbers, hyphens only.
- **Authentication:** Git operations on `/var/www/cashflow-manager/` run as the server user. No new auth surface introduced.
- **Data exposure:** None — skill file contains no secrets or credentials.
- **Attack surface:** None — this is a skill file (prompt/instruction), not executable code.

---

## 3. Architecture Decisions

### Approach
Integrate the branch creation step directly into the Activation Protocol as a new **Step 4** (before saving the blueprint). The branch name follows the same slug convention already used for blueprint filenames: `task/[ID]-[slug]`. This makes branch names predictable and discoverable. Branch metadata is surfaced in both the blueprint header and the task documentation file so any agent reading either document can find the working branch immediately.

The git workflow (commit, push, merge/rollback) is described as a dedicated **Git Workflow** section (section 7) in the blueprint template — visible to the engineer from the start.

### Alternatives Considered
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Engineer-skill creates the branch (not architect) | Engineer has implementation context | Branch creation should happen at planning time to isolate all work | Rejected — architect defines the work scope, branch should be created then |
| Branch name uses task name verbatim | Human-readable | Special chars break git branch names | Rejected — slug format is already established |
| Separate git section outside blueprint template | Clean separation | Engineers might miss it | Rejected — embedded in blueprint template is more reliable |

### Schema Changes
None

### API Contract Changes
None

---

## 4. Implementation Phases

### Phase 1: Add Git Branch Step to Activation Protocol
**Goal:** Insert a new Step 4 into the Activation Protocol that instructs the architect to create a task-scoped git branch.

**Files to create/modify:**
- `/root/.claude/skills/architect-skill/SKILL.md` — Insert new Step 4 in Activation Protocol section

**Steps:**
1. Locate the `## Activation Protocol` section in the SKILL.md file.
2. Renumber existing Step 4 (Update Task Documentation) to Step 5.
3. Insert new **Step 4: Create Git Branch** between Step 3 and the renumbered Step 5:

```
### Step 4: Create Git Branch
Before saving the blueprint, create a dedicated git branch for this task in the cashflow repo:

1. Check for an existing branch: `git -C /var/www/cashflow-manager branch --list "task/[ID]-[slug]"`
2. If it does not exist: `git -C /var/www/cashflow-manager checkout -b task/[ID]-[slug]`
3. If it already exists: `git -C /var/www/cashflow-manager checkout task/[ID]-[slug]`
4. Record the branch name as: `task/[ID]-[slug]`

**Branch naming rules:**
- Format: `task/[ID]-[slug]`
- Slug: lowercase, hyphens only, derived from task name, max 40 chars
- Example: `task/084-update-architect-skill`

All implementation work for this task must be committed to this branch. Never commit task work directly to `main`.
```

**Risk Level:** Low
**Rollback:** Remove the inserted Step 4 and restore the original step numbers. No git operations on any repo.

**Exit Criteria:**
- [ ] Activation Protocol now has 5 steps (Steps 1–5)
- [ ] Step 4 reads correctly with branch naming rules
- [ ] Step 5 (previously Step 4) content is unchanged
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 2: Add Git Branch Field to Blueprint Template
**Goal:** Surface the task branch name in every generated blueprint so agents reading it know where to commit.

**Files to create/modify:**
- `/root/.claude/skills/architect-skill/SKILL.md` — Add `Git Branch` field to Blueprint Template header

**Steps:**
1. Locate the Blueprint Template header block in the `## Blueprint Template` section.
2. Add a `**Git Branch:**` line below `**Date:**`:
   ```
   **Git Branch:** `task/[ID]-[slug]`
   ```

**Risk Level:** Low
**Rollback:** Remove the added `**Git Branch:**` line from the template header.

**Exit Criteria:**
- [ ] Blueprint template header contains `**Git Branch:** \`task/[ID]-[slug]\``
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 3: Add Git Workflow Section to Blueprint Template
**Goal:** Provide engineers with clear commit/push/merge/rollback instructions in every blueprint.

**Files to create/modify:**
- `/root/.claude/skills/architect-skill/SKILL.md` — Add new `## 7. Git Workflow` section to Blueprint Template (inside the template block)

**Steps:**
1. Locate the end of the Blueprint Template (after the Post-Completion Checklist, before the closing triple-backtick).
2. Append a new `## 7. Git Workflow` section with During Implementation, Merge to Main, and Rollback subsections using `git -C /var/www/cashflow-manager` paths.

**Risk Level:** Low
**Rollback:** Remove the appended `## 7. Git Workflow` section from the blueprint template.

**Exit Criteria:**
- [ ] Blueprint Template ends with a `## 7. Git Workflow` section (before closing backtick)
- [ ] Section contains During Implementation, Merge to Main, and Rollback subsections
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 4: Add Git Branch to Task Documentation Template
**Goal:** Record the task branch in the documentation file displayed in the edit task modal.

**Files to create/modify:**
- `/root/.claude/skills/architect-skill/SKILL.md` — Add `- Git Branch:` field to Step 5's documentation template Plan Notes

**Steps:**
1. Locate Step 5 in the Activation Protocol — the task documentation template block.
2. In the `## Plan Notes` section of the template, add:
   ```markdown
   - Git Branch: `task/[ID]-[slug]`
   ```

**Risk Level:** Low
**Rollback:** Remove the `- Git Branch:` line from the documentation template.

**Exit Criteria:**
- [ ] Documentation template Plan Notes section includes `- Git Branch: \`task/[ID]-[slug]\``
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 5: Update Post-Completion Checklist in Blueprint Template
**Goal:** Add git merge and branch cleanup steps to the Post-Completion Checklist.

**Files to create/modify:**
- `/root/.claude/skills/architect-skill/SKILL.md` — Append git items to `## 6. Post-Completion Checklist` in Blueprint Template

**Steps:**
1. Locate `## 6. Post-Completion Checklist` in the Blueprint Template.
2. Append these items at the end:
   ```markdown
   - [ ] All phase commits pushed to `task/[ID]-[slug]` branch
   - [ ] Branch merged to `main` after all phases pass: `git merge task/[ID]-[slug]`
   - [ ] `main` pushed to remote: `git push origin main`
   - [ ] Task branch deleted after merge (optional): `git branch -d task/[ID]-[slug]`
   ```

**Risk Level:** Low
**Rollback:** Remove the 4 appended git checklist items.

**Exit Criteria:**
- [ ] Post-Completion Checklist contains 4 new git-related items
- [ ] Architect review: pending
- [ ] User manual test: pending

---

### Phase 6: Final Review & Self-Validation
**Goal:** Confirm the full SKILL.md is internally consistent and ready for use.

**Files to create/modify:**
- `/root/.claude/skills/architect-skill/SKILL.md` — Read-only review

**Steps:**
1. Re-read the full SKILL.md after all phases.
2. Verify: Activation Protocol has exactly 5 steps in the correct order.
3. Verify: Blueprint Template header, Git Workflow section (section 7), and Post-Completion Checklist are all consistent with each other.
4. Verify: No duplicate sections, no broken markdown.

**Risk Level:** Low
**Rollback:** N/A — review-only phase.

**Exit Criteria:**
- [ ] SKILL.md reads as a coherent document
- [ ] Step numbers in Activation Protocol are correct (1–5)
- [ ] Blueprint template has sections 1–7
- [ ] Architect review: pending
- [ ] User manual test: pending

---

## 5. Testing Strategy

- **Unit tests:** N/A — this is a skill/prompt file
- **Integration tests:** After implementation, invoke `/architect` on a test task and verify: (a) branch is created, (b) blueprint includes Git Branch field, (c) documentation file includes Git Branch field
- **Manual verification:**
  1. Run `/architect TASK-084` after the skill is updated
  2. Check: `git -C /var/www/cashflow-manager branch` shows `task/084-update-architect-skill`
  3. Check: generated blueprint header has `**Git Branch:** \`task/084-update-architect-skill\``
  4. Check: documentation file Plan Notes includes `- Git Branch: \`task/084-update-architect-skill\``
- **Edge cases:**
  - Branch already exists → skill checks out existing branch without error
  - Task slug has unusual characters → slug sanitization produces valid branch name

---

## 6. Post-Completion Checklist

- [ ] All phases reviewed and approved
- [ ] No dead code, debug logs, or console.log left behind
- [ ] SSE events emitted for new mutations (if applicable) — N/A
- [ ] Frontend receives and handles new events (if applicable) — N/A
- [ ] Feature flag added (if applicable) — N/A
- [ ] Documentation in `/var/www/cashflow-manager/documentation/` updated
- [ ] All phase commits pushed to `task/084-update-architect-skill` branch
- [ ] Branch merged to `main` after all phases pass: `git merge task/084-update-architect-skill`
- [ ] `main` pushed to remote: `git push origin main`
- [ ] Task branch deleted after merge (optional): `git branch -d task/084-update-architect-skill`

---

## 7. Git Workflow

**Working branch:** `task/084-update-architect-skill`

### During Implementation
Stage and commit after each completed phase:
```bash
git -C /var/www/cashflow-manager add <specific-files>
git -C /var/www/cashflow-manager commit -m "feat: TASK-084 phase [N] — [description]"
git -C /var/www/cashflow-manager push -u origin task/084-update-architect-skill
```

### Merge to Main (when all phases pass)
```bash
git -C /var/www/cashflow-manager checkout main
git -C /var/www/cashflow-manager merge task/084-update-architect-skill
git -C /var/www/cashflow-manager push origin main
```

### Rollback (if something goes wrong)
To discard uncommitted changes on the task branch:
```bash
git -C /var/www/cashflow-manager checkout -- <file>
```
To abandon the branch entirely and return to main:
```bash
git -C /var/www/cashflow-manager checkout main
git -C /var/www/cashflow-manager branch -d task/084-update-architect-skill
```
