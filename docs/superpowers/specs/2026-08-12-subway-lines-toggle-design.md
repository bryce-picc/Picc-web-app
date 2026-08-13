# Subway Lines Toggle Design

## Goal

Give PICC field reps optional subway context while they inspect accounts and plan visits on the territory map. The feature must be immediately usable from the map UI and remember each device's preference.

## User experience

The existing right-side map toolbar gains a train-icon button directly below Search. The button uses the same 40px operational control shape, neutral off state, and PICC-red active ring as adjacent map controls.

- Off: accessible label and title read `Show subway lines`; the current map remains unchanged.
- On: accessible label and title read `Hide subway lines`; the icon and focus ring use the existing PICC-red active treatment.
- Activation updates the map immediately without closing sheets, moving the camera, changing filters, or altering selected accounts.
- The chosen state survives reloads in the same browser on the same device.
- First use defaults to off so the existing map presentation does not change unexpectedly.

Google controls the precise route colors, station labels, and visibility thresholds. The result should provide the same kind of subway context as the supplied reference, not attempt to copy Apple Maps styling.

## Architecture

Use the Google Maps JavaScript API `TransitLayer` inside the existing `GoogleTerritoryMap` provider boundary. A small map-child component owns the Google overlay lifecycle: create the layer when enabled, attach it to the current map, and detach it during disable or unmount.

The territory mobile page owns the boolean UI preference. A focused territory utility defines the storage key and safely reads and writes the value. The state flows through `TerritoryMapMobile` into `GoogleTerritoryMap`, and into `TerritoryMapOverlayControls` for the button state.

This is additive. It introduces no API route, database field, external dataset, map provider, or account-data mutation.

## Data flow

1. On client initialization, read the device-local preference. Missing, malformed, or inaccessible storage resolves to `false`.
2. Render the map and toolbar from the resolved state.
3. On button activation, invert the state and persist the new boolean.
4. The map child attaches or detaches `google.maps.TransitLayer` based on that state.
5. Account pins, routes, boundaries, markers, selection state, and camera state remain independent.

## Failure behavior

- If local storage is unavailable, the toggle still works for the current page session.
- If Google Maps does not expose `TransitLayer`, do not break the map. Leave all PICC overlays interactive and return the visible toggle state to off with a concise toast explaining that subway lines are unavailable.
- Detach the overlay during component cleanup to prevent stale map references.

## Accessibility and responsive behavior

- The button is a native `button` with state-specific `aria-label`, `title`, and `aria-pressed`.
- Active styling is not the only state signal; accessible properties and tooltips state the action.
- The 40px control follows the existing toolbar density and remains reachable at mobile and desktop viewports.
- The new control must not obscure Google attribution, zoom controls, focused account cards, or the bottom navigation safe area.

## Testing

1. Add a failing unit test for preference parsing, fallback, and persistence.
2. Add a failing unit test around the overlay adapter for map attachment, detachment, cleanup, and unavailable-API behavior.
3. Use Playwright to verify state-specific button text, `aria-pressed`, activation, persistence after reload, and compatibility with route visualization.
4. Run `npm run verify`.
5. Run targeted Playwright coverage and `npm run test:e2e`.
6. Test default-off, enable, disable, reload persistence, route visualization compatibility, and unavailable-layer fallback.
7. Capture desktop and mobile screenshots with subway lines enabled.

## Acceptance criteria

- A train-icon subway control is visible directly on the territory map.
- Tapping it immediately shows or hides Google transit routes and stations.
- The button exposes correct visible and accessible active state.
- The choice persists across reloads on the same device.
- Existing territory interactions and overlays continue working.
- Failure to load the optional transit overlay cannot make the map unusable.
