import { test, expect } from "bun:test"
import { convertCircuitJsonToLbrn } from "../../../lib"
import type { CircuitJson } from "circuit-json"

test("copperFillExpansion requires includeCopper", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
    },
  ] as CircuitJson

  expect(() =>
    convertCircuitJsonToLbrn(circuitJson, {
      includeCopper: false,
      copperFillExpansion: 0.5,
    }),
  ).toThrow("copperFillExpansion requires includeCopper to be true")
})
