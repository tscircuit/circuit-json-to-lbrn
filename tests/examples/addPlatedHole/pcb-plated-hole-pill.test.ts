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
    pcb_board_id: "board_pill",
    width: 20,
    height: 20,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  // Large oval with different proportions
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_4",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_4",
    shape: "pill",
    port_hints: ["4"],
    x: 5,
    y: -5,
    outer_width: 8,
    outer_height: 2,
    hole_width: 6,
    hole_height: 1,
    ccw_rotation: 0,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_5",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_5",
    shape: "pill",
    port_hints: ["5"],
    x: 5,
    y: 5,
    outer_width: 8,
    outer_height: 2,
    hole_width: 6,
    hole_height: 1,
    ccw_rotation: 0,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_6",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_6",
    shape: "pill",
    port_hints: ["6"],
    x: -5,
    y: -5,
    outer_width: 8,
    outer_height: 2,
    hole_width: 6,
    hole_height: 1,
    ccw_rotation: 90,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_plated_hole",
    pcb_plated_hole_id: "pcb_plated_hole_7",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_7",
    shape: "pill",
    port_hints: ["7"],
    x: -5,
    y: 5,
    outer_width: 8,
    outer_height: 2,
    hole_width: 6,
    hole_height: 1,
    ccw_rotation: 45,
    layers: ["top", "bottom"],
  },
]

test("renders pill plated holes with different orientations", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson)

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
