import { expect, test } from "bun:test"
import circuitJson from "../assets/tscircuit-tetris-v2.circuit.json" with {
  type: "json",
}
import type { CircuitJson } from "circuit-json"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../lib"

test("tscircuit-tetris-v2", async () => {
  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeCopperCutFill: true,
    includeLayers: ["top"],
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(lbrnSvg).toMatchSvgSnapshot(import.meta.filename)
})
