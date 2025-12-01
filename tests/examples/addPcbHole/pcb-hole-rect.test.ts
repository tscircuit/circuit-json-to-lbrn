import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_rect",
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
    hole_shape: "rect",
    hole_width: 2,
    hole_height: 1.5,
    x: -1,
    y: 2,
  },
  {
    type: "pcb_hole",
    pcb_hole_id: "pcb_hole_2",
    hole_shape: "rect",
    hole_width: 1.5,
    hole_height: 2,
    x: 1,
    y: -1,
  },
]

test("renders rectangular pcb holes with through-board cuts", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson)

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
