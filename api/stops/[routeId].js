import { promises as fs } from "fs"
import path from "path"

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type")

  if (req.method === "OPTIONS") {
    return res.status(200).end()
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" })
  }

  const { routeId } = req.query

  if (!routeId) {
    return res.status(400).json({ error: "Route ID is required" })
  }

  try {
    const filePath = path.join(process.cwd(), "data", `stops.${routeId}.json`)

    try {
      const fileContent = await fs.readFile(filePath, "utf8")
      const stops = JSON.parse(fileContent)

      res.status(200).json({
        data: stops,
        timestamp: Date.now(),
      })
    } catch (fileError) {
      if (fileError.code === "ENOENT") {
        return res.status(404).json({
          error: `Stop data not found for route ${routeId}`,
          message: "Run the preprocessing script to generate stop data",
        })
      }
      throw fileError
    }
  } catch (error) {
    console.error("Error reading stop data:", error)
    res.status(500).json({
      error: "Failed to read stop data",
      message: error.message,
    })
  }
}
