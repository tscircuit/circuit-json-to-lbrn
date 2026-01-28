import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { stackSvgsVertically } from "stack-svgs"
import { convertCircuitJsonToLbrn } from "../../../lib"
import circuitJson from "../../examples/example04/1206x4_3216metric.json" with {
  type: "json",
}

test("soldermask-cure-with-solderMaskMarginPercent", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson as CircuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeCopper: true,
    includeSoldermask: true,
    includeSoldermaskCure: true,
    solderMaskMarginPercent: -10,
  })

  Bun.write("debug-output/soldermask-cure.lbrn2", project.getString(), {
    createPath: true,
  })

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
