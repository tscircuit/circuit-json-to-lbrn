import { expect, test } from "bun:test"
import type { CircuitJson, SourceTrace } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { stackSvgsVertically } from "stack-svgs"
import { convertCircuitJsonToLbrn } from "../../../lib"

test.skip("repro02 - trace inside copper cut pad should be unioned", async () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      shape: "rect",
      x: -3,
      y: 0,
      width: 5,
      height: 4,
      layer: "top",
      pcb_component_id: "comp_1",
      pcb_port_id: "port_1",
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_2",
      shape: "rect",
      x: 5,
      y: 0,
      width: 2,
      height: 2,
      layer: "top",
      pcb_component_id: "comp_2",
      pcb_port_id: "port_2",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_1",
      source_trace_id: "trace_1",
      route: [
        { x: -4, y: 0, width: 0.5, layer: "top" },
        { x: -2, y: 0, width: 0.5, layer: "top" },
        { x: 4, y: 0, width: 0.5, layer: "top" },
      ],
    },
    {
      type: "pcb_port",
      pcb_port_id: "port_1",
      pcb_component_id: "comp_1",
      layers: ["top"],
      x: -3,
      y: 0,
      source_port_id: "source_port_1",
    },
    {
      type: "pcb_port",
      pcb_port_id: "port_2",
      pcb_component_id: "comp_2",
      layers: ["top"],
      x: 5,
      y: 0,
      source_port_id: "source_port_2",
    },
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
    includeLayers: ["top"],
    copperCutFillMargin: 0.6,
  })

  Bun.write(
    "debug-output/repro02-trace-inside-copper-cut-pad.lbrn2",
    project.getString(),
    {
      createPath: true,
    },
  )

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )

  // Expected to fail until trace/pad copper-cut geometries are unioned.
  const hasInteriorTraceLineInPad = /L 5\.1 1\.85 L 9\.488/.test(lbrnSvg)
  expect(hasInteriorTraceLineInPad).toBe(false)
})
