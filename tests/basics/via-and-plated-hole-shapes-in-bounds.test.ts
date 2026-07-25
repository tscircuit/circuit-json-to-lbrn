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

// Board spans -5..5, so anything reaching past 5 proves the element was counted.
const boundsWith = (element: unknown) =>
  calculateCircuitBounds([board, element] as unknown as CircuitJson)

const layers = ["top", "bottom"]

test("a via at the board edge extends the bounds", () => {
  const bounds = boundsWith({
    type: "pcb_via",
    pcb_via_id: "via_1",
    x: 5,
    y: 0,
    outer_diameter: 2,
    hole_diameter: 1,
    layers,
  })

  expect(bounds.maxX).toBe(6)
})

test("oval and pill plated holes use their outer copper, not the drill", () => {
  for (const shape of ["oval", "pill"]) {
    const bounds = boundsWith({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_1",
      shape,
      x: 5,
      y: 0,
      outer_width: 8,
      outer_height: 2,
      hole_width: 6,
      hole_height: 1,
      layers,
    })

    // outer_width 8 → half-extent 4, not the 6-wide drill's 3.
    expect(bounds.maxX).toBe(9)
    expect(bounds.maxY).toBe(5)
  }
})

test("rect-pad plated holes use the pad, which is larger than the hole", () => {
  for (const shape of [
    "circular_hole_with_rect_pad",
    "pill_hole_with_rect_pad",
  ]) {
    const bounds = boundsWith({
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "hole_1",
      shape,
      x: 5,
      y: 0,
      hole_shape: shape === "pill_hole_with_rect_pad" ? "pill" : "circle",
      hole_diameter: 1,
      hole_width: 1,
      hole_height: 2,
      pad_shape: "rect",
      rect_pad_width: 4,
      rect_pad_height: 2,
      layers,
    })

    expect(bounds.maxX).toBe(7)
  }
})

test("a rotated rect pad expands to its axis-aligned box", () => {
  const bounds = boundsWith({
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole_1",
    shape: "rotated_pill_hole_with_rect_pad",
    x: 5,
    y: 0,
    hole_shape: "rotated_pill",
    hole_width: 1,
    hole_height: 2,
    pad_shape: "rect",
    rect_pad_width: 4,
    rect_pad_height: 2,
    rect_ccw_rotation: 90,
    layers,
  })

  // 4 wide x 2 tall rotated 90 degrees becomes 2 wide x 4 tall.
  expect(bounds.maxX).toBeCloseTo(6, 10)
  expect(bounds.maxY).toBeCloseTo(5, 10)
})

test("an unrotated rect pad matches the unrotated shape", () => {
  // rect_ccw_rotation 0 must not inflate the box — guards the trig.
  const bounds = boundsWith({
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole_1",
    shape: "rotated_pill_hole_with_rect_pad",
    x: 5,
    y: 0,
    hole_shape: "rotated_pill",
    hole_width: 1,
    hole_height: 2,
    pad_shape: "rect",
    rect_pad_width: 4,
    rect_pad_height: 2,
    rect_ccw_rotation: 0,
    layers,
  })

  expect(bounds.maxX).toBeCloseTo(7, 10)
})

test("circular plated holes are unchanged", () => {
  const bounds = boundsWith({
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole_1",
    shape: "circle",
    x: 5,
    y: 0,
    outer_diameter: 4,
    hole_diameter: 2,
    layers,
  })

  expect(bounds.maxX).toBe(7)
})

test("a polygon pad outline is relative to the hole position", () => {
  // The renderer draws this outline at `platedHole.x + point.x`
  // (see addHoleWithPolygonPad), so the bounds must offset it the same way.
  const bounds = boundsWith({
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "hole_1",
    shape: "hole_with_polygon_pad",
    x: 5,
    y: 0,
    hole_shape: "circle",
    hole_diameter: 1,
    pad_outline: [
      { x: -2, y: -2 },
      { x: 3, y: -2 },
      { x: 3, y: 2 },
    ],
    layers,
  })

  // 5 + 3, not a bare 3 — proves the offset is applied rather than the raw point.
  expect(bounds.maxX).toBe(8)
})

test("vias and holes inside the board do not change the bounds", () => {
  // These additions must not inflate ordinary boards.
  const bounds = boundsWith({
    type: "pcb_via",
    pcb_via_id: "via_1",
    x: 0,
    y: 0,
    outer_diameter: 2,
    hole_diameter: 1,
    layers,
  })

  expect(bounds).toEqual({ minX: -5, minY: -5, maxX: 5, maxY: 5 })
})
