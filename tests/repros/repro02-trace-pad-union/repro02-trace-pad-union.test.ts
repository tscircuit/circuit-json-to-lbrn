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

test("repro02 - trace that only touches pad edge does not union into one copper island", async () => {
  const converter = new KicadToCircuitJsonConverter()
  converter.addFile("repro02-trace-pad-union.kicad_pcb", pcbContent)
  converter.runUntilFinished()

  const typedCircuitJson = converter.getOutput() as CircuitJson
  const pcbSvg = await convertCircuitJsonToPcbSvg(typedCircuitJson)

  const project = await convertCircuitJsonToLbrn(typedCircuitJson, {
    includeLayers: ["top"],
  })

  const lbrnSvg = await generateLightBurnSvg(project, {
    defaultStrokeWidth: 0.01,
  })

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
