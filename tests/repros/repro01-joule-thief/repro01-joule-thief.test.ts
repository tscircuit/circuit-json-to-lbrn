import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import circuitJson from "./joulethief.circuit.json" with { type: "json" }

test("repro01 - joule thief visual regression", async () => {
  const typedCircuitJson = circuitJson as CircuitJson
  const pcbSvg = await convertCircuitJsonToPcbSvg(typedCircuitJson)

  const project = await convertCircuitJsonToLbrn(typedCircuitJson, {
    includeLayers: ["top"],
  })

  const lbrnSvg = await generateLightBurnSvg(project, {
    width: 1200,
    height: 900,
    defaultStrokeWidth: 0.01,
  })

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
