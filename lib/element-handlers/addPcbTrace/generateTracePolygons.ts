import Flatten from "@flatten-js/core"
import { generateTraceOutline } from "./generateTraceOutline"

/**
 * Generates trace polygons with a given width from route segments.
 * Uses direct outline generation to avoid boolean operations.
 * Each continuous segment becomes a single polygon with rounded caps and corners.
 */
export const generateTracePolygons = ({
  layerSegments,
  width,
  origin,
  includeLayers,
}: {
  layerSegments: Map<"top" | "bottom", Array<Array<{ x: number; y: number }>>>
  width: number
  origin: { x: number; y: number }
  includeLayers: Array<"top" | "bottom">
}): Map<"top" | "bottom", Flatten.Polygon[]> => {
  const layerPolygons = new Map<"top" | "bottom", Flatten.Polygon[]>()

  for (const [layer, segments] of layerSegments.entries()) {
    if (!includeLayers.includes(layer)) {
      continue
    }

    const polygons: Flatten.Polygon[] = []

    for (const points of segments) {
      if (points.length < 2) continue

      // Translate points by origin
      const translatedPoints = points.map((p) => ({
        x: p.x + origin.x,
        y: p.y + origin.y,
      }))

      // Generate a single polygon outline for this segment
      const outline = generateTraceOutline({
        points: translatedPoints,
        width,
      })

      if (outline) {
        polygons.push(outline)
      }
    }

    if (polygons.length > 0) {
      layerPolygons.set(layer, polygons)
    }
  }

  return layerPolygons
}
