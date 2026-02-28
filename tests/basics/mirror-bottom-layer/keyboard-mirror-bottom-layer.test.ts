import { test, expect } from "bun:test"
import circuitJson from "../../assets/keyboard-default60.json" with {
  type: "json",
}
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"

test("keyboard-both-layers-includeSoldermask", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const mirroredProject = await convertCircuitJsonToLbrn(circuitJson, {
    includeLayers: ["top", "bottom"],
    includeSoldermask: false,
    mirrorBottomLayer: true,
    copperCutFillMargin: 0.1,
    includeCopperCutFill: true,
  })
  const notMirroredProject = await convertCircuitJsonToLbrn(circuitJson, {
    includeLayers: ["top", "bottom"],
    includeSoldermask: false,
    mirrorBottomLayer: false,
    copperCutFillMargin: 0.1,
    includeCopperCutFill: true,
  })
  Bun.write("debug-output/mirrored.lbrn2", mirroredProject.getString(), {
    createPath: true,
  })
  const notMirroredLbrnSvg = await generateLightBurnSvg(notMirroredProject)
  const mirroredLbrnSvg = await generateLightBurnSvg(mirroredProject)

  expect(
    stackSvgsVertically([notMirroredLbrnSvg, mirroredLbrnSvg]),
  ).toMatchSvgSnapshot(import.meta.filename)
})
