export const SUBWAY_LINES_STORAGE_KEY = 'picc:territory:subway-lines';

export type StorageReader = { getItem: (key: string) => string | null };
export type StorageWriter = { setItem: (key: string, value: string) => void };

export type TransitLayerHandle = {
  setMap: (map: unknown | null) => void;
};

export type TransitMapsApi = {
  TransitLayer?: new () => TransitLayerHandle;
};

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

export function createTransitLayer(mapsApi: TransitMapsApi | null | undefined): TransitLayerHandle | null {
  return mapsApi?.TransitLayer ? new mapsApi.TransitLayer() : null;
}

export function attachTransitLayer(layer: TransitLayerHandle, map: unknown): () => void {
  layer.setMap(map);
  return () => layer.setMap(null);
}
