import { test, expect } from "bun:test"
import type { LayerRef } from "circuit-json"
import { calculateCircuitBounds } from "lib/calculateBounds"

const layers: LayerRef[] = ["top", "bottom"]

const platedHoleBase = {
  type: "pcb_plated_hole" as const,
  pcb_plated_hole_id: "ph1",
  x: 10,
  y: 0,
  layers,
}

test("pcb_via participates in the bounds", () => {
  const bounds = calculateCircuitBounds([
    {
      type: "pcb_via",
      pcb_via_id: "via1",
      x: 5,
      y: 0,
      outer_diameter: 2,
      hole_diameter: 1,
      layers: ["top", "bottom"],
    },
  ])

  expect(bounds).toEqual({ minX: 4, minY: -1, maxX: 6, maxY: 1 })
})

test("circle plated hole uses its outer diameter", () => {
  const bounds = calculateCircuitBounds([
    {
      ...platedHoleBase,
      shape: "circle",
      outer_diameter: 2,
      hole_diameter: 1,
    },
  ])

  expect(bounds).toEqual({ minX: 9, minY: -1, maxX: 11, maxY: 1 })
})

test("oval plated hole uses its outer width and height", () => {
  const bounds = calculateCircuitBounds([
    {
      ...platedHoleBase,
      shape: "oval",
      outer_width: 4,
      outer_height: 2,
      hole_width: 2,
      hole_height: 1,
      ccw_rotation: 0,
    },
  ])

  expect(bounds).toEqual({ minX: 8, minY: -1, maxX: 12, maxY: 1 })
})

test("pill plated hole uses its outer width and height", () => {
  const bounds = calculateCircuitBounds([
    {
      ...platedHoleBase,
      shape: "pill",
      outer_width: 4,
      outer_height: 2,
      hole_width: 2,
      hole_height: 1,
      ccw_rotation: 0,
    },
  ])

  expect(bounds).toEqual({ minX: 8, minY: -1, maxX: 12, maxY: 1 })
})

test("circular hole with rect pad uses the rect pad", () => {
  const bounds = calculateCircuitBounds([
    {
      ...platedHoleBase,
      shape: "circular_hole_with_rect_pad",
      hole_shape: "circle",
      pad_shape: "rect",
      hole_diameter: 1,
      rect_pad_width: 4,
      rect_pad_height: 2,
      hole_offset_x: 0,
      hole_offset_y: 0,
    },
  ])

  expect(bounds).toEqual({ minX: 8, minY: -1, maxX: 12, maxY: 1 })
})

test("pill hole with rect pad uses the rect pad", () => {
  const bounds = calculateCircuitBounds([
    {
      ...platedHoleBase,
      shape: "pill_hole_with_rect_pad",
      hole_shape: "pill",
      pad_shape: "rect",
      hole_width: 2,
      hole_height: 1,
      rect_pad_width: 4,
      rect_pad_height: 2,
      hole_offset_x: 0,
      hole_offset_y: 0,
    },
  ])

  expect(bounds).toEqual({ minX: 8, minY: -1, maxX: 12, maxY: 1 })
})

test("rotated pill hole with rect pad rotates the rect pad", () => {
  const bounds = calculateCircuitBounds([
    {
      ...platedHoleBase,
      shape: "rotated_pill_hole_with_rect_pad",
      hole_shape: "rotated_pill",
      pad_shape: "rect",
      hole_width: 2,
      hole_height: 1,
      hole_ccw_rotation: 90,
      rect_pad_width: 4,
      rect_pad_height: 2,
      rect_ccw_rotation: 90,
      hole_offset_x: 0,
      hole_offset_y: 0,
    },
  ])

  expect(bounds.minX).toBeCloseTo(9, 6)
  expect(bounds.maxX).toBeCloseTo(11, 6)
  expect(bounds.minY).toBeCloseTo(-2, 6)
  expect(bounds.maxY).toBeCloseTo(2, 6)
})

test("hole with polygon pad uses the pad outline", () => {
  const bounds = calculateCircuitBounds([
    {
      ...platedHoleBase,
      shape: "hole_with_polygon_pad",
      hole_shape: "circle",
      hole_diameter: 1,
      pad_outline: [
        { x: 8, y: -1 },
        { x: 12, y: -1 },
        { x: 12, y: 2 },
      ],
      hole_offset_x: 0,
      hole_offset_y: 0,
    },
  ])

  expect(bounds).toEqual({ minX: 8, minY: -1, maxX: 12, maxY: 2 })
})
