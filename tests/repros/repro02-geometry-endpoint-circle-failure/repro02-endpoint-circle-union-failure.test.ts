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
    width: 20,
    height: 20,
    center: { x: 150, y: -45 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
  },
  {
    type: "source_port",
    source_port_id: "source_port_1",
    name: "U4.1",
  },
  {
    type: "source_port",
    source_port_id: "source_port_2",
    name: "J19.1",
  },
  {
    type: "source_port",
    source_port_id: "source_port_3",
    name: "J20.1",
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_1",
    connected_source_port_ids: [
      "source_port_1",
      "source_port_2",
      "source_port_3",
    ],
    connected_source_net_ids: [],
    display_name: "repro-net",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    pcb_component_id: "pcb_component_1",
    source_port_id: "source_port_1",
    x: 153.969826,
    y: -42,
    layers: ["top"],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_2",
    pcb_component_id: "pcb_component_2",
    source_port_id: "source_port_2",
    x: 156.119826,
    y: -39.2,
    layers: ["top"],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_3",
    pcb_component_id: "pcb_component_3",
    source_port_id: "source_port_3",
    x: 156.119826,
    y: -42,
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
      { x: 154.469826, y: -42.75 },
      { x: 153.969826, y: -42.75 },
      { x: 153.969826, y: -41.25 },
      { x: 154.469826, y: -41.25 },
    ],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_2",
    shape: "polygon",
    pcb_component_id: "pcb_component_2",
    pcb_port_id: "pcb_port_2",
    layer: "top",
    port_hints: ["1"],
    points: [
      { x: 156.619826, y: -39.95 },
      { x: 156.119826, y: -39.95 },
      { x: 156.119826, y: -38.45 },
      { x: 156.619826, y: -38.45 },
    ],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_3",
    shape: "polygon",
    pcb_component_id: "pcb_component_3",
    pcb_port_id: "pcb_port_3",
    layer: "top",
    port_hints: ["1"],
    points: [
      { x: 156.619826, y: -42.75 },
      { x: 156.119826, y: -42.75 },
      { x: 156.119826, y: -41.25 },
      { x: 156.619826, y: -41.25 },
    ],
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_1",
    source_trace_id: "source_trace_1",
    route: [
      {
        route_type: "wire",
        x: 156.119826,
        y: -42,
        width: 0.4,
        layer: "top",
        start_pcb_port_id: "pcb_port_3",
      },
      {
        route_type: "wire",
        x: 153.969826,
        y: -42,
        width: 0.4,
        layer: "top",
        end_pcb_port_id: "pcb_port_1",
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
        x: 156.119826,
        y: -39.2,
        width: 0.4,
        layer: "top",
        start_pcb_port_id: "pcb_port_2",
      },
      {
        route_type: "wire",
        x: 156.119826,
        y: -42,
        width: 0.4,
        layer: "top",
        end_pcb_port_id: "pcb_port_3",
      },
    ],
  },
]

test("repro02 - endpoint-circle union failure", async () => {
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
