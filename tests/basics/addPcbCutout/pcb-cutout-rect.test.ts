import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_rect_cutout",
    width: 20,
    height: 20,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "cutout_1",
    shape: "rect",
    center: { x: -5, y: 5 },
    width: 4,
    height: 3,
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "cutout_2",
    shape: "rect",
    center: { x: 5, y: -5 },
    width: 3,
    height: 4,
    rotation: 45, // 45 degrees rotation
  },
]

test("renders rectangular pcb cutouts with through-board cuts", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson)

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
