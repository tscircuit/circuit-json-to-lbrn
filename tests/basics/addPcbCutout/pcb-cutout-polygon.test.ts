import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_polygon_cutout",
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
    shape: "polygon",
    points: [
      { x: -8, y: 6 },
      { x: -4, y: 8 },
      { x: -2, y: 6 },
      { x: -4, y: 4 },
    ],
  },
  {
    type: "pcb_cutout",
    pcb_cutout_id: "cutout_2",
    shape: "polygon",
    points: [
      { x: 3, y: -3 },
      { x: 7, y: -3 },
      { x: 7, y: -7 },
      { x: 5, y: -8 },
      { x: 3, y: -7 },
    ],
  },
]

test("renders polygon pcb cutouts with through-board cuts", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson)

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
