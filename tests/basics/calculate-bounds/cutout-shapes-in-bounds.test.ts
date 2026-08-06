import { test, expect } from "bun:test"
import { calculateCircuitBounds } from "lib/calculateBounds"

test("circle pcb_cutout participates in the bounds", () => {
  const bounds = calculateCircuitBounds([
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout1",
      shape: "circle",
      center: { x: 10, y: 0 },
      radius: 1,
    },
  ])

  expect(bounds).toEqual({ minX: 9, minY: -1, maxX: 11, maxY: 1 })
})

test("rect pcb_cutout is measured after rotation", () => {
  const bounds = calculateCircuitBounds([
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout1",
      shape: "rect",
      center: { x: 10, y: 0 },
      width: 4,
      height: 2,
      rotation: 90,
    },
  ])

  expect(bounds.minX).toBeCloseTo(9, 6)
  expect(bounds.maxX).toBeCloseTo(11, 6)
  expect(bounds.minY).toBeCloseTo(-2, 6)
  expect(bounds.maxY).toBeCloseTo(2, 6)
})

test("polygon pcb_cutout participates in the bounds", () => {
  const bounds = calculateCircuitBounds([
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout1",
      shape: "polygon",
      points: [
        { x: 8, y: -1 },
        { x: 12, y: -1 },
        { x: 12, y: 2 },
      ],
    },
  ])

  expect(bounds).toEqual({ minX: 8, minY: -1, maxX: 12, maxY: 2 })
})

test("path pcb_cutout participates in the bounds", () => {
  // addPathPcbCutout draws the route as a polyline, so the route is the extent
  const bounds = calculateCircuitBounds([
    {
      type: "pcb_cutout",
      pcb_cutout_id: "cutout1",
      shape: "path",
      route: [
        { x: 8, y: 0 },
        { x: 12, y: 3 },
      ],
      slot_width: 1,
    },
  ])

  expect(bounds).toEqual({ minX: 8, minY: 0, maxX: 12, maxY: 3 })
})
