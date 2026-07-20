import { test, expect } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { calculateCircuitBounds } from "../../lib/calculateBounds"

test("calculateCircuitBounds includes pcb_hole in bounds", () => {
  const circuitJson: CircuitJson = [
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
  ] as CircuitJson

  const bounds = calculateCircuitBounds(circuitJson)

  // smtpad covers -0.5..0.5; hole covers 9..11
  expect(bounds.minX).toBeCloseTo(-0.5, 5)
  expect(bounds.maxX).toBeCloseTo(11, 5)
  expect(bounds.minY).toBeCloseTo(-1, 5)
  expect(bounds.maxY).toBeCloseTo(1, 5)
})

test("calculateCircuitBounds with only pcb_holes returns correct bounds", () => {
  const circuitJson: CircuitJson = [
    {
      type: "pcb_hole",
      pcb_hole_id: "hole1",
      hole_shape: "circle",
      hole_diameter: 3.2,
      x: -48,
      y: -33,
    },
    {
      type: "pcb_hole",
      pcb_hole_id: "hole2",
      hole_shape: "circle",
      hole_diameter: 3.2,
      x: 48,
      y: 33,
    },
  ] as CircuitJson

  const bounds = calculateCircuitBounds(circuitJson)
  const r = 1.6

  expect(bounds.minX).toBeCloseTo(-48 - r, 5)
  expect(bounds.maxX).toBeCloseTo(48 + r, 5)
  expect(bounds.minY).toBeCloseTo(-33 - r, 5)
  expect(bounds.maxY).toBeCloseTo(33 + r, 5)
})
