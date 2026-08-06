import type {
  CircuitJson,
  PcbBoard,
  PcbCutout,
  PcbHole,
  PcbPlatedHole,
  PcbSmtPad,
  PcbTrace,
  PcbVia,
  Point,
} from "circuit-json"
import { cju } from "@tscircuit/circuit-json-util"

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

const getBoundsFromHalfExtents = (
  centerX: number,
  centerY: number,
  halfWidth: number,
  halfHeight: number,
): Bounds => ({
  minX: centerX - halfWidth,
  minY: centerY - halfHeight,
  maxX: centerX + halfWidth,
  maxY: centerY + halfHeight,
})

const getRectBounds = (
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): Bounds => getBoundsFromHalfExtents(centerX, centerY, width / 2, height / 2)

const getCircleBounds = (
  centerX: number,
  centerY: number,
  radius: number,
): Bounds => getBoundsFromHalfExtents(centerX, centerY, radius, radius)

/** Bounds of a rect rotated counterclockwise about its own center */
const getRotatedRectBounds = (
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  ccwRotationDegrees: number,
): Bounds => {
  const rotation = ccwRotationDegrees * (Math.PI / 180)
  const cos = Math.abs(Math.cos(rotation))
  const sin = Math.abs(Math.sin(rotation))

  return getBoundsFromHalfExtents(
    centerX,
    centerY,
    (width / 2) * cos + (height / 2) * sin,
    (width / 2) * sin + (height / 2) * cos,
  )
}

/**
 * Bounds of a pill (a rect with semicircular caps, as drawn by createPillPath)
 * rotated counterclockwise about its own center. The caps keep their radius
 * through the rotation, so only the straight section between them turns.
 */
const getPillBounds = (
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  ccwRotationDegrees: number,
): Bounds => {
  const rotation = ccwRotationDegrees * (Math.PI / 180)
  const capRadius = Math.min(width, height) / 2
  const halfStraightWidth = Math.max(width / 2 - capRadius, 0)
  const halfStraightHeight = Math.max(height / 2 - capRadius, 0)
  const cos = Math.abs(Math.cos(rotation))
  const sin = Math.abs(Math.sin(rotation))

  return getBoundsFromHalfExtents(
    centerX,
    centerY,
    halfStraightWidth * cos + halfStraightHeight * sin + capRadius,
    halfStraightWidth * sin + halfStraightHeight * cos + capRadius,
  )
}

/** Bounds of an ellipse (as drawn by createOvalPath) rotated counterclockwise */
const getOvalBounds = (
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  ccwRotationDegrees: number,
): Bounds => {
  const rotation = ccwRotationDegrees * (Math.PI / 180)
  const radiusX = width / 2
  const radiusY = height / 2
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)

  return getBoundsFromHalfExtents(
    centerX,
    centerY,
    Math.hypot(radiusX * cos, radiusY * sin),
    Math.hypot(radiusX * sin, radiusY * cos),
  )
}

const getPointsBounds = (points: Point[]): Bounds | null => {
  if (points.length === 0) return null

  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  }
}

const isFiniteBounds = (bounds: Bounds): boolean =>
  Number.isFinite(bounds.minX) &&
  Number.isFinite(bounds.minY) &&
  Number.isFinite(bounds.maxX) &&
  Number.isFinite(bounds.maxY)

const mergeBounds = (a: Bounds | null, b: Bounds | null): Bounds | null => {
  if (!a) return b
  if (!b) return a

  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }
}

/** Outer copper extent of an SMT pad, matching the shapes addSmtPad draws */
const getSmtPadBounds = (smtPad: PcbSmtPad): Bounds | null => {
  switch (smtPad.shape) {
    case "rect":
      return getRectBounds(smtPad.x, smtPad.y, smtPad.width, smtPad.height)

    case "circle":
      return getCircleBounds(smtPad.x, smtPad.y, smtPad.radius)

    case "pill":
      return getPillBounds(smtPad.x, smtPad.y, smtPad.width, smtPad.height, 0)

    case "rotated_pill":
      return getPillBounds(
        smtPad.x,
        smtPad.y,
        smtPad.width,
        smtPad.height,
        smtPad.ccw_rotation ?? 0,
      )

    case "rotated_rect":
      return getRotatedRectBounds(
        smtPad.x,
        smtPad.y,
        smtPad.width,
        smtPad.height,
        smtPad.ccw_rotation ?? 0,
      )

    case "polygon":
      // Polygon pads carry absolute points instead of an x/y center
      return getPointsBounds(smtPad.points)

    default:
      return null
  }
}

/**
 * Outer copper extent of a plated hole. Each shape names its outer copper
 * differently, and the rect pad is the extent wherever there is one.
 */
