import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const [inputDirectory, outputFile] = process.argv.slice(2);
if (!inputDirectory || !outputFile) {
  throw new Error('Usage: node scripts/generate-subway-overlay.mjs <gtfs-directory> <output-json>');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  const [headers, ...records] = rows;
  return records.filter((record) => record.some(Boolean)).map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ''])));
}

async function table(name) {
  return parseCsv(await readFile(path.join(inputDirectory, name), 'utf8'));
}

function pointDistanceMeters(a, b) {
  const latitude = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const x = (b.lng - a.lng) * (Math.PI / 180) * Math.cos(latitude);
  const y = (b.lat - a.lat) * (Math.PI / 180);
  return Math.hypot(x, y) * 6_371_000;
}

function perpendicularDistanceMeters(point, start, end) {
  const lineLength = pointDistanceMeters(start, end);
  if (lineLength === 0) return pointDistanceMeters(point, start);
  const latitude = ((start.lat + end.lat + point.lat) / 3) * (Math.PI / 180);
  const scaleX = Math.cos(latitude) * 111_320;
  const scaleY = 110_540;
  const x1 = start.lng * scaleX;
  const y1 = start.lat * scaleY;
  const x2 = end.lng * scaleX;
  const y2 = end.lat * scaleY;
  const x = point.lng * scaleX;
  const y = point.lat * scaleY;
  const projection = Math.max(0, Math.min(1, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / ((x2 - x1) ** 2 + (y2 - y1) ** 2)));
  return Math.hypot(x - (x1 + projection * (x2 - x1)), y - (y1 + projection * (y2 - y1)));
}

function simplify(points, toleranceMeters) {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let splitIndex = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = perpendicularDistanceMeters(points[index], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      splitIndex = index;
    }
  }
  if (maxDistance <= toleranceMeters) return [points[0], points[points.length - 1]];
  const left = simplify(points.slice(0, splitIndex + 1), toleranceMeters);
  const right = simplify(points.slice(splitIndex), toleranceMeters);
  return [...left.slice(0, -1), ...right];
}

function pathSignature(points) {
  const first = points[0];
  const last = points[points.length - 1];
  const endpoint = (point) => `${point.lat.toFixed(4)},${point.lng.toFixed(4)}`;
  return [endpoint(first), endpoint(last)].sort().join('|');
}

const [routesRows, tripsRows, shapesRows, stopsRows, stopTimesRows, feedRows] = await Promise.all([
  table('routes.txt'),
  table('trips.txt'),
  table('shapes.txt'),
  table('stops.txt'),
  table('stop_times.txt'),
  table('feed_info.txt'),
]);

const routeMeta = new Map(routesRows.filter((route) => route.route_type === '1').map((route) => [route.route_id, route]));
const shapeRoutes = new Map();
const tripRoutes = new Map();
for (const trip of tripsRows) {
  if (!routeMeta.has(trip.route_id)) continue;
  shapeRoutes.set(trip.shape_id, trip.route_id);
  tripRoutes.set(trip.trip_id, trip.route_id);
}

const pointsByShape = new Map();
for (const shape of shapesRows) {
  if (!shapeRoutes.has(shape.shape_id)) continue;
  const points = pointsByShape.get(shape.shape_id) ?? [];
  points.push({
    sequence: Number(shape.shape_pt_sequence),
    lat: Number(shape.shape_pt_lat),
    lng: Number(shape.shape_pt_lon),
  });
  pointsByShape.set(shape.shape_id, points);
}

const pathsByRoute = new Map();
for (const [shapeId, rawPoints] of pointsByShape) {
  const routeId = shapeRoutes.get(shapeId);
  const points = rawPoints.sort((a, b) => a.sequence - b.sequence).map(({ lat, lng }) => ({ lat, lng }));
  const routePaths = pathsByRoute.get(routeId) ?? new Map();
  const signature = pathSignature(points);
  const prior = routePaths.get(signature);
  if (!prior || points.length > prior.length) routePaths.set(signature, points);
  pathsByRoute.set(routeId, routePaths);
}

const routesByColor = new Map();
for (const route of routeMeta.values()) {
  const group = routesByColor.get(route.route_color) ?? [];
  group.push(route.route_id);
  routesByColor.set(route.route_color, group);
}
const laneOffsets = new Map();
for (const ids of routesByColor.values()) {
  ids.sort((a, b) => Number(routeMeta.get(a).route_sort_order) - Number(routeMeta.get(b).route_sort_order));
  ids.forEach((id, index) => laneOffsets.set(id, (index - (ids.length - 1) / 2) * 7));
}

const stopMeta = new Map(stopsRows.map((stop) => [stop.stop_id, stop]));
const routesByStation = new Map();
for (const stopTime of stopTimesRows) {
  const routeId = tripRoutes.get(stopTime.trip_id);
  const stop = stopMeta.get(stopTime.stop_id);
  if (!routeId || !stop) continue;
  const stationId = stop.parent_station || stop.stop_id;
  const services = routesByStation.get(stationId) ?? new Set();
  services.add(routeId);
  routesByStation.set(stationId, services);
}

const routes = [...routeMeta.values()]
  .map((route) => ({
    id: route.route_id,
    label: route.route_short_name,
    color: route.route_color || '6C7078',
    textColor: route.route_text_color || 'FFFFFF',
    laneOffsetMeters: laneOffsets.get(route.route_id) ?? 0,
    paths: [...(pathsByRoute.get(route.route_id)?.values() ?? [])].map((points) => simplify(points, 6)),
  }))
  .filter((route) => route.paths.length > 0)
  .sort((a, b) => Number(routeMeta.get(a.id).route_sort_order) - Number(routeMeta.get(b.id).route_sort_order));

const routeStyles = new Map(routes.map(({ id, label, color, textColor }) => [id, { label, color, textColor }]));
const stations = stopsRows
  .filter((stop) => stop.location_type === '1' && routesByStation.has(stop.stop_id))
  .map((stop) => {
    const routeIds = [...routesByStation.get(stop.stop_id)].filter((id) => routeStyles.has(id)).sort((a, b) => routes.findIndex((route) => route.id === a) - routes.findIndex((route) => route.id === b));
    return {
      id: stop.stop_id,
      name: stop.stop_name,
      position: { lat: Number(stop.stop_lat), lng: Number(stop.stop_lon) },
      routes: routeIds,
      routeStyles: routeIds.map((id) => routeStyles.get(id)),
    };
  });

const feed = feedRows[0] ?? {};
const output = {
  source: {
    url: 'http://web.mta.info/developers/data/nyct/subway/google_transit.zip',
    feedVersion: feed.feed_version || `${feed.feed_start_date || ''}-${feed.feed_end_date || ''}`,
    publisher: feed.feed_publisher_name || 'MTA New York City Transit',
  },
  generatedAt: new Date().toISOString(),
  routes,
  stations,
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(output)}\n`);
console.log(JSON.stringify({ routes: routes.length, paths: routes.reduce((sum, route) => sum + route.paths.length, 0), stations: stations.length }));
