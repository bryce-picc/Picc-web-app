export type SubwayPoint = { lat: number; lng: number };

export type SubwayRouteStyle = {
  label: string;
  color: string;
  textColor: string;
};

export type SubwayRoutePath = SubwayRouteStyle & {
  id: string;
  laneOffsetMeters: number;
  paths: SubwayPoint[][];
};

export type SubwayStation = {
  id: string;
  name: string;
  position: SubwayPoint;
  routes: string[];
  routeStyles?: SubwayRouteStyle[];
};

export type SubwayOverlayData = {
  source: {
    url: string;
    feedVersion: string;
    publisher?: string;
  };
  generatedAt: string;
  routes: SubwayRoutePath[];
  stations: SubwayStation[];
};

const HEX_COLOR = /^[0-9A-F]{6}$/i;

function isPoint(value: unknown): value is SubwayPoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<SubwayPoint>;
  return (
    typeof point.lat === 'number' &&
    Number.isFinite(point.lat) &&
    point.lat >= 40.45 &&
    point.lat <= 41.05 &&
    typeof point.lng === 'number' &&
    Number.isFinite(point.lng) &&
    point.lng >= -74.3 &&
    point.lng <= -73.65
  );
}

function isRouteStyle(value: unknown): value is SubwayRouteStyle {
  if (!value || typeof value !== 'object') return false;
  const style = value as Partial<SubwayRouteStyle>;
  return Boolean(style.label?.trim()) && HEX_COLOR.test(style.color ?? '') && HEX_COLOR.test(style.textColor ?? '');
}

function isRoute(value: unknown): value is SubwayRoutePath {
  if (!value || typeof value !== 'object') return false;
  const route = value as Partial<SubwayRoutePath>;
  return (
    Boolean(route.id?.trim()) &&
    Boolean(route.label?.trim()) &&
    HEX_COLOR.test(route.color ?? '') &&
    HEX_COLOR.test(route.textColor ?? '') &&
    typeof route.laneOffsetMeters === 'number' &&
    Number.isFinite(route.laneOffsetMeters) &&
    Array.isArray(route.paths) &&
    route.paths.length > 0 &&
    route.paths.every((path) => Array.isArray(path) && path.length >= 2 && path.every(isPoint))
  );
}

function isStation(value: unknown): value is SubwayStation {
  if (!value || typeof value !== 'object') return false;
  const station = value as Partial<SubwayStation>;
  return (
    Boolean(station.id?.trim()) &&
    Boolean(station.name?.trim()) &&
    isPoint(station.position) &&
    Array.isArray(station.routes) &&
    station.routes.length > 0 &&
    station.routes.every((route) => typeof route === 'string' && route.trim().length > 0) &&
    (station.routeStyles === undefined || (Array.isArray(station.routeStyles) && station.routeStyles.every(isRouteStyle)))
  );
}

export function parseSubwayOverlayData(input: unknown): SubwayOverlayData | null {
  if (!input || typeof input !== 'object') return null;
  const data = input as Partial<SubwayOverlayData>;
  if (
    !data.source ||
    typeof data.source.url !== 'string' ||
    typeof data.source.feedVersion !== 'string' ||
    typeof data.generatedAt !== 'string' ||
    !Array.isArray(data.routes) ||
    data.routes.length === 0 ||
    !data.routes.every(isRoute) ||
    !Array.isArray(data.stations) ||
    !data.stations.every(isStation)
  ) {
    return null;
  }
  return data as SubwayOverlayData;
}

export function subwayStrokeStyle(zoom: number) {
  if (zoom >= 13) return { strokeWeight: 8, casingWeight: 12, badgeSize: 22 };
  if (zoom >= 11) return { strokeWeight: 7, casingWeight: 11, badgeSize: 20 };
  return { strokeWeight: 5, casingWeight: 9, badgeSize: 20 };
}

export function visibleSubwayStations(stations: SubwayStation[], zoom: number) {
  const minimumRoutes = zoom >= 14 ? 1 : zoom >= 12 ? 2 : zoom >= 10 ? 3 : 5;
  return stations.filter((station) => station.routes.length >= minimumRoutes);
}

export function offsetSubwayPath(path: SubwayPoint[], laneOffsetMeters: number): SubwayPoint[] {
  if (laneOffsetMeters === 0 || path.length < 2) return path.map((point) => ({ ...point }));
  const earthRadiusMeters = 6_371_000;
  return path.map((point, index) => {
    const previous = path[Math.max(0, index - 1)];
    const next = path[Math.min(path.length - 1, index + 1)];
    const meanLatitude = ((previous.lat + next.lat) / 2) * (Math.PI / 180);
    const dx = (next.lng - previous.lng) * (Math.PI / 180) * Math.cos(meanLatitude) * earthRadiusMeters;
    const dy = (next.lat - previous.lat) * (Math.PI / 180) * earthRadiusMeters;
    const length = Math.hypot(dx, dy) || 1;
    const offsetX = (-dy / length) * laneOffsetMeters;
    const offsetY = (dx / length) * laneOffsetMeters;
    return {
      lat: point.lat + (offsetY / earthRadiusMeters) * (180 / Math.PI),
      lng: point.lng + (offsetX / (earthRadiusMeters * Math.cos(point.lat * (Math.PI / 180)))) * (180 / Math.PI),
    };
  });
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]!);
}

export function subwayBadgeSvg(station: SubwayStation, size: number) {
  const styles = station.routeStyles?.length
    ? station.routeStyles
    : station.routes.map((label) => ({ label, color: '25313D', textColor: 'FFFFFF' }));
  const gap = 2;
  const width = styles.length * size + Math.max(0, styles.length - 1) * gap;
  const circles = styles
    .map((style, index) => {
      const center = index * (size + gap) + size / 2;
      const fontSize = style.label.length > 1 ? size * 0.44 : size * 0.56;
      return `<circle cx="${center}" cy="${size / 2}" r="${size / 2 - 1.5}" fill="#${style.color}" stroke="#172334" stroke-width="2"/><text x="${center}" y="${size / 2}" fill="#${style.textColor}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle" dominant-baseline="central">${escapeXml(style.label)}</text>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${size}" viewBox="0 0 ${width} ${size}" aria-label="${escapeXml(station.name)}">${circles}</svg>`;
}
