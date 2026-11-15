import type { CircuitJson } from "circuit-json"
import { cju } from "@tscircuit/circuit-json-util"

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * Calculates the bounding box of all PCB elements in the circuit JSON
 */
export const calculateCircuitBounds = (circuitJson: CircuitJson): Bounds => {
  const db = cju(circuitJson)

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  // Calculate bounds from SMT pads
  for (const smtpad of db.pcb_smtpad.list()) {
    if (smtpad.shape === "rect") {
      const halfWidth = smtpad.width / 2
      const halfHeight = smtpad.height / 2

      minX = Math.min(minX, smtpad.x - halfWidth)
      minY = Math.min(minY, smtpad.y - halfHeight)
      maxX = Math.max(maxX, smtpad.x + halfWidth)
      maxY = Math.max(maxY, smtpad.y + halfHeight)
    } else if (smtpad.shape === "circle") {
      const radius = smtpad.radius

      minX = Math.min(minX, smtpad.x - radius)
      minY = Math.min(minY, smtpad.y - radius)
      maxX = Math.max(maxX, smtpad.x + radius)
      maxY = Math.max(maxY, smtpad.y + radius)
    }
  }

  // Calculate bounds from PCB traces
  for (const trace of db.pcb_trace.list()) {
    const isWidthPoint = (
      point: (typeof trace.route)[number],
    ): point is (typeof trace.route)[number] & { width: number } =>
      "width" in point && typeof point.width === "number"

    const halfWidth =
      trace.route_thickness_mode === "interpolated"
        ? 0
        : (trace.route.find(isWidthPoint)?.width ?? 0) / 2

    for (const point of trace.route) {
      const pointWidth =
        trace.route_thickness_mode === "interpolated"
          ? isWidthPoint(point)
            ? point.width / 2
            : 0
          : halfWidth

      minX = Math.min(minX, point.x - pointWidth)
      minY = Math.min(minY, point.y - pointWidth)
      maxX = Math.max(maxX, point.x + pointWidth)
      maxY = Math.max(maxY, point.y + pointWidth)
    }
  }

  // Calculate bounds from plated holes
  for (const hole of db.pcb_plated_hole.list()) {
    if (hole.shape === "circle") {
      const radius = hole.outer_diameter / 2

      minX = Math.min(minX, hole.x - radius)
      minY = Math.min(minY, hole.y - radius)
      maxX = Math.max(maxX, hole.x + radius)
      maxY = Math.max(maxY, hole.y + radius)
    }
  }

  // Calculate bounds from unplated holes
  for (const hole of db.pcb_hole.list()) {
    let halfWidth: number
    let halfHeight: number

    switch (hole.hole_shape) {
      case "circle":
      case "square":
        halfWidth = hole.hole_diameter / 2
        halfHeight = hole.hole_diameter / 2
        break
      case "rotated_pill": {
        // Expand the half extents to the axis-aligned bounding box of the
        // rotated pill
        const rotation = ((hole.ccw_rotation ?? 0) * Math.PI) / 180
        const cos = Math.abs(Math.cos(rotation))
        const sin = Math.abs(Math.sin(rotation))
        halfWidth = (hole.hole_width * cos + hole.hole_height * sin) / 2
        halfHeight = (hole.hole_width * sin + hole.hole_height * cos) / 2
        break
      }
      case "rect":
      case "oval":
      case "pill":
        // These hole shapes are axis-aligned
        halfWidth = hole.hole_width / 2
        halfHeight = hole.hole_height / 2
        break
      default:
        continue
    }

    minX = Math.min(minX, hole.x - halfWidth)
    minY = Math.min(minY, hole.y - halfHeight)
    maxX = Math.max(maxX, hole.x + halfWidth)
    maxY = Math.max(maxY, hole.y + halfHeight)
  }

  // If no elements were found, return a default bounds
  if (
    !isFinite(minX) ||
    !isFinite(minY) ||
    !isFinite(maxX) ||
    !isFinite(maxY)
  ) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  return { minX, minY, maxX, maxY }
}

/**
 * Calculates the origin needed to shift all elements to the positive quadrant
 * with a small margin
 */
export const calculateOriginFromBounds = (
  bounds: Bounds,
  margin?: number,
): { x: number; y: number } => {
  const m = margin ?? 0.1
  // If minimum coordinates are already positive, no shift needed (but add margin)
  const originX = bounds.minX < m ? -bounds.minX + m : 0
  const originY = bounds.minY < m ? -bounds.minY + m : 0

  return { x: originX, y: originY }
}
