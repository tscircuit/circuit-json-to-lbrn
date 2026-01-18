import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "source_port",
    name: "port1",
    source_port_id: "sp1",
  },
  {
    type: "source_port",
    name: "port2",
    source_port_id: "sp2",
  },
  {
    type: "source_trace",
    source_trace_id: "st1",
    connected_source_port_ids: ["sp1", "sp2"],
    connected_source_net_ids: [],
  },
  {
    type: "pcb_board",
    pcb_board_id: "board1",
    center: { x: 5, y: 5 },
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    outline: [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 15 },
      { x: 5, y: 15 },
      { x: 0, y: 10 },
    ],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp1",
    source_port_id: "sp1",
    x: 10,
    y: 5,
    layers: ["top"],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pp2",
    source_port_id: "sp2",
    x: 30,
    y: 5,
    layers: ["top"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pad1",
    pcb_port_id: "pp1",
    shape: "rect",
    x: 10,
    y: 5,
    width: 2,
    height: 3,
    layer: "top",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "trace1",
    source_trace_id: "st1",
    route: [
      {
        x: 10,
        y: 5,
        width: 0.5,
        layer: "top",
        route_type: "wire",
        start_pcb_port_id: "pp1",
      },
      {
        x: 30,
        y: 5,
        width: 0.5,
        layer: "top",
        route_type: "wire",
        end_pcb_port_id: "pp2",
      },
    ],
  },
]

test("creates board outline cut with through-board setting", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson)

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
