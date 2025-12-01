import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"
import { ShapePath } from "lbrnts"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board",
    width: 20,
    height: 20,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_smtpad",
    x: -5,
    y: 5,
    layer: "top",
    shape: "rect",
    pcb_smtpad_id: "rect_pad",
    width: 2,
    height: 3,
  },
  {
    type: "pcb_smtpad",
    x: 5,
    y: 5,
    layer: "top",
    shape: "circle",
    pcb_smtpad_id: "circle_pad",
    radius: 1.5,
  },
  {
    type: "pcb_smtpad",
    x: -5,
    y: -5,
    layer: "top",
    shape: "rotated_pill",
    pcb_smtpad_id: "pill_pad",
    width: 3,
    height: 1.5,
    radius: 0.75,
    ccw_rotation: 45,
  },
  {
    type: "pcb_smtpad",
    shape: "pill",
    x: 5,
    y: -5,
    layer: "top",
    pcb_smtpad_id: "plated_hole",
    width: 2,
    height: 3,
    radius: 0.75,
  },
]

test("renders soldermask with positive margin", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson, {
    includeSoldermask: true,
    includeCopper: true,
    soldermaskMargin: 0.2,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  // Verify soldermask shapes are larger than copper
  const soldermaskShapes = project.children.filter(
    (child): child is ShapePath =>
      child instanceof ShapePath && child.cutIndex === 2,
  )
  expect(soldermaskShapes.length).toBeGreaterThan(0)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
