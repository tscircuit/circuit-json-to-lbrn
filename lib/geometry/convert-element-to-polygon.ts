import Flatten from "@flatten-js/core"
const { Polygon, point } = Flatten
import type {
  PcbSmtPad,
  PcbTrace,
  PcbPlatedHole,
  PcbSmtPadRect,
  PcbPlatedHoleCircle,
} from "circuit-json"

/**
 * Convert a rectangular SMT pad to a flatten-js Polygon
 */
export function rectPadToPolygon(pad: PcbSmtPadRect): Polygon {
  const halfWidth = pad.width / 2
  const halfHeight = pad.height / 2
  const cx = pad.x
  const cy = pad.y

  const points = [
    point(cx - halfWidth, cy - halfHeight), // Top-left
    point(cx + halfWidth, cy - halfHeight), // Top-right
    point(cx + halfWidth, cy + halfHeight), // Bottom-right
    point(cx - halfWidth, cy + halfHeight), // Bottom-left
  ]

  return new Polygon(points)
}

/**
 * Convert a circular plated hole to a flatten-js Polygon (approximated)
 */
export function circlePlatedHoleToPolygon(hole: PcbPlatedHoleCircle): Polygon {
  const radius = hole.outer_diameter / 2
  const cx = hole.x
  const cy = hole.y

  // Create polygon approximation of circle with 64 segments
  const numSegments = 64
  const points = []

  for (let i = 0; i < numSegments; i++) {
    const angle = (i / numSegments) * 2 * Math.PI
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    points.push(point(x, y))
  }

  return new Polygon(points)
}

/**
 * Convert a PCB trace to a flatten-js Polygon
 * Creates an outline by offsetting the centerline perpendicular to trace direction
 */
export function traceToPolygon(trace: PcbTrace): Polygon | null {
  if (!trace.route || trace.route.length < 2) {
    return null
  }

  const route = trace.route
  const leftSide: Array<{ x: number; y: number }> = []
  const rightSide: Array<{ x: number; y: number }> = []

  // Calculate perpendicular offsets for each segment (same logic as addPcbTrace)
  for (let i = 0; i < route.length; i++) {
    const pt = route[i]
    if (!pt || !("width" in pt)) continue
    const halfWidth = pt.width / 2

    let perpX = 0
    let perpY = 0

    if (i === 0) {
      // First point - use direction to next point
      const next = route[i + 1]
      const dx = next.x - pt.x
      const dy = next.y - pt.y
      const len = Math.sqrt(dx * dx + dy * dy)
      perpX = -dy / len
      perpY = dx / len
    } else if (i === route.length - 1) {
      // Last point - use direction from previous point
      const prev = route[i - 1]
      const dx = pt.x - prev.x
      const dy = pt.y - prev.y
      const len = Math.sqrt(dx * dx + dy * dy)
      perpX = -dy / len
      perpY = dx / len
    } else {
      // Middle points - average the perpendiculars from both segments
      const prev = route[i - 1]
      const next = route[i + 1]

      const dx1 = pt.x - prev.x
      const dy1 = pt.y - prev.y
      const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
      const perp1X = -dy1 / len1
      const perp1Y = dx1 / len1

      const dx2 = next.x - pt.x
      const dy2 = next.y - pt.y
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
      const perp2X = -dy2 / len2
      const perp2Y = dx2 / len2

      perpX = (perp1X + perp2X) / 2
      perpY = (perp1Y + perp2Y) / 2

      const perpLen = Math.sqrt(perpX * perpX + perpY * perpY)
      perpX /= perpLen
      perpY /= perpLen
    }

    leftSide.push({
      x: pt.x + perpX * halfWidth,
      y: pt.y + perpY * halfWidth,
    })
    rightSide.push({
      x: pt.x - perpX * halfWidth,
      y: pt.y - perpY * halfWidth,
    })
  }

  // Combine to create closed polygon
  const allPoints = [...leftSide, ...rightSide.reverse()].map((p) =>
    point(p.x, p.y),
  )

  return new Polygon(allPoints)
}

/**
 * Convert any supported element to a Polygon
 */
export function elementToPolygon(
  element: PcbSmtPad | PcbTrace | PcbPlatedHole,
): Polygon | null {
  if (element.type === "pcb_smtpad") {
    if (element.shape === "rect") {
      return rectPadToPolygon(element)
    }
    // TODO: Support other pad shapes (circle, etc.)
    return null
  } else if (element.type === "pcb_trace") {
    return traceToPolygon(element)
  } else if (element.type === "pcb_plated_hole") {
    if (element.shape === "circle") {
      return circlePlatedHoleToPolygon(element)
    }
    // TODO: Support other hole shapes
    return null
  }

  return null
}
