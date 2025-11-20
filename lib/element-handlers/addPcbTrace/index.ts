import type { PcbTrace } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { ShapePath } from "lbrnts"
import offset from "@flatten-js/polygon-offset"

export const addPcbTrace = (trace: PcbTrace, ctx: ConvertContext) => {
  const { project, copperCutSetting, netGeoms, connMap } = ctx

  const netId = connMap.getNetConnectedToId(trace.pcb_trace_id)!

  if (!trace.route || trace.route.length < 2) {
    console.warn(`Trace ${trace.pcb_trace_id} has insufficient route points`)
    return
  }

  // // Create outline for the trace by offsetting the centerline
  // const verts: Array<{ x: number; y: number }> = []
  // const route = trace.route

  // // Calculate perpendicular offsets for each segment
  // const leftSide: Array<{ x: number; y: number }> = []
  // const rightSide: Array<{ x: number; y: number }> = []

  // for (let i = 0; i < route.length; i++) {
  //   const point = route[i]
  //   const halfWidth = point.width / 2

  //   let perpX = 0
  //   let perpY = 0

  //   if (i === 0) {
  //     // First point - use direction to next point
  //     const next = route[i + 1]
  //     const dx = next.x - point.x
  //     const dy = next.y - point.y
  //     const len = Math.sqrt(dx * dx + dy * dy)
  //     perpX = -dy / len
  //     perpY = dx / len
  //   } else if (i === route.length - 1) {
  //     // Last point - use direction from previous point
  //     const prev = route[i - 1]
  //     const dx = point.x - prev.x
  //     const dy = point.y - prev.y
  //     const len = Math.sqrt(dx * dx + dy * dy)
  //     perpX = -dy / len
  //     perpY = dx / len
  //   } else {
  //     // Middle points - average the perpendiculars from both segments
  //     const prev = route[i - 1]
  //     const next = route[i + 1]

  //     // Perpendicular to previous segment
  //     const dx1 = point.x - prev.x
  //     const dy1 = point.y - prev.y
  //     const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
  //     const perp1X = -dy1 / len1
  //     const perp1Y = dx1 / len1

  //     // Perpendicular to next segment
  //     const dx2 = next.x - point.x
  //     const dy2 = next.y - point.y
  //     const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
  //     const perp2X = -dy2 / len2
  //     const perp2Y = dx2 / len2

  //     // Average the perpendiculars
  //     perpX = (perp1X + perp2X) / 2
  //     perpY = (perp1Y + perp2Y) / 2

  //     // Normalize
  //     const perpLen = Math.sqrt(perpX * perpX + perpY * perpY)
  //     perpX /= perpLen
  //     perpY /= perpLen
  //   }

  //   // Add offset points on both sides
  //   leftSide.push({
  //     x: point.x + perpX * halfWidth,
  //     y: point.y + perpY * halfWidth,
  //   })
  //   rightSide.push({
  //     x: point.x - perpX * halfWidth,
  //     y: point.y - perpY * halfWidth,
  //   })
  // }

  // // Combine left side going forward and right side going backward to create closed path
  // verts.push(...leftSide)
  // verts.push(...rightSide.reverse())

  // // Create primitives (all line segments)
  // const prims = verts.map(() => ({ type: 0 }))

  // project.children.push(
  //   new ShapePath({
  //     cutIndex: copperCutSetting.index,
  //     verts,
  //     prims,
  //     isClosed: true,
  //   }),
  // )
}
