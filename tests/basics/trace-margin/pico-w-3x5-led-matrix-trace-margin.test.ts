import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"
import circuitJson from "../../assets/pico-w-3x5-led-matrix.json"

test(
  "pico-w-3x5-led-matrix-trace-margin",
  async () => {
    const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson as CircuitJson)

    const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
      includeCopper: true,
      traceMargin: 0.15,
      laserSpotSize: 0.005,
      includeLayers: ["top"],
    })

    Bun.write("debug-output/pico-w-3x5-led-matrix.lbrn2", project.getString(), {
      createPath: true,
    })

    const lbrnSvg = await generateLightBurnSvg(project)

    expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
      import.meta.filename,
    )
  },
  { timeout: 40000 },
)
