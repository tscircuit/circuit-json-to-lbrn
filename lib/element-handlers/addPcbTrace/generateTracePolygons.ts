import Flatten from "@flatten-js/core"
import { circleToPolygon } from "./circle-to-polygon"

/**
 * Generates trace polygons with a given width from route segments
 * Creates circles at each vertex and rectangles for line segments
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

      // Add circles for each vertex in this segment
      for (const routePoint of points) {
        const circle = new Flatten.Circle(
          new Flatten.Point(routePoint.x + origin.x, routePoint.y + origin.y),
          width / 2,
        )
        polygons.push(circleToPolygon(circle))
      }

      // Add rectangles for each line segment
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i]
        const p2 = points[i + 1]

        if (!p1 || !p2) continue

        const segmentLength = Math.hypot(p1.x - p2.x, p1.y - p2.y)
        if (segmentLength === 0) continue

        const centerX = (p1.x + p2.x) / 2 + origin.x
        const centerY = (p1.y + p2.y) / 2 + origin.y
        const rotationDeg =
          (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI

        const w2 = segmentLength / 2
        const h2 = width / 2

        const angleRad = (rotationDeg * Math.PI) / 180
        const cosAngle = Math.cos(angleRad)
        const sinAngle = Math.sin(angleRad)

        const corners = [
          { x: -w2, y: -h2 },
          { x: w2, y: -h2 },
          { x: w2, y: h2 },
          { x: -w2, y: h2 },
        ]

        const rotatedCorners = corners.map((p) => ({
          x: centerX + p.x * cosAngle - p.y * sinAngle,
          y: centerY + p.x * sinAngle + p.y * cosAngle,
        }))

        polygons.push(
          new Flatten.Polygon(
            rotatedCorners.map((p) => Flatten.point(p.x, p.y)),
          ),
        )
      }
    }

    if (polygons.length > 0) {
      layerPolygons.set(layer, polygons)
    }
  }

  return layerPolygons
}
