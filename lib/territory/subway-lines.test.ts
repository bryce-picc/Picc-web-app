import { describe, expect, it, vi } from 'vitest';
import {
  SUBWAY_LINES_STORAGE_KEY,
  attachTransitLayer,
  createTransitLayer,
  getBrowserLocalStorage,
  loadSubwayLinesPreference,
  persistSubwayLinesPreference,
} from '@/lib/territory/subway-lines';

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

describe('Google transit layer adapter', () => {
  it('returns null when the optional Google API is unavailable', () => {
    expect(createTransitLayer(null)).toBeNull();
    expect(createTransitLayer({})).toBeNull();
  });

  it('attaches once and detaches during cleanup', () => {
    const setMap = vi.fn();
    class TransitLayer {
      setMap = setMap;
    }
    const layer = createTransitLayer({ TransitLayer });
    expect(layer).not.toBeNull();

    const map = { id: 'territory-map' };
    const cleanup = attachTransitLayer(layer!, map);
    expect(setMap).toHaveBeenCalledWith(map);
    cleanup();
    expect(setMap).toHaveBeenLastCalledWith(null);
  });
});
