import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { calculateCircuitBounds } from "lib/calculateBounds"

test("includes unplated pcb_hole in bounds (#181)", () => {
  const bounds = calculateCircuitBounds([
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
  ] as CircuitJson)

  expect(bounds).toEqual({ minX: -0.5, minY: -1, maxX: 11, maxY: 1 })
})

test("includes pcb_board width and height in bounds (#191)", () => {
  const bounds = calculateCircuitBounds([
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
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
  ] as CircuitJson)

  expect(bounds).toEqual({ minX: -10, minY: -5, maxX: 10, maxY: 5 })
})

test("includes pill, rotated, and polygon smtpads in bounds (#193)", () => {
  const pill = calculateCircuitBounds([
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pill",
      shape: "pill",
      x: 0,
      y: 0,
      width: 4,
      height: 1,
      layer: "top",
    },
  ] as CircuitJson)
  expect(pill).toEqual({ minX: -2, minY: -0.5, maxX: 2, maxY: 0.5 })

  const rotated = calculateCircuitBounds([
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "rotated",
      shape: "rotated_rect",
      x: 0,
      y: 0,
      width: 4,
      height: 2,
      ccw_rotation: 90,
      layer: "top",
    },
  ] as CircuitJson)
  expect(rotated.minX).toBeCloseTo(-1)
  expect(rotated.minY).toBeCloseTo(-2)
  expect(rotated.maxX).toBeCloseTo(1)
  expect(rotated.maxY).toBeCloseTo(2)

  const polygon = calculateCircuitBounds([
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "poly",
      shape: "polygon",
      layer: "top",
      points: [
        { x: -3, y: -1 },
        { x: 5, y: -1 },
        { x: 5, y: 2 },
        { x: -3, y: 2 },
      ],
    },
  ] as CircuitJson)
  expect(polygon).toEqual({ minX: -3, minY: -1, maxX: 5, maxY: 2 })
})

test("includes vias and non-circular plated holes in bounds (#195)", () => {
  const via = calculateCircuitBounds([
    {
      type: "pcb_via",
      pcb_via_id: "via",
      x: 8,
      y: 0,
      outer_diameter: 2,
      hole_diameter: 1,
      layers: ["top", "bottom"],
    },
  ] as CircuitJson)
  expect(via).toEqual({ minX: 7, minY: -1, maxX: 9, maxY: 1 })

  const pillHole = calculateCircuitBounds([
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "pill",
      shape: "pill",
      x: 0,
      y: 0,
      outer_width: 8,
      outer_height: 2,
      hole_width: 6,
      hole_height: 1,
      layers: ["top", "bottom"],
    },
  ] as CircuitJson)
  expect(pillHole).toEqual({ minX: -4, minY: -1, maxX: 4, maxY: 1 })
})
