import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { KicadToCircuitJsonConverter } from "kicad-to-circuit-json"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"

const JOULE_THIEF_PCB_URL =
  "https://raw.githubusercontent.com/fishPointer/Joule-Thief/main/KiCAD/Joule%20Thief/Joule%20Thief.kicad_pcb"

test("repro01 - joule thief visual regression", async () => {
  const response = await fetch(JOULE_THIEF_PCB_URL)
  expect(response.ok).toBe(true)

  const pcbContent = await response.text()

  const converter = new KicadToCircuitJsonConverter()
  converter.addFile("Joule Thief.kicad_pcb", pcbContent)
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
