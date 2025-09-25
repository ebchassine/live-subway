export interface Vehicle {
  trainId: string
  routeId: string
  lat: number
  lon: number
  bearing?: number
  timestamp: number
  tripId?: string
  status?: "INCOMING_AT" | "STOPPED_AT" | "IN_TRANSIT_TO"
  stopId?: string
}

export interface Stop {
  stopId: string
  name: string
  lat: number
  lon: number
  routeIds?: string[]
}

export interface Shape {
  shapeId: string
  points: Array<{
    lat: number
    lon: number
    sequence: number
  }>
}

export interface Route {
  routeId: string
  routeShortName: string
  routeLongName: string
  routeColor: string
  routeTextColor: string
  feed: string
}

export interface Trip {
  tripId: string
  routeId: string
  shapeId: string
  directionId: number
  tripHeadsign?: string
}

export interface FeedMapping {
  [key: string]: string
}

export interface ApiResponse<T> {
  data: T
  timestamp: number
  error?: string
}
