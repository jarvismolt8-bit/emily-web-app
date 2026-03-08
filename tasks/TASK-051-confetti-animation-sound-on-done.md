# Blueprint: TASK-051 — Add Confetti Animation and Sound When Ticket is Done

**Status:** Draft
**Complexity:** Low
**Author:** Architect (via /architect skill)
**Date:** 2026-03-06

---

## 1. Overview

### Objective
Trigger a fullscreen confetti animation and a short celebratory sound effect whenever a task's status transitions to `done`, providing positive reinforcement for task completion.

### Scope
**In scope:**
- Confetti animation (canvas-based, fullscreen) fires when any task reaches `done` status
- Short celebratory sound effect plays simultaneously with confetti
- Trigger covers both paths to `done`: Kanban drag-and-drop and modal save
- Animation and sound must not fire when a task is saved while already `done` (no repeat on re-save)

**Out of scope:**
- Per-user sound preference toggle (not requested; can be added separately)
- Backend notifications or server-side tracking of "done" events
- Confetti on initial task creation with `done` status (edge case, not the intended UX flow)
- Animation for status changes other than → `done`

### Affected Systems
| Area | Files | Change Type |
|------|-------|-------------|
| Frontend hook | `frontend/src/hooks/useConfetti.ts` | Create |
| Frontend component | `frontend/src/components/Tasks.tsx` | Modify |
| Frontend dependencies | `frontend/package.json` | Modify (add canvas-confetti) |

### Dependencies
- `canvas-confetti` npm package (~5 KB gzipped) — lightest standalone confetti library, no React coupling
- `@types/canvas-confetti` dev dependency for TypeScript types
- Web Audio API (built into all modern browsers) — used for programmatic sound, no audio files needed

### Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| canvas-confetti bundle size | Low | Low | Package is ~5 KB gzipped; negligible impact |
| Double-fire if SSE re-syncs tasks | Low | Low | Trigger is on user action (drag/save), not on task prop change |
| Sound blocked by browser autoplay policy | Low | Low | Web Audio API is unlocked by user gesture (drag-end / button click) — both trigger paths are user-initiated |
| Memory leak from AudioContext | Low | Low | Reuse a single AudioContext instance via ref inside the hook |

---

## 2. Security Considerations

- **Input validation:** No user input involved — this is purely a UI side-effect triggered by existing validated API calls.
- **Authentication:** No new endpoints or auth requirements. The feature piggybacks on existing `tasksAPI.updateStatus` and `tasksAPI.update` calls.
- **Data exposure:** No sensitive data involved.
- **Attack surface:** None added. canvas-confetti renders entirely client-side on a temporary canvas. No network requests.

---

## 3. Architecture Decisions

### Approach
Encapsulate confetti + sound into a single `useConfetti` hook that returns a `triggerCelebration()` function. The hook:
1. Lazily imports `canvas-confetti` and fires a burst from the center-bottom of the viewport.
2. Creates and reuses a single `AudioContext` instance (stored in a `useRef`) to play a short programmatic ascending tone sequence (Web Audio API oscillators) — no audio files, no `public/` directory needed.

`Tasks.tsx` imports the hook and calls `triggerCelebration()` in exactly two places:
1. `handleStatusChange` — when `newStatus === 'done'`
2. `handleSave` — when `editingTask` exists AND `editingTask.status !== 'done'` AND `formData.status === 'done'`

### Alternatives Considered
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| `react-confetti` package | React-native, declarative | Heavier, requires state management for show/hide, renders as a React component | Rejected — more complexity than needed |
| Pure CSS confetti (no package) | Zero dependency | Time-consuming to implement well, needs manual particle management | Rejected — canvas-confetti is proven and tiny |
| Audio file in `frontend/public/` | Simple `<audio>` tag | Requires creating `public/` directory, adding a binary asset, extra HTTP request | Rejected — Web Audio API is cleaner and dependency-free |
| Trigger on SSE task update | Covers all clients (e.g., Emily) | Risk of false triggers on page load; much harder to scope to "new done" transitions | Rejected — keep it simple for the local user action path |

### Schema Changes
None.

### API Contract Changes
None.

---

## 4. Implementation Phases

### Phase 1: Install canvas-confetti
**Goal:** Add the canvas-confetti package to the frontend without touching any source files.

**Files to create/modify:**
- `frontend/package.json` — new dependency added by npm install

**Steps:**
1. From `/var/www/cashflow-manager/frontend/`, run: `npm install canvas-confetti`
2. Run: `npm install -D @types/canvas-confetti`
3. Verify both appear in `package.json` under `dependencies` and `devDependencies` respectively.

**Risk Level:** Low
**Rollback:** Run `npm uninstall canvas-confetti @types/canvas-confetti` to remove the packages; no source files were modified.

**Exit Criteria:**
- [ ] `canvas-confetti` appears in `frontend/package.json` dependencies
- [ ] `@types/canvas-confetti` appears in `frontend/package.json` devDependencies
- [ ] `node_modules/canvas-confetti` exists in `frontend/node_modules/`

---

### Phase 2: Create useConfetti Hook
**Goal:** Implement the `useConfetti` hook that exposes a single `triggerCelebration()` function combining confetti burst and sound.

**Files to create/modify:**
- `frontend/src/hooks/useConfetti.ts` — Create new file

