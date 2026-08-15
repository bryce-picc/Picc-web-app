# Territory Editor Minimization Design

## Problem

The territory boundary editor occupies most of a phone viewport. That makes the map too small to use while adding or adjusting territory points. A minimized state that pauses drawing would not solve the problem because map taps are the primary editing interaction.

## Chosen interaction

The expanded editor gains a clearly labeled `Minimize territory editor` control beside Close. Activating it replaces the sheet with a single compact row above the primary bottom navigation.

The compact row contains:

- A drawing-status label and live point count, such as `Drawing · 8 points`.
- An `Undo point` button.
- An `Expand territory editor` button.

Map-tap drawing stays active while the editor is minimized. The compact bar never changes drawing mode, clears coordinates, saves, or closes the editor.

## State and behavior

Minimization is local presentation state inside `TerritoryBoundaryEditor`. The existing boundary draft remains the only source of truth for name, description, color, border width, and coordinates.

- Minimize preserves the draft and current drawing mode.
- Map taps continue to invoke the existing point-addition flow.
- The point count updates from the existing coordinate array.
- Undo calls the existing last-point handler.
- Expand restores the complete editor without resetting scrollable content or draft values.
- Closing the editor clears the presentation state so the next editor opens expanded.

No server request or persistence change is introduced.

## Layout and accessibility

The compact bar uses the editor's existing warm surface, border, radius, and shadow. It remains inside the current bottom-navigation clearance and uses one row with 44px mobile touch targets. The status truncates before actions rather than wrapping to a second row.

Minimize, Undo, and Expand have explicit accessible names. Keyboard focus follows the visible controls only; hidden expanded controls are not left tabbable.

## Alternatives considered

1. Keep the entire header visible and collapse only the body. This still consumes unnecessary vertical space and leaves drawing actions ambiguous.
2. Use a draggable bottom sheet. This adds gesture conflicts with the map, more layout states, and persistence questions beyond the immediate need.
3. Pause drawing when minimized. Rejected because it makes the newly exposed map unusable for territory-point editing.

## Error and edge handling

Undo remains disabled or harmless when there are no points, following the current handler contract. Minimize remains available during drawing and editing. Saving continues to require expanding the editor, keeping destructive and persistence actions deliberate.

## Test contract

At a 390x844 viewport, the browser regression will:

1. Open a populated territory editor and enter drawing mode.
2. Minimize and assert the full form and footer are hidden.
3. Assert the compact row is fully above primary navigation and materially shorter than the expanded sheet.
4. Tap an unobstructed map location and verify the live point count increases.
5. Use compact Undo and verify the point count returns to its prior value.
6. Expand and verify drawing mode, boundary fields, coordinates, and fixed Finish/Clear/Save actions remain intact.

Existing portrait, landscape, keyboard, short-desktop, and reported-desktop territory tests remain required.
