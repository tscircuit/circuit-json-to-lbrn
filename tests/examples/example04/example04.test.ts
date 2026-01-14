import { test, expect } from "bun:test"
import circuitJson from "./1206x4_3216metric.json" with { type: "json" }
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

test("example04 - issue with rect pads and trace  ", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson as CircuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeLayers: ["top"],
  })

  Bun.write("debug-output/example04.lbrn2", project.getString(), {
    createPath: true,
  })

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
