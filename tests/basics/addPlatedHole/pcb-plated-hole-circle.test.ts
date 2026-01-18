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
    pcb_board_id: "board_circle",
    width: 10,
    height: 10,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_1",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_1",
    outer_diameter: 2,
    hole_diameter: 1,
    shape: "circle",
    port_hints: ["1"],
    x: -1,
    y: 3,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_2",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_2",
    outer_diameter: 4,
    hole_diameter: 3,
    shape: "circle",
    port_hints: ["2"],
    x: 1,
    y: -1,
    layers: ["top", "bottom"],
  },
]

test("renders a circle plated hole with copper cut", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson)

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
