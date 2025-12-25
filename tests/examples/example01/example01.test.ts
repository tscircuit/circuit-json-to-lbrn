import { test, expect } from "bun:test"
import circuitJson from "./example01.circuit.json" with { type: "json" }
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

test("example01 - rp2040 zero with two interconnects", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson as CircuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson as CircuitJson)

  // Bun.write("debug-output/lga-interconnect.lbrn2", project.getString(), {
  //   createPath: true,
  // })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(lbrnSvg).toMatchSvgSnapshot(import.meta.filename)

  // expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
  //   import.meta.filename,
  // )
})
