import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { calculateCircuitBounds } from "../../lib/calculateBounds"

const board = {
  type: "pcb_board",
  pcb_board_id: "board_1",
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
  center: { x: 0, y: 0 },
  width: 10,
  height: 10,
}

const boundsWith = (pad: unknown) =>
  calculateCircuitBounds([board, pad] as unknown as CircuitJson)

test("a pill pad extends the bounds like the equivalent rect", () => {
  // Same position and size as a rect pad, so the two must agree — the only
  // difference is the rounded ends, which don't change the extent.
  const pill = boundsWith({
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_1",
    shape: "pill",
    x: 5,
    y: 0,
    width: 4,
    height: 2,
    radius: 1,
    layer: "top",
  })
  const rect = boundsWith({
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_1",
    shape: "rect",
    x: 5,
    y: 0,
    width: 4,
    height: 2,
    layer: "top",
  })

  expect(pill.maxX).toBe(7)
  expect(pill).toEqual(rect)
})

test("a rotated_rect pad uses its axis-aligned bounding box", () => {
  // A 2x2 square rotated 45 degrees has a half-extent of sqrt(2), so a pad
  // centred at x=5 reaches 5 + sqrt(2).
  const bounds = boundsWith({
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_1",
    shape: "rotated_rect",
    x: 5,
    y: 0,
    width: 2,
    height: 2,
    ccw_rotation: 45,
    layer: "top",
  })

  expect(bounds.maxX).toBeCloseTo(5 + Math.SQRT2, 10)
})

test("a rotated_pill pad swaps its extents at 90 degrees", () => {
  // 4 wide x 2 tall rotated 90 degrees becomes 2 wide x 4 tall.
  const bounds = boundsWith({
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_1",
    shape: "rotated_pill",
    x: 5,
    y: 0,
    width: 4,
    height: 2,
    radius: 1,
    ccw_rotation: 90,
    layer: "top",
  })

  expect(bounds.maxX).toBeCloseTo(6, 10)
  expect(bounds.maxY).toBeCloseTo(5, 10)
})

test("a polygon pad uses its points, which are absolute", () => {
  const bounds = boundsWith({
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_1",
    shape: "polygon",
    points: [
      { x: 8, y: 0 },
      { x: 12, y: 0 },
      { x: 12, y: 3 },
    ],
    layer: "top",
  })

  expect(bounds.maxX).toBe(12)
})

test("an unrotated rotated_rect matches the plain rect", () => {
  // ccw_rotation 0 must not inflate the box — guards the trig.
  const rotated = boundsWith({
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_1",
    shape: "rotated_rect",
    x: 5,
    y: 0,
    width: 4,
    height: 2,
    ccw_rotation: 0,
    layer: "top",
  })

  expect(rotated.maxX).toBeCloseTo(7, 10)
  expect(rotated.maxY).toBeCloseTo(5, 10)
})

test("pads inside the board do not change the bounds", () => {
  // The board still dominates when nothing hangs off it, so these additions
  // cannot silently inflate ordinary boards.
  const bounds = boundsWith({
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_1",
    shape: "pill",
    x: 0,
    y: 0,
    width: 4,
    height: 2,
    radius: 1,
    layer: "top",
  })

  expect(bounds).toEqual({ minX: -5, minY: -5, maxX: 5, maxY: 5 })
})
