const GOOGLE_PLACES_BASE = 'https://places.googleapis.com/v1'

function getApiKey(): string {
  const config = useRuntimeConfig()
  return config.googlePlacesApiKey
}

export async function googlePlacesRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: Record<string, unknown>
    fieldMask?: string[]
  } = {},
): Promise<T> {
  const { method = 'POST', body, fieldMask } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': getApiKey(),
  }
  if (fieldMask?.length) {
    headers['X-Goog-FieldMask'] = fieldMask.join(',')
  }

  const url = `${GOOGLE_PLACES_BASE}${path}`
  const response = await $fetch<T>(url, {
    method,
    headers,
    body: method === 'POST' ? body : undefined,
  })

  return response
}

export function getPhotoUrl(photoName: string, maxWidthPx: number = 400): string {
  return `${GOOGLE_PLACES_BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${getApiKey()}`
}
