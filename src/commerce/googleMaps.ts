declare global {
  interface Window {
    google?: typeof google
  }
}

let mapsPromise: Promise<typeof google.maps> | null = null

export function loadGoogleMaps(apiKey: string): Promise<typeof google.maps> {
  if (!apiKey) return Promise.reject(new Error('VITE_GOOGLE_MAPS_API_KEY가 설정되지 않았습니다.'))
  if (window.google?.maps) return Promise.resolve(window.google.maps)
  if (mapsPromise) return mapsPromise

  mapsPromise = new Promise<typeof google.maps>((resolve, reject) => {
    const script = document.createElement('script')
    script.async = true
    script.defer = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps)
      } else {
        reject(new Error('Google Maps SDK가 초기화되지 않았습니다.'))
      }
    }
    script.onerror = () => reject(new Error('Google Maps SDK를 불러오지 못했습니다.'))
    document.head.append(script)
  })

  return mapsPromise.catch((error: unknown) => {
    mapsPromise = null
    throw error
  })
}
