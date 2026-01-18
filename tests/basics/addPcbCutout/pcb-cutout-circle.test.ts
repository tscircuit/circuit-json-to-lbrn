import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_circle_cutout",
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
    shape: "circle",
    center: { x: -5, y: 5 },
    radius: 2,
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "cutout_2",
    shape: "circle",
    center: { x: 5, y: -5 },
    radius: 3,
  },
]

test("renders circular pcb cutouts with through-board cuts", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: true,
    includeSoldermask: true,
    globalCopperSoldermaskMarginAdjustment: 0.1,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
