import { cju, getBoardBounds } from "@tscircuit/circuit-json-util"
import type { CircuitJson } from "circuit-json"

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const expandPoint = (bounds: Bounds, x: number, y: number, pad = 0) => {
  bounds.minX = Math.min(bounds.minX, x - pad)
  bounds.minY = Math.min(bounds.minY, y - pad)
  bounds.maxX = Math.max(bounds.maxX, x + pad)
  bounds.maxY = Math.max(bounds.maxY, y + pad)
}

const expandAxisAlignedRect = (
  bounds: Bounds,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  expandPoint(bounds, x, y, 0)
  bounds.minX = Math.min(bounds.minX, x - width / 2)
  bounds.minY = Math.min(bounds.minY, y - height / 2)
  bounds.maxX = Math.max(bounds.maxX, x + width / 2)
  bounds.maxY = Math.max(bounds.maxY, y + height / 2)
}

const expandRotatedRect = (
  bounds: Bounds,
  x: number,
  y: number,
  width: number,
  height: number,
  rotationDeg = 0,
) => {
  if (!rotationDeg) {
    expandAxisAlignedRect(bounds, x, y, width, height)
    return
  }

  const rad = (rotationDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const halfWidth = width / 2
  const halfHeight = height / 2
  const corners: Array<[number, number]> = [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ]

  for (const [dx, dy] of corners) {
    expandPoint(bounds, x + dx * cos - dy * sin, y + dx * sin + dy * cos)
  }
}

const expandPolygon = (
  bounds: Bounds,
  points: Array<{ x?: number | null; y?: number | null }> | undefined,
  offsetX = 0,
  offsetY = 0,
) => {
  if (!points) return
  for (const point of points) {
    expandPoint(bounds, (point.x ?? 0) + offsetX, (point.y ?? 0) + offsetY)
  }
}

const expandSmtPad = (bounds: Bounds, pad: any) => {
  if (pad.shape === "circle") {
    expandPoint(bounds, pad.x, pad.y, pad.radius ?? 0)
    return
  }
  if (pad.shape === "polygon") {
    expandPolygon(bounds, pad.points)
    return
  }
  if (
    typeof pad.width === "number" &&
    typeof pad.height === "number" &&
    typeof pad.x === "number" &&
    typeof pad.y === "number"
  ) {
    expandRotatedRect(
      bounds,
      pad.x,
      pad.y,
      pad.width,
      pad.height,
      pad.ccw_rotation,
    )
  }
}

const expandPlatedHole = (bounds: Bounds, hole: any) => {
  if (hole.shape === "hole_with_polygon_pad") {
    expandPolygon(bounds, hole.pad_outline, hole.x, hole.y)
    const holeRadius = (hole.hole_diameter ?? 0) / 2
    expandPoint(
      bounds,
      hole.x + (hole.hole_offset_x ?? 0),
      hole.y + (hole.hole_offset_y ?? 0),
      holeRadius,
    )
    return
  }

  if (hole.shape === "circular_hole_with_rect_pad") {
    expandAxisAlignedRect(
      bounds,
      hole.x,
      hole.y,
      hole.rect_pad_width ?? 0,
      hole.rect_pad_height ?? 0,
    )
    expandPoint(
      bounds,
      hole.x + (hole.hole_offset_x ?? 0),
      hole.y + (hole.hole_offset_y ?? 0),
      (hole.hole_diameter ?? 0) / 2,
    )
    return
  }

  if (
    hole.shape === "pill_hole_with_rect_pad" ||
    hole.shape === "rotated_pill_hole_with_rect_pad"
  ) {
    expandRotatedRect(
      bounds,
      hole.x,
      hole.y,
      hole.rect_pad_width ?? hole.outer_width ?? 0,
      hole.rect_pad_height ?? hole.outer_height ?? 0,
      hole.rect_ccw_rotation ?? hole.ccw_rotation,
    )
    return
  }

  if (typeof hole.outer_diameter === "number") {
    expandPoint(bounds, hole.x, hole.y, hole.outer_diameter / 2)
  }

  if (
    typeof hole.outer_width === "number" &&
    typeof hole.outer_height === "number"
  ) {
    expandRotatedRect(
      bounds,
      hole.x,
      hole.y,
      hole.outer_width,
      hole.outer_height,
      hole.ccw_rotation,
    )
  }
}

const expandPcbHole = (bounds: Bounds, hole: any) => {
  if (hole.hole_shape === "circle" || typeof hole.hole_diameter === "number") {
    if (typeof hole.hole_diameter === "number" && hole.hole_shape !== "rect") {
      expandPoint(bounds, hole.x, hole.y, hole.hole_diameter / 2)
    }
  }

  if (
    typeof hole.hole_width === "number" &&
    typeof hole.hole_height === "number"
  ) {
    expandRotatedRect(
      bounds,
      hole.x,
      hole.y,
      hole.hole_width,
      hole.hole_height,
      hole.ccw_rotation,
    )
  }
}

const expandCutout = (bounds: Bounds, cutout: any) => {
  if (cutout.shape === "circle") {
    expandPoint(
      bounds,
      cutout.center?.x ?? cutout.x ?? 0,
      cutout.center?.y ?? cutout.y ?? 0,
      cutout.radius ?? (cutout.diameter ?? 0) / 2,
    )
    return
  }
  if (cutout.shape === "polygon" || cutout.points) {
    expandPolygon(bounds, cutout.points)
    return
  }
  if (typeof cutout.width === "number" && typeof cutout.height === "number") {
    expandRotatedRect(
      bounds,
      cutout.center?.x ?? 0,
      cutout.center?.y ?? 0,
      cutout.width,
      cutout.height,
      cutout.rotation ?? cutout.ccw_rotation,
    )
  }
}

/**
 * Calculates the bounding box of all PCB elements in the circuit JSON
 */
export const calculateCircuitBounds = (circuitJson: CircuitJson): Bounds => {
  const db = cju(circuitJson)

  const bounds: Bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  }

  for (const board of db.pcb_board.list()) {
    try {
      const boardBounds = getBoardBounds(board)
      expandPoint(bounds, boardBounds.minX, boardBounds.minY)
      expandPoint(bounds, boardBounds.maxX, boardBounds.maxY)
    } catch {
      if (
        typeof board.width === "number" &&
        typeof board.height === "number" &&
        board.center
      ) {
        expandAxisAlignedRect(
          bounds,
          board.center.x,
          board.center.y,
          board.width,
          board.height,
        )
      }
      expandPolygon(bounds, board.outline)
    }
  }

  for (const smtpad of db.pcb_smtpad.list()) {
    expandSmtPad(bounds, smtpad)
  }

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

      expandPoint(bounds, point.x, point.y, pointWidth)
    }
  }

  for (const hole of db.pcb_plated_hole.list()) {
    expandPlatedHole(bounds, hole)
  }

  for (const via of db.pcb_via.list()) {
    expandPoint(
      bounds,
      via.x,
      via.y,
      (via.outer_diameter ?? via.hole_diameter ?? 0) / 2,
    )
  }

  for (const hole of db.pcb_hole.list()) {
    expandPcbHole(bounds, hole)
  }

  for (const cutout of db.pcb_cutout.list()) {
    expandCutout(bounds, cutout)
  }

  if (
    !Number.isFinite(bounds.minX) ||
    !Number.isFinite(bounds.minY) ||
    !Number.isFinite(bounds.maxX) ||
    !Number.isFinite(bounds.maxY)
  ) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  return bounds
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
