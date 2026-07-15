import { test, expect } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { calculateCircuitBounds } from "../../lib/calculateBounds"

// pcb_hole elements are rendered by addPcbHole but are omitted from
// calculateCircuitBounds, so a hole at the edge of the layout does not expand
// the bounds and can be shifted outside the intended laser area.
// Fails on main until pcb_hole is included in the bounds.
test.failing("calculateCircuitBounds includes circular and non-circular pcb_hole elements", () => {
  const circuitJson = [
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad",
      shape: "rect",
      x: 0,
      y: 0,
      width: 1,
      height: 1,
      layer: "top",
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "hole",
      hole_shape: "circle",
      hole_diameter: 2,
      x: 10,
      y: 0,
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "rect_hole",
      hole_shape: "rect",
      hole_width: 4,
      hole_height: 2,
      x: -10,
      y: -10,
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "rotated_pill_hole",
      hole_shape: "rotated_pill",
      hole_width: 4,
      hole_height: 2,
      ccw_rotation: 90,
      x: 0,
      y: 10,
    },
  ] as unknown as CircuitJson

  const bounds = calculateCircuitBounds(circuitJson)

  // The rect hole spans x in [-12, -8], y in [-11, -9].
  // The circle hole spans x in [9, 11], y in [-1, 1].
  // The 90-degree rotated pill spans x in [-1, 1], y in [8, 12].
  expect(bounds).toEqual({ minX: -12, minY: -11, maxX: 11, maxY: 12 })
})
