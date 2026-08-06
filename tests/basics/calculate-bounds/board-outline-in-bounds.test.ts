import { test, expect } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToLbrn } from "lib/index"
import { calculateCircuitBounds } from "lib/calculateBounds"

const board: CircuitJson[number] = {
  type: "pcb_board",
  pcb_board_id: "board1",
  center: { x: 0, y: 0 },
  width: 30,
  height: 10,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
}

const pad: CircuitJson[number] = {
  type: "pcb_smtpad",
  pcb_smtpad_id: "pad1",
  shape: "rect",
  x: 0,
  y: 0,
  width: 2,
  height: 2,
  layer: "top",
}

const collectVerts = (shapes: any[]): Array<{ x: number; y: number }> => {
  const verts: Array<{ x: number; y: number }> = []
  for (const shape of shapes) {
    if (shape.verts) {
      for (const vert of shape.verts) verts.push({ x: vert.x, y: vert.y })
    }
    if (shape.children) verts.push(...collectVerts(shape.children))
  }
  return verts
}

test("board width and height participate in the bounds", () => {
  const bounds = calculateCircuitBounds([board, pad])

  expect(bounds).toEqual({ minX: -15, minY: -5, maxX: 15, maxY: 5 })
})

test("board outline participates in the bounds", () => {
  // addPcbBoard cuts the outline when there is one, so that is the extent
  const bounds = calculateCircuitBounds([
    {
      ...board,
      outline: [
        { x: 0, y: 0 },
        { x: 40, y: 0 },
        { x: 40, y: 15 },
        { x: 5, y: 15 },
        { x: 0, y: 10 },
      ],
    },
    pad,
  ])

  expect(bounds).toEqual({ minX: -1, minY: -1, maxX: 40, maxY: 15 })
})

test("copper hanging past the board edge still widens the bounds", () => {
  const bounds = calculateCircuitBounds([
    board,
    { ...pad, pcb_smtpad_id: "pad2", x: 16, y: 0 },
  ])

  expect(bounds).toEqual({ minX: -15, minY: -5, maxX: 17, maxY: 5 })
})

test("the board outline is not emitted at negative coordinates", async () => {
  const project = await convertCircuitJsonToLbrn([board, pad])

  const verts = collectVerts(project.children as any)
  expect(verts.length).toBeGreaterThan(0)

  const minVertX = Math.min(...verts.map((vert) => vert.x))
  const minVertY = Math.min(...verts.map((vert) => vert.y))
  expect(minVertX).toBeGreaterThanOrEqual(0)
  expect(minVertY).toBeGreaterThanOrEqual(0)
})
