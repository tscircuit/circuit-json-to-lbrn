import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { KicadToCircuitJsonConverter } from "kicad-to-circuit-json"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import padOnlyPcb from "./repro02-pad-only.kicad_pcb" with { type: "text" }
import traceInsidePadPcb from "./repro02-trace-pad-union.kicad_pcb" with {
  type: "text",
}

const convertKicadToCircuitJson = (
  filename: string,
  content: string,
): CircuitJson => {
  const converter = new KicadToCircuitJsonConverter()
  converter.addFile(filename, content)
  converter.runUntilFinished()
  return converter.getOutput() as CircuitJson
}

test.skip("repro02 - trace fully inside pad should not change copper cut fill", async () => {
  const padOnlyCircuitJson = convertKicadToCircuitJson(
    "repro02-pad-only.kicad_pcb",
    padOnlyPcb,
  )
  const traceInsidePadCircuitJson = convertKicadToCircuitJson(
    "repro02-trace-pad-union.kicad_pcb",
    traceInsidePadPcb,
  )

  const padOnlyPcbSvg = await convertCircuitJsonToPcbSvg(padOnlyCircuitJson)
  const traceInsidePadPcbSvg = await convertCircuitJsonToPcbSvg(
    traceInsidePadCircuitJson,
  )

  const toLbrnSvg = async (circuitJson: CircuitJson) => {
    const project = await convertCircuitJsonToLbrn(circuitJson, {
      includeLayers: ["top"],
      includeCopper: true,
      includeCopperCutFill: true,
      copperCutFillMargin: 0.5,
    })

    return generateLightBurnSvg(project, {
      defaultStrokeWidth: 0.01,
    })
  }

  const padOnlyLbrnSvg = await toLbrnSvg(padOnlyCircuitJson)
  const traceInsidePadLbrnSvg = await toLbrnSvg(traceInsidePadCircuitJson)

  expect(
    stackSvgsVertically([
      traceInsidePadPcbSvg,
      traceInsidePadLbrnSvg,
      padOnlyPcbSvg,
      padOnlyLbrnSvg,
    ]),
  ).toMatchSvgSnapshot(import.meta.filename)

  expect(traceInsidePadLbrnSvg).toBe(padOnlyLbrnSvg)
})
