import { test, expect } from "bun:test"
import { convertCircuitJsonToLbrn } from "../../lib"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 5, y: 5 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    outline: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ],
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "hole_1",
    hole_shape: "circle",
    hole_diameter: 1.2,
    x: 2,
    y: 3,
  },
  {
    type: "pcb_via",
    pcb_via_id: "via_1",
    x: 6,
    y: 5,
    outer_diameter: 3,
    hole_diameter: 2,
    layers: ["top", "bottom"],
  },
]

test("adds hole punch layers", async () => {
  const project = await convertCircuitJsonToLbrn(circuitJson)
  const lbrnXml = project.getString()

  expect(lbrnXml).toContain('<name Value="Hole Punch Top"/>')
  expect(lbrnXml).toContain('<name Value="Hole Punch Bottom"/>')
  expect(lbrnXml).not.toContain('<name Value="Hole Punch Text Top"/>')
  expect(lbrnXml).not.toContain('<name Value="Hole Punch Text Bottom"/>')
  expect(lbrnXml).not.toContain('Type="Text"')
  expect(lbrnXml).not.toContain('Str="')
  expect(lbrnXml).toContain('Shape Type="Path" CutIndex="14"')
  expect(lbrnXml).toContain('Shape Type="Path" CutIndex="15"')
})

test("can disable hole punch layers", async () => {
  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeHolePunch: false,
  })
  const lbrnXml = project.getString()

  expect(lbrnXml).not.toContain('<name Value="Hole Punch Top"/>')
  expect(lbrnXml).not.toContain('<name Value="Hole Punch Bottom"/>')
})
