import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "source_port",
    name: "via1",
    source_port_id: "source_port_1",
  },
  {
    type: "pcb_board",
    pcb_board_id: "board_polygon",
    width: 20,
    height: 20,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_polygon",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_1",
    hole_diameter: 2,
    hole_shape: "circle",
    hole_offset_x: 0,
    hole_offset_y: 0,
    shape: "hole_with_polygon_pad",
    port_hints: ["1"],
    x: 0,
    y: 0,
    layers: ["top", "bottom"],
    pad_outline: [
      { x: -2, y: -2 },
      { x: 2, y: -2 },
      { x: 3, y: 2 },
      { x: 2, y: 3 },
      { x: -2, y: 3 },
      { x: -2, y: -2 },
    ],
  },
]

test("convert pcb plated hole with polygon pad to lbrn", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson)

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
