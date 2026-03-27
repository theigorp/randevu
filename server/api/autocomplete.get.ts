import { defineEventHandler, getQuery } from 'h3'
import { autocomplete } from '~/server/services/google-places'

export default defineEventHandler(async (event) => {
  const query = getQuery(event) as {
    input: string
    types?: string
    lat?: string
    lng?: string
  }

  if (!query.input) return []

  return autocomplete({
    input: query.input,
    types: query.types?.split(','),
    lat: query.lat ? parseFloat(query.lat) : undefined,
    lng: query.lng ? parseFloat(query.lng) : undefined,
  })
})
