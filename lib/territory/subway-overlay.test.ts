import { describe, expect, it } from 'vitest';
import {
  offsetSubwayPath,
  parseSubwayOverlayData,
  subwayBadgeSvg,
  subwayStrokeStyle,
  visibleSubwayStations,
  type SubwayStation,
} from '@/lib/territory/subway-overlay';

const stations: SubwayStation[] = [
  { id: 'one', name: 'One', position: { lat: 40.71, lng: -74 }, routes: ['A'] },
  { id: 'two', name: 'Two', position: { lat: 40.72, lng: -73.99 }, routes: ['A', 'C'] },
  { id: 'three', name: 'Three', position: { lat: 40.73, lng: -73.98 }, routes: ['A', 'C', 'E'] },
  { id: 'five', name: 'Five', position: { lat: 40.74, lng: -73.97 }, routes: ['A', 'C', 'E', 'B', 'D'] },
];

describe('subway overlay styling', () => {
  it('uses thick zoom-aware strokes and badges', () => {
    expect(subwayStrokeStyle(9)).toEqual({ strokeWeight: 5, casingWeight: 9, badgeSize: 20 });
    expect(subwayStrokeStyle(12)).toEqual({ strokeWeight: 7, casingWeight: 11, badgeSize: 20 });
    expect(subwayStrokeStyle(14)).toEqual({ strokeWeight: 8, casingWeight: 12, badgeSize: 22 });
  });

  it('declutters badges as the map zooms out', () => {
    expect(visibleSubwayStations(stations, 9).map((station) => station.id)).toEqual(['five']);
    expect(visibleSubwayStations(stations, 10).map((station) => station.id)).toEqual(['three', 'five']);
    expect(visibleSubwayStations(stations, 12).map((station) => station.id)).toEqual(['two', 'three', 'five']);
    expect(visibleSubwayStations(stations, 14)).toEqual(stations);
  });
});

describe('subway overlay data', () => {
  it('rejects malformed geometry', () => {
    expect(parseSubwayOverlayData({ routes: 'bad' })).toBeNull();
    expect(
      parseSubwayOverlayData({
        source: { url: 'https://example.com', feedVersion: '1' },
        generatedAt: '2026-08-12T00:00:00.000Z',
        routes: [{ id: 'A', label: 'A', color: '0062CF', textColor: 'FFFFFF', laneOffsetMeters: 0, paths: [[[0, 0]]]}],
        stations: [],
      }),
    ).toBeNull();
  });

  it('keeps finite path geometry while applying a stable perpendicular offset', () => {
    const path = [
      { lat: 40.7, lng: -74.01 },
      { lat: 40.71, lng: -74 },
      { lat: 40.72, lng: -73.99 },
    ];
    expect(offsetSubwayPath(path, 0)).toEqual(path);
    const offset = offsetSubwayPath(path, 12);
    expect(offset).toHaveLength(path.length);
    expect(offset).not.toEqual(path);
    expect(offset.every((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng))).toBe(true);
  });

  it('creates safe route-color badges for an interchange', () => {
    const svg = subwayBadgeSvg(
      {
        id: 'jay',
        name: 'Jay St',
        position: { lat: 40.692, lng: -73.987 },
        routes: ['A', 'F'],
        routeStyles: [
          { label: 'A', color: '0062CF', textColor: 'FFFFFF' },
          { label: 'F', color: 'EB6800', textColor: 'FFFFFF' },
        ],
      },
      22,
    );
    expect(svg).toContain('A');
    expect(svg).toContain('#0062CF');
    expect(svg).toContain('F');
    expect(svg).toContain('#EB6800');
  });
});
