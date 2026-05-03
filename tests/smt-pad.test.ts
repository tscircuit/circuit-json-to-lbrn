import { test, expect } from "bun:test"
import { convertCircuitJsonToLbrn } from "../lib/index"
import type { CircuitJson } from "circuit-json"

const shapePathsFrom = (project: ReturnType<typeof convertCircuitJsonToLbrn>) =>
  project.children.filter((child) => child.token === "Shape.Path")

test("netless smt pads are included in the copper fill union", () => {
  const circuitJson: CircuitJson = [
    {
      type: "pcb_smtpad",
      shape: "rect",
      pcb_smtpad_id: "manual_pad_1",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      shape: "rect",
      pcb_smtpad_id: "manual_pad_2",
      x: 1,
      y: 0,
      width: 2,
      height: 2,
      layer: "top",
    },
  ]

  const project = convertCircuitJsonToLbrn(circuitJson)

  // The overlapping manual pads should become one copper island, not two
  // separate legacy pad outlines.
  expect(shapePathsFrom(project)).toHaveLength(1)
})

test("rotated netless smt pads are included in copper output", () => {
  const circuitJson: CircuitJson = [
    {
      type: "pcb_smtpad",
      shape: "rotated_rect",
      pcb_smtpad_id: "manual_rotated_pad",
      x: 0,
      y: 0,
      width: 2,
      height: 1,
      ccw_rotation: 45,
      layer: "top",
    },
  ]

  const project = convertCircuitJsonToLbrn(circuitJson)
  const shapePaths = shapePathsFrom(project)

  expect(shapePaths).toHaveLength(1)

  const verts = (shapePaths[0] as any).verts as Array<{
    x: number
    y: number
  }>
  expect(new Set(verts.map((v) => v.x.toFixed(3))).size).toBeGreaterThan(2)
  expect(new Set(verts.map((v) => v.y.toFixed(3))).size).toBeGreaterThan(2)
})
