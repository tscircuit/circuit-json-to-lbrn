import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

test("trace-margin-basic", async () => {
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
      connected_source_net_ids: [],
      connected_source_port_ids: [],
    },
  ] as CircuitJson

  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: true,
    traceMargin: 0.3,
    laserSpotSize: 0.005,
    includeLayers: ["top"],
  })

  Bun.write("debug-output/trace-margin-basic.lbrn2", project.getString(), {
    createPath: true,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
