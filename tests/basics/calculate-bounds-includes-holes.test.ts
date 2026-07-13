import { test, expect } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { calculateCircuitBounds } from "../../lib/calculateBounds"

// pcb_hole elements are rendered by addPcbHole but are omitted from
// calculateCircuitBounds, so a hole at the edge of the layout does not expand
// the bounds and can be shifted outside the intended laser area.
// Fails on main until pcb_hole is included in the bounds.
test.failing("calculateCircuitBounds includes pcb_hole elements", () => {
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
  ] as unknown as CircuitJson

  const bounds = calculateCircuitBounds(circuitJson)

  // The circle hole (diameter 2 at x=10) spans x in [9, 11], y in [-1, 1].
  expect(bounds).toEqual({ minX: -0.5, minY: -1, maxX: 11, maxY: 1 })
})
