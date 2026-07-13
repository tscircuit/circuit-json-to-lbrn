import { test, expect } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { calculateCircuitBounds } from "../../lib/calculateBounds"

// pcb_hole elements are rendered by addPcbHole but were omitted from
// calculateCircuitBounds, so a hole at the edge of the layout did not expand
// the bounds and could be shifted outside the intended laser area.
test("calculateCircuitBounds includes pcb_hole elements", () => {
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

  // A rotated pill's real extents depend on its rotation, so the bounds must
  // follow the rendered path: a 2x10 pill at 45deg reaches ~3.83, not the
  // unrotated 1.
  const rotatedPillBounds = calculateCircuitBounds([
    {
      type: "pcb_hole",
      pcb_hole_id: "rotated",
      hole_shape: "rotated_pill",
      hole_width: 2,
      hole_height: 10,
      ccw_rotation: 45,
      x: 0,
      y: 0,
    },
  ] as unknown as CircuitJson)

  expect(rotatedPillBounds.maxX).toBeCloseTo(3.828, 3)
  expect(rotatedPillBounds.maxY).toBeCloseTo(3.828, 3)
})
