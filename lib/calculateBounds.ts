import type { CircuitJson } from "circuit-json"
import { cju, getBoardBounds } from "@tscircuit/circuit-json-util"

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

  // Calculate bounds from the board outline.
  //
  // The board is the largest thing in the file and is what actually gets cut, so
  // leaving it out lets the origin shift place the board outline at negative
  // coordinates — off the LightBurn canvas — whenever the board extends past the
  // copper on it (which is the normal case, since components sit inside the
  // board edge). It also skewed the bottom-layer mirror axis, which is derived
  // from these bounds, towards wherever the pads happened to cluster.
  for (const board of db.pcb_board.list()) {
    try {
      const boardBounds = getBoardBounds(board)

      minX = Math.min(minX, boardBounds.minX)
      minY = Math.min(minY, boardBounds.minY)
      maxX = Math.max(maxX, boardBounds.maxX)
      maxY = Math.max(maxY, boardBounds.maxY)
    } catch {
      // getBoardBounds throws for boards it cannot resolve (e.g. an outline with
      // too few points). index.ts already warns and continues in that case, so
      // bounds do the same rather than failing the whole conversion.
    }
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
