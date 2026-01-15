import { test, expect } from "bun:test"
import circuitJson from "../../examples/example04/1206x4_3216metric.json" with {
  type: "json",
}
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"
import type { CircuitJson } from "circuit-json"

test("1206x4 board with copperFillExpansion", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson as CircuitJson)

  const project = convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeLayers: ["top"],
    copperFillExpansion: 1.5,
  })

  Bun.write(
    "debug-output/1206x4_board_with_copperFillExpansion.lbrn2",
    project.getString(),
    {
      createPath: true,
    },
  )

  const lbrnSvg = await generateLightBurnSvg(project, {
    margin: 0,
    width: 800,
    height: 600,
    defaultStrokeWidth: 0.03,
  })

  expect(lbrnSvg).toMatchSvgSnapshot(import.meta.filename)

  // expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
  //   import.meta.filename,
  // )
})
