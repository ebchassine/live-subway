export const FEED_URLS = {
  "123456S": "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs",
  "ACE":      "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace",
  "BDFM":     "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-bdfm",
  "G":        "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-g",
  "JZ":       "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-jz",
  "NQRW":     "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-nqrw",
  "L":        "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-l",
};

// Minimal mapping from routeId to feed group
export const FEED_MAPPING = {
  "1":"123456S","2":"123456S","3":"123456S","4":"123456S","5":"123456S","6":"123456S","S":"123456S",
  "A":"ACE","C":"ACE","E":"ACE",
  "B":"BDFM","D":"BDFM","F":"BDFM","M":"BDFM",
  "G":"G",
  "J":"JZ","Z":"JZ",
  "N":"NQRW","Q":"NQRW","R":"NQRW","W":"NQRW",
  "L":"L"
};

export function feedForRoute(routeId) {
  return FEED_MAPPING[routeId] || "123456S";
}
