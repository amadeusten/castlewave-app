import type mapboxgl from 'mapbox-gl';

const MAJOR_ROAD = ['motorway', 'trunk', 'primary'];
const SECONDARY_ROAD = ['secondary', 'tertiary'];

function paint(map: mapboxgl.Map, id: string, prop: string, value: unknown): void {
  try {
    if (map.getLayer(id)) map.setPaintProperty(id, prop as never, value as never);
  } catch { /* layer doesn't support this property */ }
}

function layout(map: mapboxgl.Map, id: string, prop: string, value: unknown): void {
  try {
    if (map.getLayer(id)) map.setLayoutProperty(id, prop as never, value as never);
  } catch { /* unsupported */ }
}

export function applyMonochromeStyle(map: mapboxgl.Map): void {
  const style = map.getStyle();
  if (!style?.layers) return;

  for (const layer of style.layers) {
    const { id, type } = layer;

    // Background
    if (type === 'background') {
      paint(map, id, 'background-color', '#ffffff');
      continue;
    }

    // Base land surface
    if (id === 'land' || id === 'land-structure') {
      paint(map, id, 'fill-color', '#ffffff');
      continue;
    }

    // Water
    if (id.startsWith('water') || id === 'waterway' || id === 'waterway-shadow') {
      if (type === 'fill') paint(map, id, 'fill-color', '#e0e0e0');
      if (type === 'line') paint(map, id, 'line-color', '#e0e0e0');
      continue;
    }

    // Parks / green / natural areas
    if (
      id.startsWith('landcover') ||
      id.startsWith('national-park') ||
      id.startsWith('landuse') ||
      id.includes('park') ||
      id.includes('grass') ||
      id.includes('scrub') ||
      id.includes('wood') ||
      id.includes('sand') ||
      id.includes('farmland')
    ) {
      if (type === 'fill') paint(map, id, 'fill-color', '#f0f0f0');
      continue;
    }

    // Buildings
    if (id.includes('building')) {
      if (type === 'fill') {
        paint(map, id, 'fill-color', '#e8e8e8');
        paint(map, id, 'fill-outline-color', '#d8d8d8');
      }
      continue;
    }

    // Roads, tunnels, bridges
    if (
      type === 'line' &&
      (id.startsWith('road') || id.startsWith('tunnel') || id.startsWith('bridge') || id.startsWith('turning'))
    ) {
      if (id.includes('casing') || id.includes('outline') || id.endsWith('-bg')) {
        paint(map, id, 'line-color', '#e0e0e0');
        continue;
      }
      const isMajor = MAJOR_ROAD.some(k => id.includes(k));
      const isSecondary = SECONDARY_ROAD.some(k => id.includes(k));
      paint(map, id, 'line-color', isMajor ? '#333333' : isSecondary ? '#888888' : '#cccccc');
      continue;
    }

    // Ferry / aeroway / admin
    if (id === 'ferry') { paint(map, id, 'line-color', '#e0e0e0'); continue; }
    if (id.startsWith('aeroway')) {
      if (type === 'fill') paint(map, id, 'fill-color', '#ebebeb');
      if (type === 'line') paint(map, id, 'line-color', '#cccccc');
      continue;
    }
    if (id.startsWith('admin') || id.includes('border')) {
      if (type === 'line') paint(map, id, 'line-color', '#cccccc');
      continue;
    }

    // Symbols: POI and shields hidden; everything else gets black text
    if (type === 'symbol') {
      if (id.includes('poi') || id.includes('shield')) {
        layout(map, id, 'visibility', 'none');
      } else {
        paint(map, id, 'text-color', '#000000');
        paint(map, id, 'text-halo-color', '#ffffff');
        paint(map, id, 'text-halo-width', 1);
      }
    }
  }
}
