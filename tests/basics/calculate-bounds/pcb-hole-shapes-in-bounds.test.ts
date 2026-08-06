import { test, expect } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { calculateCircuitBounds } from "lib/calculateBounds"

const pad: CircuitJson[number] = {
  type: "pcb_smtpad",
  pcb_smtpad_id: "pad1",
  shape: "rect",
  x: 0,
  y: 0,
  width: 1,
  height: 1,
  layer: "top",
}

test("circular pcb_hole participates in the bounds", () => {
  const bounds = calculateCircuitBounds([
    pad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole1",
      hole_shape: "circle",
      hole_diameter: 2,
      x: 10,
      y: 0,
    },
  ])

  expect(bounds).toEqual({ minX: -0.5, minY: -1, maxX: 11, maxY: 1 })
})

test("square pcb_hole participates in the bounds", () => {
  // addCirclePcbHole draws hole_diameter for both circle and square holes
  const bounds = calculateCircuitBounds([
    pad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole1",
      hole_shape: "square",
      hole_diameter: 2,
      x: 10,
      y: 0,
    },
  ])

  expect(bounds).toEqual({ minX: -0.5, minY: -1, maxX: 11, maxY: 1 })
})

test("rect pcb_hole participates in the bounds", () => {
  const bounds = calculateCircuitBounds([
    pad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole1",
      hole_shape: "rect",
      hole_width: 4,
      hole_height: 2,
      x: 10,
      y: 0,
    },
  ])

  expect(bounds).toEqual({ minX: -0.5, minY: -1, maxX: 12, maxY: 1 })
})

test("oval pcb_hole participates in the bounds", () => {
  const bounds = calculateCircuitBounds([
    pad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole1",
      hole_shape: "oval",
      hole_width: 4,
      hole_height: 2,
      x: 10,
      y: 0,
    },
  ])

  expect(bounds).toEqual({ minX: -0.5, minY: -1, maxX: 12, maxY: 1 })
})

test("pill pcb_hole participates in the bounds", () => {
  const bounds = calculateCircuitBounds([
    pad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole1",
      hole_shape: "pill",
      hole_width: 4,
      hole_height: 2,
      x: 10,
      y: 0,
    },
  ])

  expect(bounds).toEqual({ minX: -0.5, minY: -1, maxX: 12, maxY: 1 })
})

test("rotated_pill pcb_hole is measured after rotation", () => {
  // A 4x2 pill turned a quarter turn spans 2 in x and 4 in y
  const bounds = calculateCircuitBounds([
    pad,
    {
      type: "pcb_hole",
      pcb_hole_id: "hole1",
      hole_shape: "rotated_pill",
      hole_width: 4,
      hole_height: 2,
      ccw_rotation: 90,
      x: 10,
      y: 0,
    },
  ])

  expect(bounds.maxX).toBeCloseTo(11, 6)
  expect(bounds.maxY).toBeCloseTo(2, 6)
  expect(bounds.minY).toBeCloseTo(-2, 6)
})

test("rotated_pill pcb_hole at 45 degrees keeps its cap radius", () => {
  // Only the straight section between the caps rotates, so the half extent is
  // (width - height) / 2 * cos(45) + height / 2
  const bounds = calculateCircuitBounds([
    {
      type: "pcb_hole",
      pcb_hole_id: "hole1",
      hole_shape: "rotated_pill",
      hole_width: 4,
      hole_height: 2,
      ccw_rotation: 45,
      x: 0,
      y: 0,
    },
  ])

  expect(bounds.maxX).toBeCloseTo(1 * Math.cos(Math.PI / 4) + 1, 6)
  expect(bounds.maxY).toBeCloseTo(1 * Math.sin(Math.PI / 4) + 1, 6)
})
