import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

const circuitJson: CircuitJson = [
  {
    type: "pcb_board",
    pcb_board_id: "board_triangle",
    thickness: 1.6,
    num_layers: 2,
    material: "fr4",
    outline: [
      { x: 0, y: 0 },
      { x: 24, y: 0 },
      { x: 8, y: 16 },
    ],
    center: { x: 0, y: 0 },
  },
  {
    type: "source_component",
    source_component_id: "source_component_1",
    ftype: "simple_test_point",
    name: "TP_BOTTOM",
    supplier_part_numbers: {},
    footprint_variant: "pad",
    pad_shape: "rect",
    are_pins_interchangeable: true,
  },
  {
    type: "source_port",
    source_port_id: "source_port_1",
    source_component_id: "source_component_1",
    name: "pin1",
    pin_number: 1,
    port_hints: ["1", "pin1"],
  },
  {
    type: "source_port",
    source_port_id: "source_port_2",
    name: "trace_target",
    pin_number: 2,
    port_hints: ["2", "pin2"],
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_1",
    connected_source_port_ids: ["source_port_1", "source_port_2"],
    connected_source_net_ids: [],
  },
  {
    type: "pcb_component",
    pcb_component_id: "pcb_component_1",
    source_component_id: "source_component_1",
    center: { x: 6, y: 6 },
    width: 4,
    height: 4,
    layer: "bottom",
    rotation: 0,
    do_not_place: false,
    obstructs_within_bounds: true,
    position_mode: "relative_to_group_anchor",
    positioned_relative_to_pcb_board_id: "board_triangle",
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_1",
    source_port_id: "source_port_1",
    x: 6,
    y: 6,
    layers: ["bottom"],
  },
  {
    type: "pcb_port",
    pcb_port_id: "pcb_port_2",
    source_port_id: "source_port_2",
    x: 16,
    y: 4,
    layers: ["bottom"],
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_1",
    pcb_port_id: "pcb_port_1",
    shape: "rect",
    x: 6,
    y: 6,
    width: 2.4,
    height: 1.6,
    layer: "bottom",
  },
  {
    type: "pcb_smtpad",
    pcb_smtpad_id: "pcb_smtpad_2",
    pcb_port_id: "pcb_port_2",
    shape: "circle",
    x: 16,
    y: 4,
    radius: 0.9,
    layer: "bottom",
  },
  {
    type: "pcb_trace",
    pcb_trace_id: "pcb_trace_1",
    source_trace_id: "source_trace_1",
    route: [
      {
        x: 6,
        y: 6,
        width: 0.35,
        layer: "bottom",
        route_type: "wire",
        start_pcb_port_id: "pcb_port_1",
      },
      {
        x: 10,
        y: 8,
        width: 0.35,
        layer: "bottom",
        route_type: "wire",
      },
      {
        x: 16,
        y: 4,
        width: 0.35,
        layer: "bottom",
        route_type: "wire",
        end_pcb_port_id: "pcb_port_2",
      },
    ],
  },
]

test("triangle outline bottom component is mirrored in lbrn output", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeLayers: ["bottom"],
    mirrorBottomLayer: true,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
