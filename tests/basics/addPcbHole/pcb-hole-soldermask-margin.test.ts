import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_soldermask_margin",
    width: 10,
    height: 10,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pcb_hole_circle_margin",
    hole_shape: "circle",
    hole_diameter: 1.5,
    soldermask_margin: 0.5,
    x: -2,
    y: 2,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pcb_hole_rect_margin",
    hole_shape: "rect",
    hole_width: 2,
    hole_height: 1.5,
    soldermask_margin: 0.3,
    x: 2,
    y: 2,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pcb_hole_pill_margin",
    hole_shape: "pill",
    hole_width: 3,
    hole_height: 1.5,
    soldermask_margin: 0.2,
    x: 0,
    y: -2,
  },
]

test("renders pcb holes with soldermask_margin", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeSoldermask: true,
    // Note: globalCopperSoldermaskMarginAdjustment not applied to holes
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
