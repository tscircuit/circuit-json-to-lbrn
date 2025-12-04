import type { PcbTrace } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import Flatten, { BooleanOperations } from "@flatten-js/core"
import { circleToPolygon } from "./circle-to-polygon"

export const addPcbTrace = (trace: PcbTrace, ctx: ConvertContext) => {
  const {
    topNetGeoms,
    bottomNetGeoms,
    connMap,
    origin,
    includeCopper,
    includeLayers,
  } = ctx

  // Only include traces when including copper
  // Traces are NOT included in soldermask-only mode to prevent accidental bridging
  if (!includeCopper) {
    return
  }

  const netId = connMap.getNetConnectedToId(
    trace.source_trace_id ?? trace.pcb_trace_id,
  )!

  if (!netId) {
    console.warn(`Trace ${trace.pcb_trace_id} is not connected to any net`)
    return
  }

  if (!trace.route || trace.route.length < 2) {
    console.warn(`Trace ${trace.pcb_trace_id} has insufficient route points`)
    return
  }

  const { route } = trace
  const traceWidth =
    route.find((point) => point.route_type === "wire")?.width ?? 0.15

  // Group consecutive wire segments by layer
  // When we hit a via, we start a new segment on the new layer
  const layerSegments = new Map<
    "top" | "bottom",
    Array<Array<{ x: number; y: number }>>
  >()

  let currentSegment: Array<{ x: number; y: number }> = []
  let currentLayer: "top" | "bottom" | null = null

  for (const point of route) {
    if (point.route_type === "via") {
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

    if (point.route_type === "wire" && point.layer) {
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

  // Process each layer
  for (const [layer, segments] of layerSegments.entries()) {
    if (!includeLayers.includes(layer)) {
      continue
    }

    // Combine all segments for this layer into one set of polygons
    const polygons: Flatten.Polygon[] = []

    for (const points of segments) {
      if (points.length < 2) continue

      // Add circles for each vertex in this segment
      for (const routePoint of points) {
        const circle = new Flatten.Circle(
          new Flatten.Point(routePoint.x + origin.x, routePoint.y + origin.y),
          traceWidth / 2,
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
        const h2 = traceWidth / 2

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

    // Union all polygons together to create the final trace polygon for this layer
    if (polygons.length === 0) continue

    let tracePolygon = polygons[0]!

    for (let i = 1; i < polygons.length; i++) {
      const poly = polygons[i]
      if (poly) {
        tracePolygon = BooleanOperations.unify(tracePolygon, poly)
      }
    }

    const netGeoms = layer === "top" ? topNetGeoms : bottomNetGeoms
    netGeoms.get(netId)?.push(tracePolygon)
  }
}
