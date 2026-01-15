import type { PcbTrace } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { splitRouteSegmentsByLayer } from "./splitRouteSegmentsByLayer"
import { generateTracePolygons } from "./generateTracePolygons"
import { unifyTracePolygons } from "./unifyTracePolygons"
import Flatten from "@flatten-js/core"

/**
 * Creates a circular polygon at the given center point.
 * Used to ensure traces overlap at junction points.
 */
const createCirclePolygon = (
  center: { x: number; y: number },
  radius: number,
  numPoints = 16,
): Flatten.Polygon => {
  const points: Flatten.Point[] = []
  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints
    points.push(
      Flatten.point(
        center.x + radius * Math.cos(angle),
        center.y + radius * Math.sin(angle),
      ),
    )
  }
  return new Flatten.Polygon(points)
}

export const addPcbTrace = (trace: PcbTrace, ctx: ConvertContext) => {
  const {
    topCutNetGeoms,
    bottomCutNetGeoms,
    topScanNetGeoms,
    bottomScanNetGeoms,
    topCopperFillNetGeoms,
    bottomCopperFillNetGeoms,
    connMap,
    origin,
    includeCopper,
    includeLayers,
    traceMargin,
    copperFillExpansion,
  } = ctx

  // Only include traces when including copper
  if (!includeCopper) {
    return
  }

  const netId = connMap.getNetConnectedToId(
    trace.source_trace_id ?? trace.pcb_trace_id,
  )

  if (!netId) {
    return
  }

  if (!trace.route || trace.route.length < 2) {
    return
  }

  // Get trace width from route
  const wirePoint = trace.route.find((point) => {
    if (!("route_type" in point)) return true
    return point.route_type === "wire"
  })
  const traceWidth = (wirePoint as any)?.width ?? 0.15

  // Split route into segments by layer
  const layerSegments = splitRouteSegmentsByLayer(trace)

  // Generate normal trace polygons
  const normalPolygons = generateTracePolygons({
    layerSegments,
    width: traceWidth,
    origin,
    includeLayers,
  })

  // Store CUT geometries (normal trace outlines)
  for (const [layer, polygons] of normalPolygons.entries()) {
    const { result } = unifyTracePolygons({
      polygons,
      traceId: trace.pcb_trace_id,
      layer,
    })

    const cutNetGeoms = layer === "top" ? topCutNetGeoms : bottomCutNetGeoms
    // Also add to global copper geometry list for copper fill subtraction
    const allCopperGeoms =
      layer === "top" ? ctx.topAllCopperGeoms : ctx.bottomAllCopperGeoms

    if (Array.isArray(result)) {
      for (const poly of result) {
        cutNetGeoms.get(netId)?.push(poly)
        allCopperGeoms.push(poly)
      }
    } else {
      cutNetGeoms.get(netId)?.push(result)
      allCopperGeoms.push(result)
    }

    // Add circular pads at trace endpoints to ensure overlap at junctions
    // This is crucial for boolean union to properly merge traces that share endpoints
    // Use a slightly larger radius (1.1x) to ensure proper overlap despite floating point issues
    const segments = layerSegments.get(layer)
    if (segments) {
      for (const segment of segments) {
        if (segment.length >= 2) {
          const firstPoint = segment[0]!
          const lastPoint = segment[segment.length - 1]!
          const radius = (traceWidth / 2) * 1.1 // Slightly larger for reliable overlap

          // Add circle at start point (translated by origin)
          const startCircle = createCirclePolygon(
            { x: firstPoint.x + origin.x, y: firstPoint.y + origin.y },
            radius,
          )
          cutNetGeoms.get(netId)?.push(startCircle)
          allCopperGeoms.push(startCircle)

          // Add circle at end point (translated by origin)
          const endCircle = createCirclePolygon(
            { x: lastPoint.x + origin.x, y: lastPoint.y + origin.y },
            radius,
          )
          cutNetGeoms.get(netId)?.push(endCircle)
          allCopperGeoms.push(endCircle)
        }
      }
    }
  }

  // Store SCAN geometries (trace + margin outlines) if traceMargin is enabled
  if (traceMargin > 0) {
    const scanPolygons = generateTracePolygons({
      layerSegments,
      width: traceWidth + 2 * traceMargin,
      origin,
      includeLayers,
    })

    for (const [layer, polygons] of scanPolygons.entries()) {
      const { result } = unifyTracePolygons({
        polygons,
        traceId: trace.pcb_trace_id,
        layer,
      })

      const scanNetGeoms =
        layer === "top" ? topScanNetGeoms : bottomScanNetGeoms
      if (Array.isArray(result)) {
        for (const poly of result) {
          scanNetGeoms.get(netId)?.push(poly)
        }
      } else {
        scanNetGeoms.get(netId)?.push(result)
      }
    }
  }

  // Store copper fill geometries (trace + copperFillExpansion) if enabled
  if (copperFillExpansion > 0) {
    const copperFillPolygons = generateTracePolygons({
      layerSegments,
      width: traceWidth + 2 * copperFillExpansion,
      origin,
      includeLayers,
    })

    for (const [layer, polygons] of copperFillPolygons.entries()) {
      const { result } = unifyTracePolygons({
        polygons,
        traceId: trace.pcb_trace_id,
        layer,
      })

      const copperFillNetGeoms =
        layer === "top" ? topCopperFillNetGeoms : bottomCopperFillNetGeoms
      if (Array.isArray(result)) {
        for (const poly of result) {
          copperFillNetGeoms.get(netId)?.push(poly)
        }
      } else {
        copperFillNetGeoms.get(netId)?.push(result)
      }

      // Add expanded circular pads at trace endpoints for copper fill
      const segments = layerSegments.get(layer)
      if (segments) {
        for (const segment of segments) {
          if (segment.length >= 2) {
            const firstPoint = segment[0]!
            const lastPoint = segment[segment.length - 1]!
            const radius = (traceWidth / 2 + copperFillExpansion) * 1.1

            const startCircle = createCirclePolygon(
              { x: firstPoint.x + origin.x, y: firstPoint.y + origin.y },
              radius,
            )
            copperFillNetGeoms.get(netId)?.push(startCircle)

            const endCircle = createCirclePolygon(
              { x: lastPoint.x + origin.x, y: lastPoint.y + origin.y },
              radius,
            )
            copperFillNetGeoms.get(netId)?.push(endCircle)
          }
        }
      }
    }
  }
}
