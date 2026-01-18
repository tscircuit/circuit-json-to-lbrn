import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

/**
 * This test demonstrates a via connected to a trace through proper connectivity.
 * The trace, via, and pad should be merged into a single copper geometry since they
 * share the same net through the source_trace connectivity.
 *
 * Key requirements for connectivity:
 * 1. pcb_trace must have a source_trace_id
 * 2. Via needs a pcb_port with source_port_id
 * 3. source_trace must list both source_port_ids in connected_source_port_ids
 */
const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    width: 15,
    height: 15,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "source_port",
    source_port_id: "source_port_1",
    name: "pin1",
  },
  {
    type: "source_port",
    source_port_id: "source_port_2",
    name: "pin2",
  },
  {
    type: "source_port",
    source_port_id: "source_port_3",
    name: "via1",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    pcb_port_id: "pcb_port_1",
    shape: "rect",
    x: -4,
    y: 0,
    width: 1,
    height: 0.8,
    layer: "top",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_2",
    pcb_port_id: "pcb_port_2",
    shape: "rect",
    x: -2,
    y: 0,
    width: 1,
    height: 0.8,
    layer: "top",
  },
  {
    type: "pcb_via",
    pcb_via_id: "via_1",
    x: 2,
    y: 0,
    outer_diameter: 1.2,
    hole_diameter: 0.6,
    layers: ["top", "bottom"],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace_1",
    source_trace_id: "source_trace_1",
    route: [
      { x: -2, y: 0, width: 0.3, layer: "top", route_type: "wire" },
      { x: 2, y: 0, width: 0.3, layer: "top", route_type: "wire" },
    ],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    x: -4,
    y: 0,
    layers: ["top"],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_2",
    source_port_id: "source_port_2",
    x: -2,
    y: 0,
    layers: ["top"],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_3",
    source_port_id: "source_port_3",
    x: 2,
    y: 0,
    layers: ["top", "bottom"],
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_1",
    connected_source_port_ids: ["source_port_2", "source_port_3"],
    connected_source_net_ids: [],
  },
]

test("renders pcb via connected to net with trace merging", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson)

  const lbrnSvg = generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
