import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_soldermask",
    width: 10,
    height: 10,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pcb_hole_1",
    hole_shape: "circle",
    hole_diameter: 1.5,
    x: -2,
    y: 2,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pcb_hole_2",
    hole_shape: "rect",
    hole_width: 2,
    hole_height: 1.5,
    x: 2,
    y: 2,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pcb_hole_3",
    hole_shape: "pill",
    hole_width: 3,
    hole_height: 1.5,
    x: 0,
    y: -2,
  },
]

test("renders pcb holes with soldermask openings", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson, {
    includeSoldermask: true,
    soldermaskMargin: 0.2,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
