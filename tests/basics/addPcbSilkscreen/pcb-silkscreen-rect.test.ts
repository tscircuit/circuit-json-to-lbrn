import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_silkscreen",
    width: 20,
    height: 20,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "silkscreen_1",
    layer: "top",
    center: { x: -5, y: 5 },
    width: 4,
    height: 3,
    stroke_width: 0.1,
    is_filled: false,
  },
  {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "silkscreen_2",
    layer: "top",
    center: { x: 5, y: -5 },
    width: 3,
    height: 4,
    is_filled: true,
  },
  {
    type: "pcb_silkscreen_rect",
    pcb_silkscreen_rect_id: "silkscreen_3",
    layer: "bottom",
    center: { x: 0, y: 0 },
    width: 2,
    height: 2,
    stroke_width: 0.15,
    is_filled: false,
  },
]

test("renders pcb silkscreen rectangles with filled and stroked styles", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson, {
    includeSilkscreen: true,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
