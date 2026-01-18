import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson, SourceTrace } from "circuit-json"

/**
 * Test basic copper fill functionality with a single trace.
 * The copper fill should create a "ring" around the trace that removes
 * copper in the area between the trace and the expanded boundary,
 * but never cuts into the trace itself.
 */
test("copper-fill-basic", async () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_1",
      source_trace_id: "trace_1",
      route: [
        {
          x: -5,
          y: 0,
          width: 0.5,
          layer: "top",
        },
        {
          x: 5,
          y: 0,
          width: 0.5,
          layer: "top",
        },
      ],
    },
    {
      type: "source_trace",
      source_trace_id: "trace_1",
      connected_source_net_ids: ["net_1"],
      connected_source_port_ids: [],
    } as SourceTrace,
    {
      type: "source_net",
      source_net_id: "net_1",
      name: "NET1",
      member_source_group_ids: [],
    },
  ] as CircuitJson

  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: true,
    includeCopperFill: true,
    copperFillMargin: 0.5,
    includeLayers: ["top"],
  })

  Bun.write("debug-output/copper-fill-basic.lbrn2", project.getString(), {
    createPath: true,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
