import { test, expect } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToLbrn } from "../lib/index"

test("manually inserted smtpad without net emits copper cut shape", () => {
  const circuitJson: CircuitJson = [
    {
      type: "pcb_smtpad",
      shape: "rect",
      pcb_smtpad_id: "manual_rect_pad",
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      layer: "top",
    },
  ]

  const project = convertCircuitJsonToLbrn(circuitJson)
  const shapePaths = project.children.filter(
    (child) => child.token === "Shape.Path",
  )

  expect(shapePaths.length).toBe(1)
  expect((shapePaths[0] as any).cutIndex).toBe(0)
  expect((shapePaths[0] as any).isClosed).toBe(true)
})

test("non-rect manually inserted smtpad without net emits copper cut shape", () => {
  const circuitJson: CircuitJson = [
    {
      type: "pcb_smtpad",
      shape: "circle",
      pcb_smtpad_id: "manual_circle_pad",
      x: 0,
      y: 0,
      radius: 1,
      layer: "top",
    },
  ]

  const project = convertCircuitJsonToLbrn(circuitJson)
  const shapePaths = project.children.filter(
    (child) => child.token === "Shape.Path",
  )

  expect(shapePaths.length).toBe(1)
  expect((shapePaths[0] as any).cutIndex).toBe(0)
  expect((shapePaths[0] as any).isClosed).toBe(true)
  expect((shapePaths[0] as any).verts.length).toBeGreaterThan(8)
})

test("overlapping manually inserted smt pads without nets share one copper island", () => {
  const circuitJson: CircuitJson = [
    {
      type: "pcb_smtpad",
      shape: "rect",
      pcb_smtpad_id: "manual_rect_pad_1",
      x: 0,
      y: 0,
      width: 2,
      height: 2,
      layer: "top",
    },
    {
      type: "pcb_smtpad",
      shape: "rect",
      pcb_smtpad_id: "manual_rect_pad_2",
      x: 1,
      y: 0,
      width: 2,
      height: 2,
      layer: "top",
    },
  ]

  const project = convertCircuitJsonToLbrn(circuitJson)
  const shapePaths = project.children.filter(
    (child) => child.token === "Shape.Path",
  )

  expect(shapePaths.length).toBe(1)
  expect((shapePaths[0] as any).cutIndex).toBe(0)
})
