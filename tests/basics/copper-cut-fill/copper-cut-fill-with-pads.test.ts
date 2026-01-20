import { expect, test } from "bun:test"
import type { CircuitJson, SourceTrace } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { stackSvgsVertically } from "stack-svgs"
import { convertCircuitJsonToLbrn } from "../../../lib"

/**
 * Test copper cut fill with traces and SMT pads.
 * The copper cut fill should create a ring/band around both the trace and pads,
 * ensuring that:
 * 1. The cut fill never cuts into the traces or pads
 * 2. The cut fill creates a uniform margin around all copper features
 * 3. Where traces connect to pads, the cut fill is continuous around the connection
 */
test("copper-cut-fill-with-pads", async () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      width: 30,
      height: 20,
      center: { x: 0, y: 0 },
    },
    // Two SMT pads connected by a trace
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      shape: "rect",
      x: -8,
      y: 0,
      width: 2,
      height: 3,
      layer: "top",
      pcb_component_id: "comp_1",
      pcb_port_id: "port_1",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_2",
      shape: "rect",
      x: 8,
      y: 0,
      width: 2,
      height: 3,
      layer: "top",
      pcb_component_id: "comp_2",
      pcb_port_id: "port_2",
    },
    // Trace connecting the two pads
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_1",
      source_trace_id: "trace_1",
      route: [
        { x: -7, y: 0, width: 0.5, layer: "top" },
        { x: 7, y: 0, width: 0.5, layer: "top" },
      ],
    },
    // PCB ports
    {
      type: "pcb_port",
      pcb_port_id: "port_1",
      pcb_component_id: "comp_1",
      layers: ["top"],
      x: -8,
      y: 0,
      source_port_id: "source_port_1",
    },
    {
      type: "pcb_port",
      pcb_port_id: "port_2",
      pcb_component_id: "comp_2",
      layers: ["top"],
      x: 8,
      y: 0,
      source_port_id: "source_port_2",
    },
    // Source elements for connectivity
    {
      type: "source_port",
      source_port_id: "source_port_1",
      source_component_id: "source_comp_1",
      name: "1",
    },
    {
      type: "source_port",
      source_port_id: "source_port_2",
      source_component_id: "source_comp_2",
      name: "1",
    },
    {
      type: "source_trace",
      source_trace_id: "trace_1",
      connected_source_net_ids: ["net_1"],
      connected_source_port_ids: ["source_port_1", "source_port_2"],
    } as SourceTrace,
    {
      type: "source_net",
      source_net_id: "net_1",
      name: "VCC",
      member_source_group_ids: [],
    },
  ] as CircuitJson

  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: true,
    includeCopperCutFill: true,
    copperCutFillMargin: 0.8, // Larger margin to clearly see the cut fill
    includeLayers: ["top"],
  })

  Bun.write(
    "debug-output/copper-cut-fill-with-pads.lbrn2",
    project.getString(),
    {
      createPath: true,
    },
  )

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
