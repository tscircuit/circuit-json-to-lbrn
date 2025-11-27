import { test, expect } from "bun:test"
import circuitJson from "../../assets/lga-interconnect.circuit.json" with {
  type: "json",
}
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"

test("lga-interconnect soldermask", async () => {
  const project = convertCircuitJsonToLbrn(circuitJson, { solderMask: true })

  Bun.write(
    "debug-output/lga-interconnect-soldermask.lbrn2",
    project.getString(),
    {
      createPath: true,
    },
  )

  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const lbrnSvg = await generateLightBurnSvg(project)

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
