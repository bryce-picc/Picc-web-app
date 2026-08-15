# Territory Editor Minimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a mobile user collapse the territory editor to a compact drawing bar while continuing to add and undo map points without losing the draft.

**Architecture:** Keep minimization as local presentation state in `TerritoryBoundaryEditor`; the parent-owned boundary draft and drawing mode remain unchanged. Render either the current full sheet or a one-row compact bar from the same props, so there is no duplicated territory state or server change.

**Tech Stack:** React client component, TypeScript, Tailwind CSS, Lucide icons, Playwright.

## Global Constraints

- Map-tap drawing stays active while minimized.
- The compact bar shows drawing status, live point count, Undo, and Expand above primary navigation.
- The entire unsaved draft remains the single parent-owned source of truth.
- Each newly opened editor starts expanded.
- No API, database, geometry, navigation, or persistence changes.
- Preserve the existing expanded Finish, Clear, and Save footer.

---

### Task 1: Prove and implement the minimized drawing state

**Files:**
- Modify: `tests/e2e/territory-boundary-editor.spec.ts`
- Modify: `components/mobile/territory-boundary-sheet.tsx`

**Interfaces:**
- Consumes: existing `boundary`, `drawingMode`, `onUndoLastPoint`, and `onClose` props.
- Produces: accessible controls named `Minimize territory editor`, `Undo point`, and `Expand territory editor`; test id `territory-boundary-editor-minimized`.

- [ ] **Step 1: Write the failing browser test**

Add a 390x844 Playwright test that opens the populated editor, enables `Add Points by Click`, records the editor height and field values, clicks `Minimize territory editor`, and asserts:

```ts
await expect(page.getByTestId('territory-boundary-editor-scroll')).toBeHidden();
await expect(page.getByRole('button', { name: 'Save Boundary' })).toBeHidden();
const compactBar = page.getByTestId('territory-boundary-editor-minimized');
await expect(compactBar).toContainText('Drawing');
await expect(compactBar).toContainText('8 points');
expect((await compactBar.boundingBox())!.height).toBeLessThan(72);
```

Verify the compact bar ends above `Primary navigation`. Click an unobstructed `.gm-style` position and expect `9 points`, click `Undo point` and expect `8 points`, expand, then verify the name, description, `Stop Adding Points`, Finish, Clear, and Save controls are restored.

- [ ] **Step 2: Run the focused test and confirm RED**

Run:

```bash
npx playwright test tests/e2e/territory-boundary-editor.spec.ts --grep "minimized territory drawing bar" --reporter=line
```

Expected: FAIL because `Minimize territory editor` does not exist.

- [ ] **Step 3: Implement minimal local presentation state**

In `TerritoryBoundaryEditor`, import `ChevronDown`, `ChevronUp`, `useEffect`, and `useState`. Add local `minimized` state before the current early return and reset it when `open` becomes false.

Add `Minimize territory editor` beside Close. When minimized, return the existing fixed-clearance wrapper containing one compact row:

```tsx
<div data-testid="territory-boundary-editor-minimized">
  <p>{drawingMode ? 'Drawing' : 'Editing'} · {boundary.coordinates.length} points</p>
  <button aria-label="Undo point" onClick={onUndoLastPoint}>...</button>
  <button aria-label="Expand territory editor" onClick={() => setMinimized(false)}>...</button>
</div>
```

Use `min-h-11`, `min-w-11`, `whitespace-nowrap`, truncation on status text, and the existing editor surface, border, and shadow tokens. Do not call `onSetDrawingMode`, `onChange`, `onClose`, or `onSave` during minimize or expand.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run the focused command from Step 2. Expected: 1 passed, including live point addition, Undo, restored draft values, and drawing mode.

- [ ] **Step 5: Run the complete territory editor spec**

```bash
npx playwright test tests/e2e/territory-boundary-editor.spec.ts --reporter=line
```

Expected: all territory editor tests pass across portrait, landscape, keyboard, short desktop, and reported desktop.

- [ ] **Step 6: Commit the behavior slice**

```bash
git add components/mobile/territory-boundary-sheet.tsx tests/e2e/territory-boundary-editor.spec.ts SESSION.md
git commit -m "feat: minimize territory editor while drawing"
```

### Task 2: Full verification and delivery

**Files:**
- Modify: `SESSION.md`
- Generated proof: `test-results/**/territory-minimized-mobile.png`

**Interfaces:**
- Consumes: completed minimized editor and Playwright regression.
- Produces: verified PR, mobile visual proof, merged production commit.

- [ ] **Step 1: Capture browser proof**

Have the minimized-bar test write `territory-minimized-mobile.png` after point addition and before Undo. Inspect it to confirm the map is exposed, the compact bar is one row, and it clears primary navigation.

- [ ] **Step 2: Run repository verification**

```bash
npm run verify
npm run test:e2e -- --reporter=line
git diff --check origin/main...HEAD
```

Expected: zero failures and a clean diff check.

- [ ] **Step 3: Update session evidence and commit**

Record RED evidence, focused and full test counts, screenshot path, PR URL, and remaining deployment state in `SESSION.md`, then commit the documentation update.

- [ ] **Step 4: Push, mark the draft PR ready, and merge through the fast lane**

Push the branch, wait for GitHub CI and Vercel preview checks, then squash-merge because this is a scoped, reversible frontend feature with no approval-lane changes.

- [ ] **Step 5: Verify production delivery**

Verify the exact merge commit has successful merged-main CI and Vercel production status before reporting completion.
