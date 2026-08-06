import { test, expect } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { calculateCircuitBounds } from "lib/calculateBounds"

test("pill smt pad spans the same extent as the equivalent rect pad", () => {
  const rectBounds = calculateCircuitBounds([
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      shape: "rect",
      x: 5,
      y: 0,
      width: 4,
      height: 2,
      layer: "top",
    },
  ])
  const pillBounds = calculateCircuitBounds([
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      shape: "pill",
      x: 5,
      y: 0,
      width: 4,
      height: 2,
      radius: 1,
      layer: "top",
    },
  ])

  expect(rectBounds).toEqual({ minX: 3, minY: -1, maxX: 7, maxY: 1 })
  expect(pillBounds).toEqual(rectBounds)
})

test("rotated_rect smt pad is measured after rotation", () => {
  const bounds = calculateCircuitBounds([
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      shape: "rotated_rect",
      x: 5,
      y: 0,
      width: 4,
      height: 2,
      ccw_rotation: 90,
      layer: "top",
    },
  ])

  expect(bounds.minX).toBeCloseTo(4, 6)
  expect(bounds.maxX).toBeCloseTo(6, 6)
  expect(bounds.minY).toBeCloseTo(-2, 6)
  expect(bounds.maxY).toBeCloseTo(2, 6)
})

test("rotated_pill smt pad is measured after rotation", () => {
  const bounds = calculateCircuitBounds([
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      shape: "rotated_pill",
      x: 5,
      y: 0,
      width: 4,
      height: 2,
      radius: 1,
      ccw_rotation: 90,
      layer: "top",
    },
  ])

  expect(bounds.minX).toBeCloseTo(4, 6)
  expect(bounds.maxX).toBeCloseTo(6, 6)
  expect(bounds.minY).toBeCloseTo(-2, 6)
  expect(bounds.maxY).toBeCloseTo(2, 6)
})

test("polygon smt pad participates in the bounds", () => {
  // Polygon pads carry absolute points instead of an x/y center
  const bounds = calculateCircuitBounds([
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad1",
      shape: "polygon",
      points: [
        { x: 3, y: -1 },
        { x: 7, y: -1 },
        { x: 7, y: 2 },
      ],
      layer: "top",
    },
  ])

  expect(bounds).toEqual({ minX: 3, minY: -1, maxX: 7, maxY: 2 })
})
