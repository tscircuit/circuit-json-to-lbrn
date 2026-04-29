import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { CutSetting, generateLightBurnSvg } from "lbrnts"
import { stackSvgsVertically } from "stack-svgs"
import { convertCircuitJsonToLbrn } from "../../../lib"
import { LAYER_INDEXES } from "../../../lib/layer-indexes"

/**
 * Test basic oxidation cleaning layer functionality.
 * The oxidation cleaning layer should add only the board outline.
 */
test("oxidation-cleaning-basic", async () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      width: 20,
      height: 20,
      center: { x: 0, y: 0 },
    },
  ] as CircuitJson

  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeOxidationCleaningLayer: true,
    includeLayers: ["top"],
  })
  const topOxidationCutSetting = project.children.find(
    (child): child is CutSetting =>
      child instanceof CutSetting &&
      child.index === LAYER_INDEXES.topOxidationCleaning,
  )

  expect(topOxidationCutSetting?.type).toBe("Cut")
  expect(topOxidationCutSetting?.scanOpt).toBeUndefined()

  Bun.write(
    "debug-output/oxidation-cleaning-basic.lbrn2",
    project.getString(),
    { createPath: true },
  )

  const lbrnSvg = await generateLightBurnSvg(project)
  expect(lbrnSvg).not.toContain('fill="url(')

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )
})
