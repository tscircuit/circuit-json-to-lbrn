import Flatten from "@flatten-js/core"
const { Polygon, point } = Flatten
import type {
  PcbSmtPad,
  PcbTrace,
  PcbPlatedHole,
  PcbSmtPadRect,
  PcbSmtPadCircle,
  PcbSmtPadRotatedRect,
  PcbSmtPadPill,
  PcbSmtPadRotatedPill,
  PcbSmtPadPolygon,
  PcbPlatedHoleCircle,
} from "circuit-json"

interface PointLike {
  x: number
  y: number
}

const DEFAULT_CURVE_SEGMENTS = 64
const DEFAULT_ARC_SEGMENTS = 16

function pointsToPolygon(points: PointLike[]): Polygon {
  return new Polygon(points.map((p) => point(p.x, p.y)))
}

function rotatePointAroundCenter(
  p: PointLike,
  center: PointLike,
  ccwRotationDegrees: number,
): PointLike {
  if (ccwRotationDegrees === 0) return p

  const angle = (ccwRotationDegrees * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = p.x - center.x
  const dy = p.y - center.y

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

function rectPoints(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): PointLike[] {
  const halfWidth = width / 2
  const halfHeight = height / 2

  return [
    { x: centerX - halfWidth, y: centerY - halfHeight },
    { x: centerX + halfWidth, y: centerY - halfHeight },
    { x: centerX + halfWidth, y: centerY + halfHeight },
    { x: centerX - halfWidth, y: centerY + halfHeight },
  ]
}

function circlePoints(
  centerX: number,
  centerY: number,
  radius: number,
  numSegments = DEFAULT_CURVE_SEGMENTS,
): PointLike[] {
  const points: PointLike[] = []

  for (let i = 0; i < numSegments; i++) {
    const angle = (i / numSegments) * 2 * Math.PI
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    })
  }

  return points
}

function arcPoints(
  centerX: number,
  centerY: number,
  radius: number,
  startDegrees: number,
  endDegrees: number,
  numSegments = DEFAULT_ARC_SEGMENTS,
): PointLike[] {
  const points: PointLike[] = []

  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments
    const angleDegrees = startDegrees + (endDegrees - startDegrees) * t
    const angle = (angleDegrees * Math.PI) / 180
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    })
  }

  return points
}

function pillPoints(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  radius: number,
  ccwRotationDegrees = 0,
): PointLike[] {
  const halfWidth = width / 2
  const halfHeight = height / 2
  const safeRadius = Math.min(radius, halfWidth, halfHeight)
  const localPoints =
    width >= height
      ? [
          ...arcPoints(halfWidth - safeRadius, 0, safeRadius, -90, 90),
          ...arcPoints(-halfWidth + safeRadius, 0, safeRadius, 90, 270),
        ]
      : [
          ...arcPoints(0, -halfHeight + safeRadius, safeRadius, 180, 0),
          ...arcPoints(0, halfHeight - safeRadius, safeRadius, 0, 180),
        ]

  return localPoints.map((p) =>
    rotatePointAroundCenter(
      { x: p.x + centerX, y: p.y + centerY },
      { x: centerX, y: centerY },
      ccwRotationDegrees,
    ),
  )
}

/**
 * Convert a rectangular SMT pad to a flatten-js Polygon
 */
export function rectPadToPolygon(pad: PcbSmtPadRect): Polygon {
  return pointsToPolygon(rectPoints(pad.x, pad.y, pad.width, pad.height))
}

/**
 * Convert a rotated rectangular SMT pad to a flatten-js Polygon
 */
export function rotatedRectPadToPolygon(pad: PcbSmtPadRotatedRect): Polygon {
  const center = { x: pad.x, y: pad.y }
  const points = rectPoints(pad.x, pad.y, pad.width, pad.height).map((p) =>
    rotatePointAroundCenter(p, center, pad.ccw_rotation),
  )

  return pointsToPolygon(points)
}

/**
 * Convert a circular SMT pad to a flatten-js Polygon (approximated)
 */
export function circlePadToPolygon(pad: PcbSmtPadCircle): Polygon {
  return pointsToPolygon(circlePoints(pad.x, pad.y, pad.radius))
}

/**
 * Convert a pill-shaped SMT pad to a flatten-js Polygon (approximated)
 */
export function pillPadToPolygon(
  pad: PcbSmtPadPill | PcbSmtPadRotatedPill,
): Polygon {
  return pointsToPolygon(
    pillPoints(
      pad.x,
      pad.y,
      pad.width,
      pad.height,
      pad.radius,
      pad.shape === "rotated_pill" ? pad.ccw_rotation : 0,
    ),
  )
}

/**
 * Convert a polygonal SMT pad to a flatten-js Polygon
 */
export function polygonPadToPolygon(pad: PcbSmtPadPolygon): Polygon | null {
  if (pad.points.length < 3) {
    return null
  }

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

  return new Polygon(allPoints)
}

/**
 * Convert any supported element to a Polygon
 */
export function elementToPolygon(
  element: PcbSmtPad | PcbTrace | PcbPlatedHole,
): Polygon | null {
  if (element.type === "pcb_smtpad") {
    switch (element.shape) {
      case "rect":
        return rectPadToPolygon(element)
      case "rotated_rect":
        return rotatedRectPadToPolygon(element)
      case "circle":
        return circlePadToPolygon(element)
      case "pill":
      case "rotated_pill":
        return pillPadToPolygon(element)
      case "polygon":
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
