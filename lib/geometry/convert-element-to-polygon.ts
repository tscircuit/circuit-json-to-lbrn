import Flatten from "@flatten-js/core"
const { Polygon: FlattenPolygon, point } = Flatten
type Polygon = InstanceType<typeof FlattenPolygon>
import type {
  PcbSmtPad,
  PcbSmtPadCircle,
  PcbSmtPadPill,
  PcbSmtPadPolygon,
  PcbTrace,
  PcbPlatedHole,
  PcbSmtPadRect,
  PcbSmtPadRotatedPill,
  PcbSmtPadRotatedRect,
  PcbPlatedHoleCircle,
} from "circuit-json"

interface PolygonPoint {
  x: number
  y: number
}

function pointsToPolygon(points: PolygonPoint[]): Polygon {
  return new FlattenPolygon(points.map((p) => point(p.x, p.y)))
}

function rotatePoints(
  points: PolygonPoint[],
  cx: number,
  cy: number,
  ccwRotation: number,
): PolygonPoint[] {
  const theta = (ccwRotation * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)

  return points.map((p) => {
    const dx = p.x - cx
    const dy = p.y - cy
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    }
  })
}

function circlePoints(
  cx: number,
  cy: number,
  radius: number,
  numSegments = 64,
): PolygonPoint[] {
  const points: PolygonPoint[] = []

  for (let i = 0; i < numSegments; i++) {
    const angle = (i / numSegments) * 2 * Math.PI
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    })
  }

  return points
}

/**
 * Convert a rectangular SMT pad to a flatten-js Polygon
 */
export function rectPadToPolygon(pad: PcbSmtPadRect): Polygon {
  const halfWidth = pad.width / 2
  const halfHeight = pad.height / 2
  const cx = pad.x
  const cy = pad.y

  const points = [
    { x: cx - halfWidth, y: cy - halfHeight }, // Top-left
    { x: cx + halfWidth, y: cy - halfHeight }, // Top-right
    { x: cx + halfWidth, y: cy + halfHeight }, // Bottom-right
    { x: cx - halfWidth, y: cy + halfHeight }, // Bottom-left
  ]

  return pointsToPolygon(points)
}

export function rotatedRectPadToPolygon(pad: PcbSmtPadRotatedRect): Polygon {
  const halfWidth = pad.width / 2
  const halfHeight = pad.height / 2
  const cx = pad.x
  const cy = pad.y

  const points = [
    { x: cx - halfWidth, y: cy - halfHeight },
    { x: cx + halfWidth, y: cy - halfHeight },
    { x: cx + halfWidth, y: cy + halfHeight },
    { x: cx - halfWidth, y: cy + halfHeight },
  ]

  return pointsToPolygon(rotatePoints(points, cx, cy, pad.ccw_rotation))
}

export function circlePadToPolygon(pad: PcbSmtPadCircle): Polygon {
  return pointsToPolygon(circlePoints(pad.x, pad.y, pad.radius))
}

export function pillPadToPolygon(
  pad: PcbSmtPadPill | PcbSmtPadRotatedPill,
): Polygon {
  const cx = pad.x
  const cy = pad.y
  const halfWidth = pad.width / 2
  const halfHeight = pad.height / 2
  const radius = Math.min(pad.radius, halfWidth, halfHeight)
  const segmentCount = 24
  const points: PolygonPoint[] = []

  if (pad.width >= pad.height) {
    const rightCx = cx + halfWidth - radius
    const leftCx = cx - halfWidth + radius

    for (let i = 0; i <= segmentCount; i++) {
      const angle = -Math.PI / 2 + (i / segmentCount) * Math.PI
      points.push({
        x: rightCx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      })
    }

    for (let i = 0; i <= segmentCount; i++) {
      const angle = Math.PI / 2 + (i / segmentCount) * Math.PI
      points.push({
        x: leftCx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      })
    }
  } else {
    const topCy = cy + halfHeight - radius
    const bottomCy = cy - halfHeight + radius

    for (let i = 0; i <= segmentCount; i++) {
      const angle = (i / segmentCount) * Math.PI
      points.push({
        x: cx + radius * Math.cos(angle),
        y: topCy + radius * Math.sin(angle),
      })
    }

    for (let i = 0; i <= segmentCount; i++) {
      const angle = Math.PI + (i / segmentCount) * Math.PI
      points.push({
        x: cx + radius * Math.cos(angle),
        y: bottomCy + radius * Math.sin(angle),
      })
    }
  }

  const rotatedPoints =
    pad.shape === "rotated_pill"
      ? rotatePoints(points, cx, cy, pad.ccw_rotation)
      : points

  return pointsToPolygon(rotatedPoints)
}

export function polygonPadToPolygon(pad: PcbSmtPadPolygon): Polygon {
  return pointsToPolygon(pad.points)
}

/**
 * Convert a circular plated hole to a flatten-js Polygon (approximated)
 */
export function circlePlatedHoleToPolygon(hole: PcbPlatedHoleCircle): Polygon {
  const radius = hole.outer_diameter / 2
  return pointsToPolygon(circlePoints(hole.x, hole.y, radius))
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

  return new FlattenPolygon(allPoints)
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
    if (element.shape === "rotated_rect") {
      return rotatedRectPadToPolygon(element)
    }
    if (element.shape === "circle") {
      return circlePadToPolygon(element)
    }
    if (element.shape === "pill" || element.shape === "rotated_pill") {
      return pillPadToPolygon(element)
    }
    if (element.shape === "polygon") {
      return polygonPadToPolygon(element)
    }
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
