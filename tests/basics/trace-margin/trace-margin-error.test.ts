import { test, expect } from "bun:test"
import { convertCircuitJsonToLbrn } from "../../../lib"
import type { CircuitJson } from "circuit-json"

test("trace-margin - error when includeCopper is false", async () => {
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

  await expect(
    convertCircuitJsonToLbrn(circuitJson, {
      includeCopper: false,
      traceMargin: 0.3,
    }),
  ).rejects.toThrow("traceMargin requires includeCopper to be true")
})
