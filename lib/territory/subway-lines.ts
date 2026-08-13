import {
  offsetSubwayPath,
  parseSubwayOverlayData,
  subwayBadgeSvg,
  subwayStrokeStyle,
  visibleSubwayStations,
  type SubwayOverlayData,
  type SubwayStation,
} from '@/lib/territory/subway-overlay';

export const SUBWAY_LINES_STORAGE_KEY = 'picc:territory:subway-lines';
export const SUBWAY_OVERLAY_URL = '/data/nyc-subway-overlay.v1.json';

export type StorageReader = { getItem: (key: string) => string | null };
export type StorageWriter = { setItem: (key: string, value: string) => void };
export type BrowserStorage = StorageReader & StorageWriter;

type SubwayPolylineHandle = {
  setMap: (map: unknown | null) => void;
  setOptions: (options: { strokeWeight: number }) => void;
};

type SubwayMarkerHandle = {
  setMap: (map: unknown | null) => void;
  setIcon: (icon: unknown) => void;
};

export type SubwayMapsApi = {
  Polyline?: new (options: Record<string, unknown>) => SubwayPolylineHandle;
  Marker?: new (options: Record<string, unknown>) => SubwayMarkerHandle;
  Size?: new (width: number, height: number) => unknown;
  Point?: new (x: number, y: number) => unknown;
};

type SubwayFetchResponse = {
  ok: boolean;
  json: () => Promise<unknown>;
};

type SubwayFetcher = (input: string) => Promise<SubwayFetchResponse>;
const defaultSubwayFetcher: SubwayFetcher = (input) => fetch(input);
const subwayOverlayLoads = new WeakMap<SubwayFetcher, Promise<SubwayOverlayData | null>>();

export type SubwayOverlayController = {
  updateZoom: (zoom: number) => void;
  destroy: () => void;
};

export function getBrowserLocalStorage(browser: unknown): BrowserStorage | null {
  try {
    return (browser as { localStorage?: BrowserStorage } | null | undefined)?.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadSubwayLinesPreference(storage: StorageReader | null | undefined): boolean {
  try {
    return storage?.getItem(SUBWAY_LINES_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function persistSubwayLinesPreference(
  storage: StorageWriter | null | undefined,
  enabled: boolean,
): boolean {
  try {
    if (!storage) return false;
    storage.setItem(SUBWAY_LINES_STORAGE_KEY, String(enabled));
    return true;
  } catch {
    return false;
  }
}

export function loadSubwayOverlay(fetcher: SubwayFetcher = defaultSubwayFetcher): Promise<SubwayOverlayData | null> {
  const cached = subwayOverlayLoads.get(fetcher);
  if (cached) return cached;

  const load = (async () => {
    try {
      const response = await fetcher(SUBWAY_OVERLAY_URL);
      if (!response.ok) return null;
      return parseSubwayOverlayData(await response.json());
    } catch {
      return null;
    }
  })();
  subwayOverlayLoads.set(fetcher, load);
  void load.then((result) => {
    if (!result && subwayOverlayLoads.get(fetcher) === load) subwayOverlayLoads.delete(fetcher);
  });
  return load;
}

function markerIcon(api: Required<Pick<SubwayMapsApi, 'Size' | 'Point'>>, station: SubwayStation, size: number) {
  const svg = subwayBadgeSvg(station, size);
  const count = station.routeStyles?.length ?? station.routes.length;
  const width = count * size + Math.max(0, count - 1) * 2;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new api.Size(width, size),
    anchor: new api.Point(width / 2, size / 2),
  };
}

export function createSubwayOverlayController(
  mapsApi: SubwayMapsApi | null | undefined,
  map: unknown,
  data: SubwayOverlayData,
): SubwayOverlayController | null {
  if (!mapsApi?.Polyline || !mapsApi.Marker || !mapsApi.Size || !mapsApi.Point) return null;

  const api = mapsApi as Required<Pick<SubwayMapsApi, 'Polyline' | 'Marker' | 'Size' | 'Point'>>;
  const initialStyle = subwayStrokeStyle(9);
  const lines: Array<{ casing: SubwayPolylineHandle; color: SubwayPolylineHandle }> = [];

  for (const route of data.routes) {
    for (const rawPath of route.paths) {
      const path = offsetSubwayPath(rawPath, route.laneOffsetMeters);
      const casing = new api.Polyline({
        map,
        path,
        clickable: false,
        geodesic: true,
        strokeColor: '#172334',
        strokeOpacity: 0.92,
        strokeWeight: initialStyle.casingWeight,
        zIndex: 20,
      });
      const color = new api.Polyline({
        map,
        path,
        clickable: false,
        geodesic: true,
        strokeColor: `#${route.color}`,
        strokeOpacity: 1,
        strokeWeight: initialStyle.strokeWeight,
        zIndex: 21,
      });
      lines.push({ casing, color });
    }
  }

  const badges = data.stations.map((station) => {
    const visible = station.routes.length >= 5;
    return {
      station,
      visible,
      marker: new api.Marker({
        map: visible ? map : null,
        position: station.position,
        icon: markerIcon(api, station, initialStyle.badgeSize),
        title: `${station.name}: ${station.routes.join(', ')}`,
        clickable: false,
        optimized: true,
        zIndex: 22,
      }),
    };
  });

  let destroyed = false;
  let currentZoomBucket = subwayZoomBucket(9);
  let currentStrokeWeight = initialStyle.strokeWeight;
  let currentCasingWeight = initialStyle.casingWeight;
  let currentBadgeSize = initialStyle.badgeSize;
  return {
    updateZoom(zoom) {
      if (destroyed) return;
      const nextZoomBucket = subwayZoomBucket(zoom);
      if (nextZoomBucket === currentZoomBucket) return;
      currentZoomBucket = nextZoomBucket;
      const style = subwayStrokeStyle(zoom);
      if (style.strokeWeight !== currentStrokeWeight || style.casingWeight !== currentCasingWeight) {
        for (const line of lines) {
          line.casing.setOptions({ strokeWeight: style.casingWeight });
          line.color.setOptions({ strokeWeight: style.strokeWeight });
        }
        currentStrokeWeight = style.strokeWeight;
        currentCasingWeight = style.casingWeight;
      }
      const visibleIds = new Set(visibleSubwayStations(data.stations, zoom).map((station) => station.id));
      for (const badge of badges) {
        if (style.badgeSize !== currentBadgeSize) badge.marker.setIcon(markerIcon(api, badge.station, style.badgeSize));
        const nextVisible = visibleIds.has(badge.station.id);
        if (nextVisible !== badge.visible) {
          badge.visible = nextVisible;
          badge.marker.setMap(nextVisible ? map : null);
        }
      }
      currentBadgeSize = style.badgeSize;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const line of lines) {
        line.casing.setMap(null);
        line.color.setMap(null);
      }
      for (const badge of badges) badge.marker.setMap(null);
    },
  };
}

function subwayZoomBucket(zoom: number) {
  if (zoom >= 14) return '14+';
  if (zoom >= 13) return '13';
  if (zoom >= 12) return '12';
  if (zoom >= 11) return '11';
  if (zoom >= 10) return '10';
  return '9-';
}
