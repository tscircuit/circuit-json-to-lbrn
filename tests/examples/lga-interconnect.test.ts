import { test, expect } from "bun:test"
import circuitJson from "../assets/lga-interconnect.circuit.json" with {
  type: "json",
}
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

test("lga-interconnect", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson as CircuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson as CircuitJson)

  Bun.write("debug-output/lga-interconnect.lbrn2", project.getString(), {
    createPath: true,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
