# Subway Visibility Design

## Goal

Make NYC subway routes immediately identifiable on the PICC territory map. The visual target is the supplied Apple Maps screenshot: bold geographic route lines, strong edge contrast, and compact route-letter badges. The result should closely match that treatment while retaining Google Maps as the base map.

## Chosen approach

Replace Google Maps' unstyleable `TransitLayer` with a focused custom overlay built from official public MTA subway geometry. Render the geometry through the existing Google Maps instance so subway information remains aligned with streets, account pins, territory boundaries, and route planning.

The overlay will use two passes:

1. A dark, semi-opaque casing stroke creates separation from the Google base map.
2. A thicker route-color stroke sits above the casing and uses round caps and joins.

Shared corridors will display stable, slightly separated route strokes rather than letting overlapping routes hide one another. Sparse badge anchors will identify the services using official MTA route colors and circular or diamond route markers. Badge density will increase at closer zoom levels and remain restrained when zoomed out.

This reproduces the subway-specific visual language of the reference. It will not copy Apple's proprietary tiles, street-label typography, POI styling, or base-map trade dress.

## Data boundary

- Use an official public MTA source for route shapes and route identities.
- Normalize only the fields the browser needs into a versioned, public-safe static asset.
- Record source URL and source/version date beside the generated asset.
- The runtime performs no MTA API request and requires no new secret.
- Invalid coordinates or unknown route identities are skipped without breaking the map.

Live schedules, arrival times, service alerts, and trip-planning data are outside this slice.

## Map behavior

- Subway remains off until enabled or restored from the existing device-local preference.
- Enabling subway mounts the custom route and badge overlays without changing the user's camera position.
- Route strokes stay visually below PICC account pins and the blue driving-route overlay.
- Badge labels use zoom-aware decluttering and do not capture pointer input.
- Disabling subway removes every custom subway map object and listener.
- If the asset cannot load, the toggle resets off and the existing human-readable error toast is shown.

## Controls

The right-hand map control order will be:

1. Search
2. Territory Layers
3. Filters
4. Subway

The Subway button therefore sits directly underneath Filters. It retains the train icon, `aria-pressed`, device persistence, tooltip text, and PICC-red active treatment.

## Visual specification

- Main route strokes: 5 CSS pixels through zoom 10, 7 pixels at zoom 11-12, and 8 pixels from zoom 13 upward.
- Casing: 4 CSS pixels wider than the colored stroke, using a dark navy/slate with enough opacity to separate the line from streets and polygons.
- Line caps and joins: round.
- Route colors: official MTA service colors.
- Badges: 20 CSS pixels through zoom 12 and 22 pixels from zoom 13 upward, with high-contrast route-color fills, official white/black lettering as appropriate, and a compact dark outline.
- Reduced clutter: badge anchors are sparse at broad zoom and denser near neighborhood/street zoom.

## Components and responsibilities

- `lib/territory/subway-*`: typed route data, validation, grouping/offset rules, zoom styling, and badge selection. These functions stay deterministic and unit-testable.
- `public/data/subway-*`: normalized, versioned MTA geometry and attribution metadata.
- `components/territory/google-territory-map.tsx`: a thin React lifecycle wrapper that mounts, updates, and cleans up custom Google Maps polylines and non-interactive badge overlays.
- `components/mobile/territory-map-overlay-controls.tsx`: control ordering only; it does not own map-rendering logic.

No database, server route, authentication, or environment change is required.

## Error and loading states

- The existing toggle remains responsive while the static asset loads.
- A repeated click cannot mount duplicate overlays.
- Loading failure cleans up partial objects, switches the preference off, and shows a concise toast.
- Unsupported/invalid route records are ignored and covered by tests.

## Testing

- Unit tests cover route validation, MTA color mapping, shared-corridor separation inputs, zoom-dependent stroke/badge decisions, invalid data, and cleanup.
- Playwright verifies Search -> Layers -> Filters -> Subway order, accessible toggle state, device-local persistence, mobile reachability, and coexistence with driving-route visualization.
- Browser verification checks desktop and 390x844 layouts, line contrast, badge legibility, map gestures, account-pin readability, and toggling cleanup.
- Run `npm run verify` and `npm run test:e2e` before merge.

## Acceptance boundary

The subway overlay is complete when a user can turn it on, immediately distinguish visible subway services by thick route-colored lines and route badges, continue using account pins and route planning, reload with the preference preserved, and reach the Subway button directly beneath Filters on mobile and desktop.
