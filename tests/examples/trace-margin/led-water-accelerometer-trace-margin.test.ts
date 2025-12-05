import { test, expect } from "bun:test"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"
import circuitJson from "../../assets/led-water-accelerometer.json"

test(
  "led-water-accelerometer-trace-margin",
  async () => {
    const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson as CircuitJson)

    const project = convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
      includeCopper: true,
      traceMargin: 0.15,
      laserSpotSize: 0.005,
      includeLayers: ["top"],
    })

    Bun.write(
      "debug-output/led-water-accelerometer.lbrn2",
      project.getString(),
      {
        createPath: true,
      },
    )

    const lbrnSvg = await generateLightBurnSvg(project)

    expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
      import.meta.filename,
    )
  },
  { timeout: 30000 },
)
