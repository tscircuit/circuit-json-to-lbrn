import type { PcbTrace } from "circuit-json"

/**
 * Groups consecutive wire segments by layer
 * When we hit a via, we start a new segment on the new layer
 */
export const parseRouteSegments = (
  trace: PcbTrace,
): Map<"top" | "bottom", Array<Array<{ x: number; y: number }>>> => {
  const layerSegments = new Map<
    "top" | "bottom",
    Array<Array<{ x: number; y: number }>>
  >()

  if (!trace.route || trace.route.length < 2) {
    return layerSegments
  }

  let currentSegment: Array<{ x: number; y: number }> = []
  let currentLayer: "top" | "bottom" | null = null

  for (const point of trace.route) {
    if ("route_type" in point && point.route_type === "via") {
      // Via marks end of current segment - save it
      if (currentLayer && currentSegment.length > 0) {
        if (!layerSegments.has(currentLayer)) {
          layerSegments.set(currentLayer, [])
        }
        layerSegments.get(currentLayer)!.push(currentSegment)
      }
      // Reset for next segment
      currentSegment = []
      currentLayer = null
      continue
    }

    // Treat points without route_type as wire points (default behavior)
    const isWirePoint = !("route_type" in point) || point.route_type === "wire"
    if (isWirePoint && "layer" in point && point.layer) {
      const pointLayer = point.layer as "top" | "bottom" | string
      if (pointLayer !== "top" && pointLayer !== "bottom") {
        continue // Skip inner layers
      }

      // If layer changed (shouldn't happen without via, but handle it)
      if (currentLayer !== null && currentLayer !== pointLayer) {
        // Save current segment
        if (currentSegment.length > 0) {
          if (!layerSegments.has(currentLayer)) {
            layerSegments.set(currentLayer, [])
          }
          layerSegments.get(currentLayer)!.push(currentSegment)
        }
        // Start new segment
        currentSegment = []
      }

      currentLayer = pointLayer
      currentSegment.push({ x: point.x, y: point.y })
    }
  }

  // Save final segment
  if (currentLayer && currentSegment.length > 0) {
    if (!layerSegments.has(currentLayer)) {
      layerSegments.set(currentLayer, [])
    }
    layerSegments.get(currentLayer)!.push(currentSegment)
  }

  return layerSegments
}
