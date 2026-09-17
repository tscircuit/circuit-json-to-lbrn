import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { calculateCircuitBounds } from "lib/calculateBounds"
import motorController from "../assets/motor-controller.json"

test("calculateCircuitBounds includes pcb_hole elements (#181)", () => {
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
  ]

  const bounds = calculateCircuitBounds(circuitJson as any)
  expect(bounds).toEqual({ minX: -0.5, minY: -1, maxX: 11, maxY: 1 })
})

test("calculateCircuitBounds accounts for motor-controller mounting holes at corners", () => {
  const bounds = calculateCircuitBounds(motorController as CircuitJson)

  // Motor controller has 4 mounting holes of diameter 1 at (±48, ±33)
  expect(bounds.minX).toBeLessThanOrEqual(-48.5)
  expect(bounds.minY).toBeLessThanOrEqual(-33.5)
  expect(bounds.maxX).toBeGreaterThanOrEqual(48.5)
  expect(bounds.maxY).toBeGreaterThanOrEqual(33.5)
})

test("calculateCircuitBounds accounts for rectangular/oval unplated holes and vias", () => {
  const circuitJson = [
    {
      type: "pcb_hole",
      pcb_hole_id: "hole_rect",
      hole_shape: "rect",
      hole_width: 4,
      hole_height: 6,
      x: -20,
      y: -10,
    },
    {
      type: "pcb_via",
      pcb_via_id: "via_1",
      x: 30,
      y: 15,
      outer_diameter: 2,
      hole_diameter: 1,
    },
  ]

  const bounds = calculateCircuitBounds(circuitJson as any)
  expect(bounds.minX).toBe(-22)
  expect(bounds.maxX).toBe(31)
  expect(bounds.minY).toBe(-13)
  expect(bounds.maxY).toBe(16)
})
