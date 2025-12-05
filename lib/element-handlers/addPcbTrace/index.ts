import type { PcbTrace } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { parseRouteSegments } from "./parseRouteSegments"
import { generateTracePolygons } from "./generateTracePolygons"
import { unifyTracePolygons } from "./unifyTracePolygons"

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

  // Parse route into layer segments
  const layerSegments = parseRouteSegments(trace)

  // Generate normal trace polygons
  const normalPolygons = generateTracePolygons({
    layerSegments,
    width: traceWidth,
    origin,
    includeLayers,
  })

  for (const [layer, polygons] of normalPolygons.entries()) {
    const { result } = unifyTracePolygons({
      polygons,
      traceId: trace.pcb_trace_id,
      layer,
    })

    const netGeoms = layer === "top" ? topNetGeoms : bottomNetGeoms
    if (Array.isArray(result)) {
      for (const poly of result) {
        netGeoms.get(netId)?.push(poly)
      }
    } else {
      netGeoms.get(netId)?.push(result)
    }
  }

  // Generate margin trace polygons if traceMargin is enabled
  if (traceMargin > 0) {
    const marginPolygons = generateTracePolygons({
      layerSegments,
      width: traceWidth + 2 * traceMargin,
      origin,
      includeLayers,
    })

    for (const [layer, polygons] of marginPolygons.entries()) {
      const { result } = unifyTracePolygons({
        polygons,
        traceId: trace.pcb_trace_id,
        layer,
      })

      const marginNetGeoms =
        layer === "top" ? topMarginNetGeoms : bottomMarginNetGeoms
      if (Array.isArray(result)) {
        for (const poly of result) {
          marginNetGeoms.get(netId)?.push(poly)
        }
      } else {
        marginNetGeoms.get(netId)?.push(result)
      }
    }
  }
}
