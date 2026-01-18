import { test, expect } from "bun:test"
import circuitJson from "./example03.circuit.json" with { type: "json" }
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

test("example03 - issue with trace merging", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson as CircuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeLayers: ["top"],
  })

  Bun.write("debug-output/example02.lbrn2", project.getString(), {
    createPath: true,
  })
  console.log("debug-output/example02.lbrn2")

  const lbrnSvg = await generateLightBurnSvg(project, {
    margin: 0,
    width: 600,
    height: 400,
    defaultStrokeWidth: 0.03,
  })

  expect(lbrnSvg).toMatchSvgSnapshot(import.meta.filename)

  // expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
  //   import.meta.filename,
  // )
})
