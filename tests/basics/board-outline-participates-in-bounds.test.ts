import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import {
  calculateCircuitBounds,
  calculateOriginFromBounds,
} from "../../lib/calculateBounds"

// A board that extends well past the copper on it — the normal case, since
// components sit inside the board edge.
const boardWiderThanCopper: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    center: { x: 0, y: 0 },
    width: 30,
    height: 10,
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad_1",
    shape: "rect",
    x: 0,
    y: 0,
    width: 2,
    height: 2,
    layer: "top",
  },
] as any

test("the board outline is included in the circuit bounds", () => {
  const bounds = calculateCircuitBounds(boardWiderThanCopper)

  // The board spans x -15..15, y -5..5 — not just the 2x2 pad at the origin.
  expect(bounds).toEqual({ minX: -15, minY: -5, maxX: 15, maxY: 5 })
})

test("the origin shift moves the whole board into the positive quadrant", () => {
  const bounds = calculateCircuitBounds(boardWiderThanCopper)
  const origin = calculateOriginFromBounds(bounds)

  // Every corner of the board must land at >= 0 after the shift. Previously the
  // origin was computed from the pad alone, so the board's left edge landed at
  // -13.9 — off the LightBurn canvas.
  expect(bounds.minX + origin.x).toBeGreaterThanOrEqual(0)
  expect(bounds.minY + origin.y).toBeGreaterThanOrEqual(0)
})

test("the bounds centre matches the board centre, so the mirror axis is correct", () => {
  // Pads clustered on one side of a board that is centred at the origin. The
  // bottom-layer mirror axis is derived from these bounds, so if the board is
  // ignored the axis follows the pads instead of the board.
  const offCentreCopper: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      center: { x: 0, y: 0 },
      width: 30,
      height: 10,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      shape: "rect",
      x: -10,
      y: 0,
      width: 2,
      height: 2,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_2",
      shape: "rect",
      x: -8,
      y: 0,
      width: 2,
      height: 2,
      layer: "bottom",
    },
  ] as any

  const bounds = calculateCircuitBounds(offCentreCopper)

  // Board centre is x=0. Without the board in the bounds this was -9.
  expect((bounds.minX + bounds.maxX) / 2).toBe(0)
})

test("copper reaching past the board still widens the bounds", () => {
  // The board must not become the only thing that counts — a pad hanging off the
  // edge still has to be inside the bounds, or it would be cut off.
  const copperPastBoardEdge: CircuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      shape: "rect",
      x: 20,
      y: 0,
      width: 2,
      height: 2,
      layer: "top",
    },
  ] as any

  const bounds = calculateCircuitBounds(copperPastBoardEdge)

  expect(bounds.minX).toBe(-5)
  expect(bounds.maxX).toBe(21)
})

test("a circuit with no board still uses the copper bounds", () => {
  const noBoard: CircuitJson = [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      shape: "rect",
      x: 4,
      y: 4,
      width: 2,
      height: 2,
      layer: "top",
    },
  ] as any

  expect(calculateCircuitBounds(noBoard)).toEqual({
    minX: 3,
    minY: 3,
    maxX: 5,
    maxY: 5,
  })
})
