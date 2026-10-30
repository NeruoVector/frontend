export type MapCoordinate = {
  readonly latitude: number
  readonly longitude: number
}

export type MapMarker = MapCoordinate & {
  readonly id: string
  readonly label: string
}

export type MarkerViewport =
  | { readonly kind: 'none'; readonly key: string }
  | { readonly kind: 'single'; readonly key: string; readonly marker: MapMarker }
  | { readonly kind: 'bounds'; readonly key: string; readonly markers: readonly MapMarker[] }

export function markerViewport(markers: readonly MapMarker[]): MarkerViewport {
  const key = JSON.stringify(markers.map(({ id }) => id).sort())
  switch (markers.length) {
    case 0:
      return { kind: 'none', key }
    case 1: {
      const marker = markers[0]
      return marker ? { kind: 'single', key, marker } : { kind: 'none', key }
    }
    default:
      return { kind: 'bounds', key, markers }
  }
}
