import Flatten from "@flatten-js/core"

/**
 * Generates a single polygon outline for a trace polyline.
 * This avoids boolean operations by computing the outline directly.
 *
 * The algorithm:
 * 1. Walk along the "left" side of the trace (offset by width/2 perpendicular to direction)
 * 2. Add arc at the end cap
 * 3. Walk back along the "right" side
 * 4. The polygon closes back to the start (start cap is implicit)
 *
 * At corners, we add arc segments to create smooth rounded transitions.
 */
export const generateTraceOutline = ({
  points,
  width,
  arcSegments = 8,
}: {
  points: Array<{ x: number; y: number }>
  width: number
  arcSegments?: number
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

  // Generate arc points from angle startAngle to endAngle around center
  const generateArc = (
    center: { x: number; y: number },
    startAngle: number,
    endAngle: number,
    clockwise: boolean,
  ): Array<{ x: number; y: number }> => {
    const arcPoints: Array<{ x: number; y: number }> = []

    // Normalize angles
    let start = startAngle
    let end = endAngle

    if (clockwise) {
      // For clockwise, we want to go from start down to end
      while (end > start) end -= 2 * Math.PI
    } else {
      // For counterclockwise, we want to go from start up to end
      while (end < start) end += 2 * Math.PI
    }

    const angleSpan = end - start
    const steps = Math.max(
      2,
      Math.ceil((Math.abs(angleSpan) / (Math.PI / 2)) * arcSegments),
    )

    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const angle = start + angleSpan * t
      arcPoints.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle),
      })
    }

    return arcPoints
  }

  // Calculate the direction angle for a segment
  const getSegmentAngle = (
    p1: { x: number; y: number },
    p2: { x: number; y: number },
  ) => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x)
  }

  // Calculate offset points for each segment
  const segmentData: Array<{
    leftP1: { x: number; y: number }
    leftP2: { x: number; y: number }
    rightP1: { x: number; y: number }
    rightP2: { x: number; y: number }
    angle: number
  }> = []

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!
    const p2 = points[i + 1]!

    const { nx, ny } = getPerpendicularOffset(p1, p2)
    const angle = getSegmentAngle(p1, p2)

    segmentData.push({
      leftP1: { x: p1.x + nx * radius, y: p1.y + ny * radius },
      leftP2: { x: p2.x + nx * radius, y: p2.y + ny * radius },
      rightP1: { x: p1.x - nx * radius, y: p1.y - ny * radius },
      rightP2: { x: p2.x - nx * radius, y: p2.y - ny * radius },
      angle,
    })
  }

  // Build the outline going forward on left side, then backward on right side

  // Start with the start cap (semicircle from right to left)
  const firstSegment = segmentData[0]!
  const startCapArc = generateArc(
    points[0]!,
    firstSegment.angle - Math.PI / 2, // right side angle
    firstSegment.angle + Math.PI / 2, // left side angle
    false, // counterclockwise
  )
  outlinePoints.push(...startCapArc)

  // Walk forward along left side
  for (let i = 0; i < segmentData.length; i++) {
    const seg = segmentData[i]!

    if (i > 0) {
      // Add corner arc on left side (outer corner for left turns)
      const prevSeg = segmentData[i - 1]!
      const prevLeftAngle = prevSeg.angle + Math.PI / 2
      const currLeftAngle = seg.angle + Math.PI / 2

      // Cross product to determine turn direction
      const p0 = points[i - 1]!
      const p1 = points[i]!
      const p2 = points[i + 1]!
      const cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x)

      if (cross > 0) {
        // Left turn - left side is outer, needs arc
        const arcPoints = generateArc(p1, prevLeftAngle, currLeftAngle, false)
        // Skip first point to avoid duplicate
        outlinePoints.push(...arcPoints.slice(1))
      } else {
        // Right turn or straight - add the corner point
        outlinePoints.push(seg.leftP1)
      }
    }

    // Add end point of this segment's left side
    outlinePoints.push(seg.leftP2)
  }

  // End cap (semicircle from left to right)
  const lastSegment = segmentData[segmentData.length - 1]!
  const lastPoint = points[points.length - 1]!
  const endCapArc = generateArc(
    lastPoint,
    lastSegment.angle + Math.PI / 2, // left side angle
    lastSegment.angle - Math.PI / 2, // right side angle
    false, // counterclockwise
  )
  // Skip first point to avoid duplicate
  outlinePoints.push(...endCapArc.slice(1))

  // Walk backward along right side
  for (let i = segmentData.length - 1; i >= 0; i--) {
    const seg = segmentData[i]!

    if (i < segmentData.length - 1) {
      // Add corner arc on right side (outer corner for right turns in original direction)
      const nextSeg = segmentData[i + 1]!
      const currRightAngle = seg.angle - Math.PI / 2
      const nextRightAngle = nextSeg.angle - Math.PI / 2

      // Cross product to determine turn direction (same cross as before)
      const p0 = points[i]!
      const p1 = points[i + 1]!
      const p2 = points[i + 2]!
      const cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x)

      if (cross < 0) {
        // Right turn - right side is outer, needs arc
        // Going backward, so arc goes from next to current
        const arcPoints = generateArc(p1, nextRightAngle, currRightAngle, false)
        // Skip first point to avoid duplicate
        outlinePoints.push(...arcPoints.slice(1))
      } else {
        // Left turn or straight - add the corner point
        outlinePoints.push(seg.rightP2)
      }
    }

    // Add start point of this segment's right side
    outlinePoints.push(seg.rightP1)
  }

  // The polygon closes back to the start (start cap handles the connection)

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
