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
    } else if (smtpad.shape === "pill") {
      // A pill is a rect with rounded ends; its extent is the rect's.
      const halfWidth = smtpad.width / 2
      const halfHeight = smtpad.height / 2

      minX = Math.min(minX, smtpad.x - halfWidth)
      minY = Math.min(minY, smtpad.y - halfHeight)
      maxX = Math.max(maxX, smtpad.x + halfWidth)
      maxY = Math.max(maxY, smtpad.y + halfHeight)
    } else if (
      smtpad.shape === "rotated_rect" ||
      smtpad.shape === "rotated_pill"
    ) {
      // Expand to the axis-aligned bounding box of the rotated rect/pill, the
      // same way the pcb_hole rotated_pill case does.
      const rotation = ((smtpad.ccw_rotation ?? 0) * Math.PI) / 180
      const cos = Math.abs(Math.cos(rotation))
      const sin = Math.abs(Math.sin(rotation))
      const halfWidth = (smtpad.width * cos + smtpad.height * sin) / 2
      const halfHeight = (smtpad.width * sin + smtpad.height * cos) / 2

      minX = Math.min(minX, smtpad.x - halfWidth)
      minY = Math.min(minY, smtpad.y - halfHeight)
      maxX = Math.max(maxX, smtpad.x + halfWidth)
      maxY = Math.max(maxY, smtpad.y + halfHeight)
    } else if (smtpad.shape === "polygon") {
      // Polygon pads carry absolute points and have no x/y of their own.
      for (const point of smtpad.points ?? []) {
        minX = Math.min(minX, point.x)
        minY = Math.min(minY, point.y)
        maxX = Math.max(maxX, point.x)
        maxY = Math.max(maxY, point.y)
      }
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
    // The outer copper is what defines the extent, not the drill. Each shape
    // names it differently, so pick the right pair of dimensions per shape.
    let halfWidth: number | undefined
    let halfHeight: number | undefined

    if (hole.shape === "circle") {
      halfWidth = hole.outer_diameter / 2
      halfHeight = hole.outer_diameter / 2
    } else if (hole.shape === "oval" || hole.shape === "pill") {
      halfWidth = hole.outer_width / 2
      halfHeight = hole.outer_height / 2
    } else if (
      hole.shape === "circular_hole_with_rect_pad" ||
      hole.shape === "pill_hole_with_rect_pad"
    ) {
      halfWidth = hole.rect_pad_width / 2
      halfHeight = hole.rect_pad_height / 2
    } else if (hole.shape === "rotated_pill_hole_with_rect_pad") {
      // The rect pad carries its own rotation; expand to its axis-aligned box.
      const rotation =
        (((hole as { rect_ccw_rotation?: number }).rect_ccw_rotation ?? 0) *
          Math.PI) /
        180
      const cos = Math.abs(Math.cos(rotation))
      const sin = Math.abs(Math.sin(rotation))
      halfWidth = (hole.rect_pad_width * cos + hole.rect_pad_height * sin) / 2
      halfHeight = (hole.rect_pad_width * sin + hole.rect_pad_height * cos) / 2
    } else if (hole.shape === "hole_with_polygon_pad") {
      // The polygon pad outline is relative to the hole's own position.
      for (const point of hole.pad_outline ?? []) {
        minX = Math.min(minX, hole.x + point.x)
        minY = Math.min(minY, hole.y + point.y)
        maxX = Math.max(maxX, hole.x + point.x)
        maxY = Math.max(maxY, hole.y + point.y)
      }
    }

    if (halfWidth !== undefined && halfHeight !== undefined) {
      minX = Math.min(minX, hole.x - halfWidth)
      minY = Math.min(minY, hole.y - halfHeight)
      maxX = Math.max(maxX, hole.x + halfWidth)
      maxY = Math.max(maxY, hole.y + halfHeight)
    }
  }

  // Calculate bounds from vias. These are rendered by the converter but were
  // never counted, so a via near the board edge could sit outside the bounds.
  for (const via of db.pcb_via.list()) {
    const radius = (via.outer_diameter ?? 0) / 2

    minX = Math.min(minX, via.x - radius)
    minY = Math.min(minY, via.y - radius)
    maxX = Math.max(maxX, via.x + radius)
    maxY = Math.max(maxY, via.y + radius)
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
