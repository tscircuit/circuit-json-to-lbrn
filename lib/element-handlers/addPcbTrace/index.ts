import type { PcbTrace } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { segment, point, Polygon } from "@flatten-js/core"

export const addPcbTrace = (trace: PcbTrace, ctx: ConvertContext) => {
  const { netGeoms, connMap } = ctx

  const netId = connMap.getNetConnectedToId(trace.pcb_trace_id)!

  if (!trace.route || trace.route.length < 2) {
    console.warn(`Trace ${trace.pcb_trace_id} has insufficient route points`)
    return
  }

  // Filter for only wire route points (skip vias)
  const route = trace.route.filter((pt) => pt.route_type === "wire")

  if (route.length < 2) {
    console.warn(
      `Trace ${trace.pcb_trace_id} has insufficient wire route points`,
    )
    return
  }

  // Calculate perpendicular offsets for each segment to create trace outline
  const leftSide: Array<{ x: number; y: number }> = []
  const rightSide: Array<{ x: number; y: number }> = []

  for (let i = 0; i < route.length; i++) {
    const pt = route[i]!
    const halfWidth = pt.width / 2

    let perpX = 0
    let perpY = 0

    if (i === 0) {
      // First point - use direction to next point
      const next = route[i + 1]!
      const dx = next.x - pt.x
      const dy = next.y - pt.y
      const len = Math.sqrt(dx * dx + dy * dy)
      perpX = -dy / len
      perpY = dx / len
    } else if (i === route.length - 1) {
      // Last point - use direction from previous point
      const prev = route[i - 1]!
      const dx = pt.x - prev.x
      const dy = pt.y - prev.y
      const len = Math.sqrt(dx * dx + dy * dy)
      perpX = -dy / len
      perpY = dx / len
    } else {
      // Middle points - average the perpendiculars from both segments
      const prev = route[i - 1]!
      const next = route[i + 1]!

      // Perpendicular to previous segment
      const dx1 = pt.x - prev.x
      const dy1 = pt.y - prev.y
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
      const perp1X = -dy1 / len1
      const perp1Y = dx1 / len1

      // Perpendicular to next segment
      const dx2 = next.x - pt.x
      const dy2 = next.y - pt.y
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
      const perp2X = -dy2 / len2
      const perp2Y = dx2 / len2

      // Average the perpendiculars
      perpX = (perp1X + perp2X) / 2
      perpY = (perp1Y + perp2Y) / 2

      // Normalize
      const perpLen = Math.sqrt(perpX * perpX + perpY * perpY)
      perpX /= perpLen
      perpY /= perpLen
    }

    // Add offset points on both sides
    leftSide.push({
      x: pt.x + perpX * halfWidth,
      y: pt.y + perpY * halfWidth,
    })
    rightSide.push({
      x: pt.x - perpX * halfWidth,
      y: pt.y - perpY * halfWidth,
    })
  }

  // Combine left side going forward and right side going backward to create closed outline
  const outlinePoints = [...leftSide, ...rightSide.reverse()]

  // Create segments for the polygon
  const segments = []
  for (let i = 0; i < outlinePoints.length; i++) {
    const current = outlinePoints[i]!
    const next = outlinePoints[(i + 1) % outlinePoints.length]!
    segments.push(segment(point(current.x, current.y), point(next.x, next.y)))
  }

  // Create polygon and add face
  const polygon = new Polygon()
  polygon.addFace(segments)

  // Add polygon to netGeoms following the pattern from addRectSmtPad
  ctx.netGeoms.get(netId)?.push(polygon)
}
