import type Flatten from "@flatten-js/core"

/**
 * Returns trace polygons for a trace.
 * Since each segment is now generated as a complete outline polygon,
 * no boolean union is needed within a single trace.
 * Multiple polygons may exist if the trace has multiple disconnected segments
 * (e.g., due to layer changes via vias).
 */
export const unifyTracePolygons = ({
  polygons,
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

  // Return all polygons - they represent separate segments that don't need to be unified
  return { success: true, result: polygons }
}