const getPlatedHoleBounds = (platedHole: PcbPlatedHole): Bounds | null => {
  switch (platedHole.shape) {
    case "circle":
      return getCircleBounds(
        platedHole.x,
        platedHole.y,
        platedHole.outer_diameter / 2,
      )

    case "oval":
      return getOvalBounds(
        platedHole.x,
        platedHole.y,
        platedHole.outer_width,
        platedHole.outer_height,
        platedHole.ccw_rotation ?? 0,
      )

    case "pill":
      return getPillBounds(
        platedHole.x,
        platedHole.y,
        platedHole.outer_width,
        platedHole.outer_height,
        platedHole.ccw_rotation ?? 0,
      )

    case "circular_hole_with_rect_pad":
    case "pill_hole_with_rect_pad":
      return getRectBounds(
        platedHole.x,
        platedHole.y,
        platedHole.rect_pad_width,
        platedHole.rect_pad_height,
      )

    case "rotated_pill_hole_with_rect_pad":
      return getRotatedRectBounds(
        platedHole.x,
        platedHole.y,
        platedHole.rect_pad_width,
        platedHole.rect_pad_height,
        platedHole.rect_ccw_rotation ?? 0,
      )

    case "hole_with_polygon_pad":
      return getPointsBounds(platedHole.pad_outline)

    default:
      return null
  }
}

/** Extent of an unplated hole, matching the shapes addPcbHole draws */
const getPcbHoleBounds = (hole: PcbHole): Bounds | null => {
  switch (hole.hole_shape) {
    case "circle":
    case "square":
      // addCirclePcbHole draws hole_diameter for both
      return getCircleBounds(hole.x, hole.y, hole.hole_diameter / 2)

    case "rect":
      return getRectBounds(hole.x, hole.y, hole.hole_width, hole.hole_height)

    case "oval":
      return getOvalBounds(hole.x, hole.y, hole.hole_width, hole.hole_height, 0)

    case "pill":
      return getPillBounds(hole.x, hole.y, hole.hole_width, hole.hole_height, 0)

    case "rotated_pill":
      return getPillBounds(
        hole.x,
        hole.y,
        hole.hole_width,
        hole.hole_height,
        hole.ccw_rotation ?? 0,
      )

    default:
      return null
  }
}

const getViaBounds = (via: PcbVia): Bounds =>
  getCircleBounds(via.x, via.y, via.outer_diameter / 2)

/**
 * Extent of the board cut. addPcbBoard cuts the outline when the board has
 * one, so that takes precedence over width and height.
 */
const getPcbBoardBounds = (board: PcbBoard): Bounds | null => {
  if (board.outline?.length) return getPointsBounds(board.outline)

  if (
    typeof board.width === "number" &&
    typeof board.height === "number" &&
    board.center
  ) {
    return getRectBounds(
      board.center.x,
      board.center.y,
      board.width,
      board.height,
    )
  }

  return null
}

/** Extent of a cutout, matching the shapes addPcbCutout draws */
const getPcbCutoutBounds = (cutout: PcbCutout): Bounds | null => {
  switch (cutout.shape) {
    case "circle":
      return getCircleBounds(cutout.center.x, cutout.center.y, cutout.radius)

    case "rect":
      return getRotatedRectBounds(
        cutout.center.x,
        cutout.center.y,
        cutout.width,
        cutout.height,
        cutout.rotation ?? 0,
      )

    case "polygon":
      return getPointsBounds(cutout.points)

    case "path":
      // addPathPcbCutout draws the route itself, slot_width is not applied yet
      return getPointsBounds(cutout.route)

    default:
      return null
  }
}

const getTraceBounds = (trace: PcbTrace): Bounds | null => {
  const isWidthPoint = (
    point: (typeof trace.route)[number],
  ): point is (typeof trace.route)[number] & { width: number } =>
    "width" in point && typeof point.width === "number"

  const isInterpolated = trace.route_thickness_mode === "interpolated"
  const routeHalfWidth = (trace.route.find(isWidthPoint)?.width ?? 0) / 2

  let bounds: Bounds | null = null
  for (const point of trace.route) {
    // Some route points carry start/end instead of x/y, e.g. through_obstacle,
    // and splitRouteSegmentsByLayer only draws the wire points
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) continue

    let halfWidth = routeHalfWidth
    if (isInterpolated) {
      halfWidth = isWidthPoint(point) ? point.width / 2 : 0
    }

    bounds = mergeBounds(
      bounds,
      getBoundsFromHalfExtents(point.x, point.y, halfWidth, halfWidth),
    )
  }

  return bounds
}

/**
 * Calculates the bounding box of the PCB elements in the circuit JSON. Every
 * element kind the converter draws contributes, so the origin derived from
 * these bounds shifts the whole drawing into the positive quadrant.
 */
export const calculateCircuitBounds = (circuitJson: CircuitJson): Bounds => {
  const db = cju(circuitJson)

  const elementBounds: Array<Bounds | null> = [
    ...db.pcb_smtpad.list().map(getSmtPadBounds),
    ...db.pcb_plated_hole.list().map(getPlatedHoleBounds),
    ...db.pcb_trace.list().map(getTraceBounds),
    ...db.pcb_board.list().map(getPcbBoardBounds),
    ...db.pcb_via.list().map(getViaBounds),
    ...db.pcb_hole.list().map(getPcbHoleBounds),
    ...db.pcb_cutout.list().map(getPcbCutoutBounds),
  ]

  let bounds: Bounds | null = null
  for (const singleElementBounds of elementBounds) {
    // An element with a bad dimension is left out rather than turning the whole
    // bounding box into NaN
    if (singleElementBounds && !isFiniteBounds(singleElementBounds)) continue
    bounds = mergeBounds(bounds, singleElementBounds)
  }

  // If no elements were found, return a default bounds
  return bounds ?? { minX: 0, minY: 0, maxX: 0, maxY: 0 }
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
