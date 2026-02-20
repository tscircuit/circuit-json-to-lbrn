import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_1",
    width: 10,
    height: 10,
    center: { x: 0, y: 0 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "source_port",
    source_port_id: "source_port_1",
    name: "P1",
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_1",
    connected_source_port_ids: ["source_port_1"],
    connected_source_net_ids: [],
    display_name: "repro-net",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    pcb_component_id: "pcb_component_1",
    source_port_id: "source_port_1",
    x: 0.75,
    y: 0,
    layers: ["top"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    shape: "polygon",
    pcb_component_id: "pcb_component_1",
    pcb_port_id: "pcb_port_1",
    layer: "top",
    port_hints: ["1"],
    points: [
      { x: 0.75, y: -1 },
      { x: -0.75, y: -1 },
      { x: -0.75, y: 1 },
      { x: 0.75, y: 1 },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_1",
    source_trace_id: "source_trace_1",
    route: [
      {
        route_type: "wire",
        x: 1.6,
        y: 0,
        width: 0.2,
        layer: "top",
      },
      {
        route_type: "wire",
        x: 0.775,
        y: 0,
        width: 0.2,
        layer: "top",
      },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_2",
    source_trace_id: "source_trace_1",
    route: [
      {
        route_type: "wire",
        x: 0.775,
        y: 0,
        width: 0.2,
        layer: "top",
      },
      {
        route_type: "wire",
        x: 0.775,
        y: 1.375,
        width: 0.2,
        layer: "top",
      },
    ],
  },
]

test("repro03 - t-junction union failure", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeLayers: ["top"],
  })

  const lbrnSvg = await generateLightBurnSvg(project, {
    defaultStrokeWidth: 0.01,
  })

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
