import type { PcbTrace } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import Flatten, { BooleanOperations } from "@flatten-js/core"
import { circleToPolygon } from "./circle-to-polygon"

export const addPcbTrace = (trace: PcbTrace, ctx: ConvertContext) => {
  const { netGeoms, connMap, origin } = ctx

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

  const polygons: Flatten.Polygon[] = []

  // Add circles for each vertex
  for (const routePoint of route) {
    const circle = new Flatten.Circle(
      new Flatten.Point(routePoint.x + origin.x, routePoint.y + origin.y),
      traceWidth / 2,
    )
    polygons.push(circleToPolygon(circle))
  }

  // Add rectangles for each segment
  for (let i = 0; i < route.length - 1; i++) {
    const p1 = route[i]
    const p2 = route[i + 1]

    if (!p1 || !p2) continue

    const segmentLength = Math.hypot(p1.x - p2.x, p1.y - p2.y)
    if (segmentLength === 0) continue

    const centerX = (p1.x + p2.x) / 2 + origin.x
    const centerY = (p1.y + p2.y) / 2 + origin.y
    const rotationDeg = (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI

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
      new Flatten.Polygon(rotatedCorners.map((p) => Flatten.point(p.x, p.y))),
    )
  }

  // Union all polygons together to create the final trace polygon
  if (polygons.length === 0) return

  let tracePolygon = polygons[0]!

  for (let i = 1; i < polygons.length; i++) {
    const poly = polygons[i]
    if (poly) {
      tracePolygon = BooleanOperations.unify(tracePolygon, poly)
    }
  }

  netGeoms.get(netId)?.push(tracePolygon)
}
