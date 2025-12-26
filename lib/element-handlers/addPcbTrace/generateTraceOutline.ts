import Flatten from "@flatten-js/core"

/**
 * Generates a single polygon outline for a trace polyline.
 * This avoids boolean operations by computing the outline directly.
 *
 * The algorithm:
 * 1. Walk along the "left" side of the trace (offset by width/2 perpendicular to direction)
 * 2. Add corner point at the end cap
 * 3. Walk back along the "right" side
 * 4. The polygon closes back to the start (start cap is implicit)
 */
export const generateTraceOutline = ({
  points,
  width,
}: {
  points: Array<{ x: number; y: number }>
  width: number
}): Flatten.Polygon | null => {
  if (points.length < 2) return null

  const radius = width / 2
  const outlinePoints: Array<{ x: number; y: number }> = []

  // Calculate perpendicular offset for a segment
  const getPerpendicularOffset = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
  ) => {
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const len = Math.hypot(dx, dy)
    if (len === 0) return { nx: 0, ny: 1 }
    // Perpendicular normal (rotate 90 degrees counterclockwise)
    return { nx: -dy / len, ny: dx / len }
  }

  // Calculate offset points for each segment
  const segmentData: Array<{
    leftP1: { x: number; y: number }
    leftP2: { x: number; y: number }
    rightP1: { x: number; y: number }
    rightP2: { x: number; y: number }
  }> = []

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!
    const p2 = points[i + 1]!

    const { nx, ny } = getPerpendicularOffset(p1, p2)

    segmentData.push({
      leftP1: { x: p1.x + nx * radius, y: p1.y + ny * radius },
      leftP2: { x: p2.x + nx * radius, y: p2.y + ny * radius },
      rightP1: { x: p1.x - nx * radius, y: p1.y - ny * radius },
      rightP2: { x: p2.x - nx * radius, y: p2.y - ny * radius },
    })
  }

  // Build the outline going forward on left side, then backward on right side

  // Start with the start cap - add right side point first, then left side point
  const firstSegment = segmentData[0]!
  outlinePoints.push(firstSegment.rightP1)
  outlinePoints.push(firstSegment.leftP1)

  // Walk forward along left side
  for (let i = 0; i < segmentData.length; i++) {
    const seg = segmentData[i]!

    if (i > 0) {
      // Add corner point on left side
      outlinePoints.push(seg.leftP1)
    }

    // Add end point of this segment's left side
    outlinePoints.push(seg.leftP2)
  }

  // End cap - add right side point
  const lastSegment = segmentData[segmentData.length - 1]!
  outlinePoints.push(lastSegment.rightP2)

  // Walk backward along right side
  for (let i = segmentData.length - 1; i >= 0; i--) {
    const seg = segmentData[i]!

    if (i < segmentData.length - 1) {
      // Add corner point on right side
      outlinePoints.push(seg.rightP2)
    }

    // Add start point of this segment's right side
    outlinePoints.push(seg.rightP1)
  }

  // The polygon closes back to the start

  // Remove duplicate points that are very close together
  const cleanedPoints = removeDuplicatePoints(outlinePoints)

  if (cleanedPoints.length < 3) return null

  const polygon = new Flatten.Polygon(
    cleanedPoints.map((p) => Flatten.point(p.x, p.y)),
  )

  // Reverse the polygon to ensure consistent orientation with circle polygons
  // This is required for boolean operations (unify) to work correctly
  return polygon.reverse()
}

/**
 * Remove consecutive duplicate points (within tolerance)
 */
const removeDuplicatePoints = (
  points: Array<{ x: number; y: number }>,
  tolerance = 1e-9,
): Array<{ x: number; y: number }> => {
  if (points.length === 0) return []

  const result: Array<{ x: number; y: number }> = [points[0]!]

  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1]!
    const curr = points[i]!
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y)
    if (dist > tolerance) {
      result.push(curr)
    }
  }

  // Also check if last point is duplicate of first
  if (result.length > 1) {
    const first = result[0]!
    const last = result[result.length - 1]!
    const dist = Math.hypot(last.x - first.x, last.y - first.y)
    if (dist <= tolerance) {
      result.pop()
    }
  }

  return result
}
