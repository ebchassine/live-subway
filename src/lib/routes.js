export const ROUTE_COLORS = {
  1: "#EE352E",
  2: "#EE352E",
  3: "#EE352E",
  4: "#00933C",
  5: "#00933C",
  6: "#00933C",
  7: "#B933AD",
  A: "#0039A6",
  C: "#0039A6",
  E: "#0039A6",
  B: "#FF6319",
  D: "#FF6319",
  F: "#FF6319",
  M: "#FF6319",
  G: "#6CBE45",
  J: "#996633",
  Z: "#996633",
  L: "#A7A9AC",
  N: "#FCCC0A",
  Q: "#FCCC0A",
  R: "#FCCC0A",
  W: "#FCCC0A",
  S: "#808183",
}

export const ROUTE_TEXT_COLORS = {
  1: "#FFFFFF",
  2: "#FFFFFF",
  3: "#FFFFFF",
  4: "#FFFFFF",
  5: "#FFFFFF",
  6: "#FFFFFF",
  7: "#FFFFFF",
  A: "#FFFFFF",
  C: "#FFFFFF",
  E: "#FFFFFF",
  B: "#FFFFFF",
  D: "#FFFFFF",
  F: "#FFFFFF",
  M: "#FFFFFF",
  G: "#FFFFFF",
  J: "#FFFFFF",
  Z: "#FFFFFF",
  L: "#FFFFFF",
  N: "#000000",
  Q: "#000000",
  R: "#000000",
  W: "#000000",
  S: "#FFFFFF",
}

export const FEED_MAPPING = {
  1: "123456S",
  2: "123456S",
  3: "123456S",
  4: "123456S",
  5: "123456S",
  6: "123456S",
  S: "123456S",
  A: "ACE",
  C: "ACE",
  E: "ACE",
  B: "BDFM",
  D: "BDFM",
  F: "BDFM",
  M: "BDFM",
  G: "G",
  J: "JZ",
  Z: "JZ",
  L: "L",
  N: "NQRW",
  Q: "NQRW",
  R: "NQRW",
  W: "NQRW",
}

export const AVAILABLE_ROUTES = [
  { id: "1", name: "1 Train", color: ROUTE_COLORS["1"] },
  { id: "4", name: "4 Train", color: ROUTE_COLORS["4"] },
  { id: "6", name: "6 Train", color: ROUTE_COLORS["6"] },
  { id: "A", name: "A Train", color: ROUTE_COLORS["A"] },
  { id: "C", name: "C Train", color: ROUTE_COLORS["C"] },
  { id: "E", name: "E Train", color: ROUTE_COLORS["E"] },
  { id: "L", name: "L Train", color: ROUTE_COLORS["L"] },
  { id: "N", name: "N Train", color: ROUTE_COLORS["N"] },
  { id: "Q", name: "Q Train", color: ROUTE_COLORS["Q"] },
  { id: "R", name: "R Train", color: ROUTE_COLORS["R"] },
]

export function getRouteColor(routeId) {
  return ROUTE_COLORS[routeId] || "#808183"
}

export function getRouteTextColor(routeId) {
  return ROUTE_TEXT_COLORS[routeId] || "#FFFFFF"
}

export function getFeedForRoute(routeId) {
  return FEED_MAPPING[routeId] || "123456S"
}
