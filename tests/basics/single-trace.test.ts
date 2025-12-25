import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson, SourceTrace } from "circuit-json"

/**
 * This test demonstrates a bug where standalone traces (traces not connected
 * to any ports/nets) are not being converted to cut shapes in the LightBurn output.
 *
 * Expected: The trace should appear as a cut shape in the bottom SVG
 * Actual: The trace is missing from the LightBurn output (only CutSetting is present)
 *
 * Root cause: addPcbTrace gets netId=undefined for unconnected traces, and
 * netGeoms.get(undefined) returns undefined, so the trace polygon is never added.
 */
test("single-trace", async () => {
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
          y: -5,
          width: 0.5,
          layer: "top",
        },
        {
          x: 5,
          y: 5,
          width: 0.5,
          layer: "top",
        },
      ],
    },
    {
      type: "source_trace",
      source_trace_id: "trace_2",
      connected_source_net_ids: [],
      connected_source_port_ids: [],
    } as SourceTrace,
  ] as CircuitJson

  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson)

  Bun.write("debug-output/single-trace.lbrn2", project.getString(), {
    createPath: true,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