**Steps:**
1. Create `frontend/src/hooks/useConfetti.ts` with the following design:
   - Import `confetti` from `canvas-confetti`
   - Hold an `AudioContext` in a `useRef<AudioContext | null>` (lazy-initialized on first call to avoid browser restrictions)
   - `triggerCelebration()` function:
     - **Confetti**: Call `confetti({ particleCount: 150, spread: 80, origin: { y: 0.75 }, colors: ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#c77dff'] })`. The `origin.y: 0.75` fires from the lower portion of the screen, which looks natural.
     - **Sound**: Initialize `AudioContext` if not yet created. Play a 3-note ascending sequence (e.g., C5 → E5 → G5) using `OscillatorNode` + `GainNode`. Each note: ~80ms duration, sine wave, with a short decay envelope. Notes fire in sequence with ~90ms offset between them. This produces a brief "ta-da" feel without being obnoxious.
   - Export: `export function useConfetti() { return { triggerCelebration } }`

**Note on AudioContext and browser autoplay policy:** `AudioContext` must be created (or resumed) in response to a user gesture. Both trigger paths (drag-end and modal submit button click) are direct user gesture events, so this is safe.

**Risk Level:** Low
**Rollback:** Delete `frontend/src/hooks/useConfetti.ts`. No other files reference it yet.

**Exit Criteria:**
- [ ] File exists at `frontend/src/hooks/useConfetti.ts`
- [ ] TypeScript compiles without errors (`npm run build` passes)
- [ ] No linting errors

---

### Phase 3: Wire Up in Tasks.tsx
**Goal:** Call `triggerCelebration()` at the two points in `Tasks.tsx` where a task transitions to `done`.

**Files to create/modify:**
- `frontend/src/components/Tasks.tsx` — Modify

**Steps:**
1. Import `useConfetti` at the top of `Tasks.tsx`:
   ```
   import { useConfetti } from '../hooks/useConfetti'
   ```
2. Inside the `Tasks` component body, call the hook:
   ```
   const { triggerCelebration } = useConfetti()
   ```
3. In `handleStatusChange` (line ~109), after the `tasksAPI.updateStatus` call succeeds, add:
   ```
   if (newStatus === 'done') triggerCelebration()
   ```
   Place it before `fetchTasksRefresh()`.

4. In `handleSave` (line ~119), detect the specific transition from non-done → done:
   ```
   const isBecomingDone = editingTask && editingTask.status !== 'done' && formData.status === 'done'
   ```
   After `tasksAPI.update` succeeds (and before `fetchTasksRefresh()`), add:
   ```
   if (isBecomingDone) triggerCelebration()
   ```

**Risk Level:** Low
**Rollback:** Revert the two added lines and the import in `Tasks.tsx`. The hook file can remain (it is unused until re-imported).

**Exit Criteria:**
- [ ] Dragging a card to the Done column triggers confetti + sound
- [ ] Opening a non-done task in the modal, changing status to Done, and saving triggers confetti + sound
- [ ] Re-saving a task that is already Done does NOT trigger confetti + sound
- [ ] Creating a new task with status Done does NOT trigger confetti + sound (new task: `editingTask` is null, so the `handleSave` guard short-circuits)
- [ ] No TypeScript errors; `npm run build` succeeds
- [ ] No regressions in task create, edit, delete, or drag-and-drop ordering

---

### Phase 4: Build and Deploy
**Goal:** Build the frontend and verify in the production environment.

**Files to create/modify:**
- `frontend/dist/` — Regenerated by build

**Steps:**
1. Run: `cd /var/www/cashflow-manager/frontend && npm run build`
2. Verify build succeeds with no errors.
3. Open the app in the browser; navigate to the Tasks tab.
4. Drag a task card to the Done column — confirm confetti fires and sound plays.
5. Alternatively open a task modal, set status to Done, click Update — confirm same result.
6. No PM2 restart needed (backend is unchanged).

**Risk Level:** Low
**Rollback:** Re-run `npm run build` from the previous commit/state of `Tasks.tsx` and `useConfetti.ts`.

**Exit Criteria:**
- [ ] `npm run build` completes without errors
- [ ] Confetti and sound verified in browser (production URL)
- [ ] No console errors in browser DevTools

---

## 5. Testing Strategy

- **Unit tests:** Not applicable (UI animation/sound — no logic to unit test in isolation).
- **Integration tests:** Not applicable — no API changes.
- **Manual verification:**
  1. Open the Tasks tab in Kanban view.
  2. Drag any non-done card into the **Done** column → confetti burst fires from lower viewport, ascending 3-note sound plays.
  3. Drag the same card out of Done (back to In Progress) and then back into Done → confetti fires again (new transition).
  4. Click a Done-column card to open its modal; save without changing status → no confetti.
  5. Open a Backlog card in modal → change status to Done → click Update → confetti fires.
  6. Open a Done card in modal → change status to In Progress → click Update → no confetti.
  7. Verify the sound is audible at system default volume (not jarring, short).
  8. Verify confetti disappears naturally after ~3 seconds (canvas-confetti handles its own cleanup).
- **Edge cases:**
  - Browser with sound muted at OS level → confetti still works, sound silently fails (no error thrown).
  - Rapid multiple drags to Done in quick succession → multiple confetti bursts stack (acceptable behavior).
  - Mobile / touch device → pointer events still fire drag-end; Web Audio API works on mobile browsers.

---

## 6. Post-Completion Checklist

- [ ] All phases reviewed and approved
- [ ] No dead code, debug logs, or console.log left behind
- [ ] SSE events emitted for new mutations (if applicable) — N/A, no mutations added
- [ ] Frontend receives and handles new events (if applicable) — N/A
- [ ] Feature flag added (if applicable) — N/A (low-risk cosmetic feature, no flag needed)
- [ ] Documentation in `/var/www/cashflow-manager/documentation/` updated
- [ ] PM2 restart tested — N/A (backend unchanged); frontend build verified
