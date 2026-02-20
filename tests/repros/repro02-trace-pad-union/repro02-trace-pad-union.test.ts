import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { KicadToCircuitJsonConverter } from "kicad-to-circuit-json"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import pcbContent from "./repro02-trace-pad-union.kicad_pcb" with {
  type: "text",
}

test.skip("repro02 - trace should union with pad in copper cut fill", async () => {
  const converter = new KicadToCircuitJsonConverter()
  converter.addFile("repro02-trace-pad-union.kicad_pcb", pcbContent)
  converter.runUntilFinished()

  const typedCircuitJson = converter.getOutput() as CircuitJson
  const pcbSvg = await convertCircuitJsonToPcbSvg(typedCircuitJson)

  const project = await convertCircuitJsonToLbrn(typedCircuitJson, {
    includeLayers: ["top"],
    includeCopper: true,
    includeCopperCutFill: true,
    copperCutFillMargin: 0.5,
  })

  const lbrnSvg = await generateLightBurnSvg(project, {
    defaultStrokeWidth: 0.01,
  })

  Bun.write("debug-output/repro02-trace-pad-union.lbrn2", project.getString(), {
    createPath: true,
  })

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )

  expect(lbrnSvg).not.toContain("95.7800000011921 1.6000000014901161")
})
