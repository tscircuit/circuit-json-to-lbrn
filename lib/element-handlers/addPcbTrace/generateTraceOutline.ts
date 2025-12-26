import Flatten from "@flatten-js/core"

/**
 * Generates a single polygon outline for a trace polyline.
 * This avoids boolean operations by computing the outline directly.
 *
 * The algorithm:
 * 1. Walk along the "left" side of the trace (offset by width/2 perpendicular to direction)
 * 2. At corners, compute the intersection of adjacent offset lines (miter join)
 * 3. Add corner point at the end cap
 * 4. Walk back along the "right" side with proper corner intersections
 * 5. The polygon closes back to the start (start cap is implicit)
 */
export const generateTraceOutline = ({
  points,
  width,
}: {
  points: Array<{ x: number; y: number }>
  width: number
}): Flatten.Polygon | null => {
  if (points.length < 2) return null

  // Remove consecutive duplicate points to avoid zero-length segments
  const cleanedInputPoints = removeConsecutiveDuplicates(points)
  if (cleanedInputPoints.length < 2) return null

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

  // Calculate intersection of two lines, each defined by a point and direction
  // Returns null if lines are parallel
  const lineIntersection = (
    p1: { x: number; y: number },
    d1: { x: number; y: number },
    p2: { x: number; y: number },
    d2: { x: number; y: number },
  ): { x: number; y: number } | null => {
    const cross = d1.x * d2.y - d1.y * d2.x
    if (Math.abs(cross) < 1e-10) return null

    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const t = (dx * d2.y - dy * d2.x) / cross

    return {
      x: p1.x + t * d1.x,
      y: p1.y + t * d1.y,
    }
  }

  // Calculate offset points and directions for each segment
  const segmentData: Array<{
    p1: { x: number; y: number }
    p2: { x: number; y: number }
    dir: { x: number; y: number }
    leftP1: { x: number; y: number }
    leftP2: { x: number; y: number }
    rightP1: { x: number; y: number }
    rightP2: { x: number; y: number }
  }> = []

  for (let i = 0; i < cleanedInputPoints.length - 1; i++) {
    const p1 = cleanedInputPoints[i]!
    const p2 = cleanedInputPoints[i + 1]!

    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const len = Math.hypot(dx, dy)
    const dir = len === 0 ? { x: 1, y: 0 } : { x: dx / len, y: dy / len }

    const { nx, ny } = getPerpendicularOffset(p1, p2)

    segmentData.push({
      p1,
      p2,
      dir,
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
      // Calculate corner intersection on left side
      const prevSeg = segmentData[i - 1]!
      const intersection = lineIntersection(
        prevSeg.leftP1,
        prevSeg.dir,
        seg.leftP1,
        seg.dir,
      )

      if (intersection) {
        outlinePoints.push(intersection)
      } else {
        // Lines are parallel, use the segment's start point
        outlinePoints.push(seg.leftP1)
      }
    }

    // For the last segment, add the end point
    if (i === segmentData.length - 1) {
      outlinePoints.push(seg.leftP2)
    }
  }

  // End cap - add right side point
  const lastSegment = segmentData[segmentData.length - 1]!
  outlinePoints.push(lastSegment.rightP2)

  // Walk backward along right side
  for (let i = segmentData.length - 1; i >= 0; i--) {
    const seg = segmentData[i]!

    if (i < segmentData.length - 1) {
      // Calculate corner intersection on right side
      const nextSeg = segmentData[i + 1]!
      const intersection = lineIntersection(
        seg.rightP1,
        seg.dir,
        nextSeg.rightP1,
        nextSeg.dir,
      )

      if (intersection) {
        outlinePoints.push(intersection)
      } else {
        // Lines are parallel, use the segment's end point
        outlinePoints.push(seg.rightP2)
      }
    }

    // For the first segment, add the start point
    if (i === 0) {
      outlinePoints.push(seg.rightP1)
    }
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
 * Remove consecutive duplicate points from input (within tolerance)
 * This is used to clean input points before processing
 */
const removeConsecutiveDuplicates = (
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

  return result
}

/**
 * Remove consecutive duplicate points from outline (within tolerance)
 * Also removes last point if it's duplicate of first (for closed polygons)
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
