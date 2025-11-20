import Flatten from "@flatten-js/core"
const { Polygon, BooleanOperations } = Flatten

/**
 * Union multiple polygons into a single unified shape
 * Returns an array of polygons (could be multiple if there are separate islands)
 */
export function unionPolygons(polygons: Polygon[]): Polygon[] {
  if (polygons.length === 0) return []
  if (polygons.length === 1) return polygons

  // Start with the first polygon
  let result = polygons[0]

  // Union each subsequent polygon
  for (let i = 1; i < polygons.length; i++) {
    try {
      result = BooleanOperations.unify(result, polygons[i])
    } catch (error) {
      console.warn("Failed to union polygons:", error)
      // If union fails, continue with what we have
    }
  }

  // Check if result contains multiple separate islands
  const islands = splitIntoIslands(result)
  return islands
}

/**
 * Detect and split a polygon into separate islands if it's not fully connected
 * For now, we'll use the faces of the polygon which represent separate contours
 */
function splitIntoIslands(polygon: Polygon): Polygon[] {
  const faces = polygon.faces

  if (faces.size <= 1) {
    return [polygon]
  }

  // Multiple faces means multiple islands
  const islands: Polygon[] = []
  for (const face of faces) {
    try {
      // Create a new polygon from each face
      const facePolygon = new Polygon()
      facePolygon.addFace(face.edges)
      islands.push(facePolygon)
    } catch (error) {
      console.warn("Failed to create island from face:", error)
    }
  }

  return islands.length > 0 ? islands : [polygon]
}
