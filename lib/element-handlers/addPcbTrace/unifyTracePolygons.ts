import type Flatten from "@flatten-js/core"
import { BooleanOperations } from "@flatten-js/core"

/**
 * Unifies a list of polygons into a single polygon
 * Falls back to individual polygons if union fails
 */
export const unifyTracePolygons = ({
  polygons,
  traceId,
  layer,
}: {
  polygons: Flatten.Polygon[]
  traceId: string
  layer: "top" | "bottom"
}): { success: boolean; result: Flatten.Polygon | Flatten.Polygon[] } => {
  if (polygons.length === 0) {
    return { success: true, result: [] }
  }

  if (polygons.length === 1) {
    return { success: true, result: polygons[0]! }
  }

  try {
    let tracePolygon = polygons[0]!
    for (let i = 1; i < polygons.length; i++) {
      const poly = polygons[i]
      if (poly) {
        tracePolygon = BooleanOperations.unify(tracePolygon, poly)
      }
    }
    return { success: true, result: tracePolygon }
  } catch (error) {
    console.warn(
      `Failed to union trace polygons for trace ${traceId} on layer ${layer}:`,
      error,
    )
    return { success: false, result: polygons }
  }
}
