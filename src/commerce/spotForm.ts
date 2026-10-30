import type { Spot } from './models'
import type { MapCoordinate } from './GoogleMapView'

export type SpotForm = {
  label: string
  delivery_address: string
  delivery_detail: string
  indoor_type: 'room' | 'classroom' | 'outdoor'
  room_number: string
  grade: string
  classroom: string
  coordinate: MapCoordinate | null
}

export const emptySpotForm: SpotForm = {
  label: '',
  delivery_address: '',
  delivery_detail: '',
  indoor_type: 'room',
  room_number: '',
  grade: '',
  classroom: '',
  coordinate: null,
}

export function spotFormFrom(spot: Spot): SpotForm {
  const indoorType = spot.room_number
    ? 'room'
    : spot.grade === null && spot.classroom === null
      ? 'outdoor'
      : 'classroom'
  return {
    label: spot.label,
    delivery_address: spot.delivery_address,
    delivery_detail: spot.delivery_detail ?? '',
    indoor_type: indoorType,
    room_number: spot.room_number ?? '',
    grade: spot.grade === null ? '' : String(spot.grade),
    classroom: spot.classroom ?? '',
    coordinate: { latitude: spot.latitude, longitude: spot.longitude },
  }
}

export function spotIndoorFields(form: SpotForm): Pick<Spot, 'room_number' | 'grade' | 'classroom'> {
  return {
    room_number: form.indoor_type === 'room' ? form.room_number.trim() : null,
    grade: form.indoor_type === 'classroom' ? Number(form.grade) : null,
    classroom: form.indoor_type === 'classroom' ? form.classroom.trim() : null,
  }
}
