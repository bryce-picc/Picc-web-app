import { describe, expect, it, vi } from 'vitest';
import {
  SUBWAY_LINES_STORAGE_KEY,
  createSubwayOverlayController,
  getBrowserLocalStorage,
  loadSubwayOverlay,
  loadSubwayLinesPreference,
  persistSubwayLinesPreference,
} from '@/lib/territory/subway-lines';
import type { SubwayOverlayData } from '@/lib/territory/subway-overlay';

const overlayData: SubwayOverlayData = {
  source: { url: 'https://example.com/subway.zip', feedVersion: 'test' },
  generatedAt: '2026-08-12T00:00:00.000Z',
  routes: [
    {
      id: 'A',
      label: 'A',
      color: '0062CF',
      textColor: 'FFFFFF',
      laneOffsetMeters: 0,
      paths: [[{ lat: 40.7, lng: -74.01 }, { lat: 40.72, lng: -73.99 }]],
    },
  ],
  stations: [
    {
      id: 'hub',
      name: 'Hub',
      position: { lat: 40.71, lng: -74 },
      routes: ['A', 'C', 'E', 'B', 'D'],
      routeStyles: [{ label: 'A', color: '0062CF', textColor: 'FFFFFF' }],
    },
  ],
};

describe('subway lines preference', () => {
  it('returns null when the browser blocks access to the localStorage property', () => {
    const browser = Object.defineProperty({}, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });

    expect(getBrowserLocalStorage(browser)).toBeNull();
  });

  it('defaults to off for missing, malformed, or inaccessible storage', () => {
    expect(loadSubwayLinesPreference(null)).toBe(false);
    expect(loadSubwayLinesPreference({ getItem: () => null })).toBe(false);
    expect(loadSubwayLinesPreference({ getItem: () => 'yes' })).toBe(false);
    expect(
      loadSubwayLinesPreference({
        getItem: () => {
          throw new Error('blocked');
        },
      }),
    ).toBe(false);
  });

  it('loads and persists exact boolean values', () => {
    expect(loadSubwayLinesPreference({ getItem: () => 'true' })).toBe(true);
    expect(loadSubwayLinesPreference({ getItem: () => 'false' })).toBe(false);

    const setItem = vi.fn();
    expect(persistSubwayLinesPreference({ setItem }, true)).toBe(true);
    expect(setItem).toHaveBeenCalledWith(SUBWAY_LINES_STORAGE_KEY, 'true');
  });

  it('reports a failed write without throwing', () => {
    expect(
      persistSubwayLinesPreference(
        {
          setItem: () => {
            throw new Error('quota');
          },
        },
        true,
      ),
    ).toBe(false);
  });
});

describe('subway overlay loader', () => {
  it('returns null for failed requests and malformed data', async () => {
    await expect(loadSubwayOverlay(async () => ({ ok: false, json: async () => overlayData }))).resolves.toBeNull();
    await expect(loadSubwayOverlay(async () => ({ ok: true, json: async () => ({ routes: 'bad' }) }))).resolves.toBeNull();
  });

  it('returns validated overlay data', async () => {
    await expect(loadSubwayOverlay(async () => ({ ok: true, json: async () => overlayData }))).resolves.toEqual(overlayData);
  });

  it('reuses the validated asset for repeated loads with the same fetcher', async () => {
    const fetcher = vi.fn(async () => ({ ok: true, json: async () => overlayData }));
    await expect(Promise.all([loadSubwayOverlay(fetcher), loadSubwayOverlay(fetcher)])).resolves.toEqual([overlayData, overlayData]);
    await expect(loadSubwayOverlay(fetcher)).resolves.toEqual(overlayData);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('custom subway overlay controller', () => {
  it('draws cased official-color paths, zoom-aware badges, and cleans up', () => {
    const polylines: Array<{ options: Record<string, unknown>; setOptions: ReturnType<typeof vi.fn>; setMap: ReturnType<typeof vi.fn> }> = [];
    const markers: Array<{ options: Record<string, unknown>; setMap: ReturnType<typeof vi.fn>; setIcon: ReturnType<typeof vi.fn> }> = [];
    class Polyline {
      options: Record<string, unknown>;
      setOptions = vi.fn();
      setMap = vi.fn();
      constructor(options: Record<string, unknown>) {
        this.options = options;
        polylines.push(this);
      }
    }
    class Marker {
      options: Record<string, unknown>;
      setMap = vi.fn();
      setIcon = vi.fn();
      constructor(options: Record<string, unknown>) {
        this.options = options;
        markers.push(this);
      }
    }
    class Size {
      constructor(public width: number, public height: number) {}
    }
    class Point {
      constructor(public x: number, public y: number) {}
    }

    const map = { id: 'territory-map' };
    const controller = createSubwayOverlayController({ Polyline, Marker, Size, Point }, map, overlayData);
    expect(controller).not.toBeNull();
    expect(polylines).toHaveLength(2);
    expect(polylines[0].options).toMatchObject({ strokeColor: '#172334', strokeWeight: 9, zIndex: 20 });
    expect(polylines[1].options).toMatchObject({ strokeColor: '#0062CF', strokeWeight: 5, zIndex: 21 });
    expect(markers).toHaveLength(1);
    expect(markers[0].options).toMatchObject({ clickable: false, optimized: true, zIndex: 22 });

    controller!.updateZoom(14);
    expect(polylines[0].setOptions).toHaveBeenLastCalledWith({ strokeWeight: 12 });
    expect(polylines[1].setOptions).toHaveBeenLastCalledWith({ strokeWeight: 8 });
    expect(markers[0].setIcon).toHaveBeenCalled();

    const casingUpdates = polylines[0].setOptions.mock.calls.length;
    const colorUpdates = polylines[1].setOptions.mock.calls.length;
    const iconUpdates = markers[0].setIcon.mock.calls.length;
    const visibilityUpdates = markers[0].setMap.mock.calls.length;
    controller!.updateZoom(14.4);
    expect(polylines[0].setOptions).toHaveBeenCalledTimes(casingUpdates);
    expect(polylines[1].setOptions).toHaveBeenCalledTimes(colorUpdates);
    expect(markers[0].setIcon).toHaveBeenCalledTimes(iconUpdates);
    expect(markers[0].setMap).toHaveBeenCalledTimes(visibilityUpdates);

    controller!.destroy();
    controller!.destroy();
    expect(polylines.every((polyline) => polyline.setMap.mock.calls.some(([value]) => value === null))).toBe(true);
    expect(markers[0].setMap).toHaveBeenLastCalledWith(null);
  });

  it('returns null when required Google Maps constructors are missing', () => {
    expect(createSubwayOverlayController(null, {}, overlayData)).toBeNull();
    expect(createSubwayOverlayController({}, {}, overlayData)).toBeNull();
  });
});
