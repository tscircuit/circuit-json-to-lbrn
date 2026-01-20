import { test, expect } from "bun:test"
import circuitJson from "./example05.circuit.json" with { type: "json" }
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

test("example05 - copper fill conversion", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson as CircuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeLayers: ["top"],
    copperCutFillMargin: 0.5,
    includeCopperCutFill: true,
  })

  Bun.write("tmp/example05.lbrn2", project.getString(), {
    createPath: true,
  })
  console.log("tmp/example05.lbrn2")

  const lbrnSvg = await generateLightBurnSvg(project, {
    margin: 0,
    width: 600,
    height: 400,
    defaultStrokeWidth: 0.03,
  })

  expect(lbrnSvg).toMatchSvgSnapshot(import.meta.filename)
})
