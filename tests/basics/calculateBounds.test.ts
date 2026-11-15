import { test, expect } from "bun:test"
import { calculateCircuitBounds } from "lib/calculateBounds"
import type { CircuitJson } from "circuit-json"

const referencePad = {
  type: "pcb_smtpad",
  pcb_smtpad_id: "pad",
  shape: "rect",
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  layer: "top",
} as const

test("calculateCircuitBounds includes circular pcb_hole elements", () => {
  // Repro from issue #181
  const bounds = calculateCircuitBounds([
    referencePad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole",
      hole_shape: "circle",
      hole_diameter: 2,
      x: 10,
      y: 0,
    },
  ] as CircuitJson)

  expect(bounds).toEqual({ minX: -0.5, minY: -1, maxX: 11, maxY: 1 })
})

test("calculateCircuitBounds includes square pcb_hole elements", () => {
  const bounds = calculateCircuitBounds([
    referencePad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole",
      hole_shape: "square",
      hole_diameter: 4,
      x: -6,
      y: 5,
    },
  ] as CircuitJson)

  expect(bounds).toEqual({ minX: -8, minY: -0.5, maxX: 0.5, maxY: 7 })
})

test("calculateCircuitBounds includes rect pcb_hole elements", () => {
  const bounds = calculateCircuitBounds([
    referencePad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole",
      hole_shape: "rect",
      hole_width: 4,
      hole_height: 2,
      x: 10,
      y: -8,
    },
  ] as CircuitJson)

  expect(bounds).toEqual({ minX: -0.5, minY: -9, maxX: 12, maxY: 0.5 })
})

test("calculateCircuitBounds includes oval pcb_hole elements", () => {
  const bounds = calculateCircuitBounds([
    referencePad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole",
      hole_shape: "oval",
      hole_width: 6,
      hole_height: 2,
      x: -10,
      y: 0,
    },
  ] as CircuitJson)

  expect(bounds).toEqual({ minX: -13, minY: -1, maxX: 0.5, maxY: 1 })
})

test("calculateCircuitBounds includes pill pcb_hole elements", () => {
  const bounds = calculateCircuitBounds([
    referencePad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole",
      hole_shape: "pill",
      hole_width: 2,
      hole_height: 6,
      x: 0,
      y: 10,
    },
  ] as CircuitJson)

  expect(bounds).toEqual({ minX: -1, minY: -0.5, maxX: 1, maxY: 13 })
})

test("calculateCircuitBounds includes rotated pill pcb_hole elements", () => {
  // A 6x2 pill rotated 90° occupies a 2x6 axis-aligned footprint
  const bounds = calculateCircuitBounds([
    referencePad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole",
      hole_shape: "rotated_pill",
      hole_width: 6,
      hole_height: 2,
      ccw_rotation: 90,
      x: 10,
      y: 0,
    },
  ] as CircuitJson)

  expect(bounds.minX).toBeCloseTo(-0.5)
  expect(bounds.minY).toBeCloseTo(-3)
  expect(bounds.maxX).toBeCloseTo(11)
  expect(bounds.maxY).toBeCloseTo(3)
})

test("calculateCircuitBounds keeps corner mounting holes inside the work area after origin shift", () => {
  // Motor-controller style board: four unplated mounting holes at the
  // corners must extend the bounds beyond the pads/traces
  const corners = [
    [-48, -33],
    [48, -33],
    [-48, 33],
    [48, 33],
  ] as const

  const bounds = calculateCircuitBounds([
    referencePad,
    ...corners.map(([x, y], i) => ({
      type: "pcb_hole" as const,
      pcb_hole_id: `hole_${i}`,
      hole_shape: "circle" as const,
      hole_diameter: 3,
      x,
      y,
    })),
  ] as CircuitJson)

  expect(bounds).toEqual({ minX: -49.5, minY: -34.5, maxX: 49.5, maxY: 34.5 })
})
