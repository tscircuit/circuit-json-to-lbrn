import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { KicadToCircuitJsonConverter } from "kicad-to-circuit-json"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import pcbContent from "./repro02-trace-inside-pad-union.kicad_pcb" with {
  type: "text",
}

const getSvgs = async () => {
  const converter = new KicadToCircuitJsonConverter()
  converter.addFile("repro02-trace-inside-pad-union.kicad_pcb", pcbContent)
  converter.runUntilFinished()

  const circuitJson = converter.getOutput() as CircuitJson
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)
  const lbrnProject = await convertCircuitJsonToLbrn(circuitJson, {
    includeLayers: ["top"],
  })
  const lbrnSvg = await generateLightBurnSvg(lbrnProject, {
    defaultStrokeWidth: 0.01,
  })

  return { pcbSvg, lbrnSvg }
}

test("repro02 - trace inside pad is visible in lbrn output", async () => {
  const { pcbSvg, lbrnSvg } = await getSvgs()

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})

test.skip("repro02 - expected union should remove internal trace edges", async () => {
  const { lbrnSvg } = await getSvgs()

  const internalSegmentCount = (lbrnSvg.match(/stroke-width=\"0\.01\"/g) ?? [])
    .length

  // This assertion intentionally fails today: we still see internal stroke geometry
  // where the trace runs through the pad instead of being fully unioned.
  expect(internalSegmentCount).toBe(0)
})
