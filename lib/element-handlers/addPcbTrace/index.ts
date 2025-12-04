import type { PcbTrace } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import Flatten, { BooleanOperations } from "@flatten-js/core"
import { circleToPolygon } from "./circle-to-polygon"

export const addPcbTrace = (trace: PcbTrace, ctx: ConvertContext) => {
  const {
    topNetGeoms,
    bottomNetGeoms,
    topMarginNetGeoms,
    bottomMarginNetGeoms,
    connMap,
    origin,
    includeCopper,
    includeLayers,
    traceMargin,
  } = ctx

  // Only include traces when including copper
  // Traces are NOT included in soldermask-only mode to prevent accidental bridging
  if (!includeCopper) {
    return
  }

  const netId = connMap.getNetConnectedToId(
    trace.source_trace_id ?? trace.pcb_trace_id,
  )

  if (!netId) {
    // Skip traces that are not connected to any net
    // This can happen for traces without a source_trace_id
    return
  }

  if (!trace.route || trace.route.length < 2) {
    return
  }

  const { route } = trace
  const wirePoint = route.find((point) => {
    if (!("route_type" in point)) return true
    return point.route_type === "wire"
  })
  const traceWidth = (wirePoint as any)?.width ?? 0.15

  // Group consecutive wire segments by layer
  // When we hit a via, we start a new segment on the new layer
  const layerSegments = new Map<
    "top" | "bottom",
    Array<Array<{ x: number; y: number }>>
  >()

  let currentSegment: Array<{ x: number; y: number }> = []
  let currentLayer: "top" | "bottom" | null = null

  for (const point of route) {
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

  // Helper function to generate trace polygons with a given width
  const generateTracePolygons = (width: number) => {
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

  // Generate normal trace polygons
  const normalPolygons = generateTracePolygons(traceWidth)

  for (const [layer, polygons] of normalPolygons.entries()) {
    if (polygons.length === 0) continue

    try {
      let tracePolygon = polygons[0]!
      for (let i = 1; i < polygons.length; i++) {
        const poly = polygons[i]
        if (poly) {
          tracePolygon = BooleanOperations.unify(tracePolygon, poly)
        }
      }

      const netGeoms = layer === "top" ? topNetGeoms : bottomNetGeoms
      netGeoms.get(netId)?.push(tracePolygon)
    } catch (error) {
      console.warn(
        `Failed to union trace polygons for trace ${trace.pcb_trace_id} on layer ${layer}:`,
        error,
      )
      // Push individual polygons if union fails
      const netGeoms = layer === "top" ? topNetGeoms : bottomNetGeoms
      for (const poly of polygons) {
        netGeoms.get(netId)?.push(poly)
      }
    }
  }

  // Generate margin trace polygons if traceMargin is enabled
  if (traceMargin > 0) {
    const marginPolygons = generateTracePolygons(traceWidth + 2 * traceMargin)

    for (const [layer, polygons] of marginPolygons.entries()) {
      if (polygons.length === 0) continue

      try {
        let tracePolygon = polygons[0]!
        for (let i = 1; i < polygons.length; i++) {
          const poly = polygons[i]
          if (poly) {
            tracePolygon = BooleanOperations.unify(tracePolygon, poly)
          }
        }

        const marginNetGeoms =
          layer === "top" ? topMarginNetGeoms : bottomMarginNetGeoms
        marginNetGeoms.get(netId)?.push(tracePolygon)
      } catch (error) {
        console.warn(
          `Failed to union margin trace polygons for trace ${trace.pcb_trace_id} on layer ${layer}:`,
          error,
        )
        // Push individual polygons if union fails
        const marginNetGeoms =
          layer === "top" ? topMarginNetGeoms : bottomMarginNetGeoms
        for (const poly of polygons) {
          marginNetGeoms.get(netId)?.push(poly)
        }
      }
    }
  }
}
