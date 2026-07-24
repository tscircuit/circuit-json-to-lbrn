import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { CutSetting } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../lib"
import { LAYER_INDEXES } from "../../lib/layer-indexes"

const board = {
  type: "pcb_board",
  pcb_board_id: "pcb_board_0",
  center: { x: 0, y: 0 },
  width: 20,
  height: 20,
  thickness: 1.6,
  num_layers: 2,
  material: "fr4",
} as const

const getCopperCutSettingIndexes = async (
  includeLayers: Array<"top" | "bottom">,
) => {
  const project = await convertCircuitJsonToLbrn([board] as CircuitJson, {
    includeLayers,
  })

  return project.children
    .filter((child): child is CutSetting => child instanceof CutSetting)
    .map((cutSetting) => cutSetting.index)
}

test("does not create a bottom copper setting for a top-only conversion", async () => {
  const cutSettingIndexes = await getCopperCutSettingIndexes(["top"])

  expect(cutSettingIndexes).toContain(LAYER_INDEXES.topCopper)
  expect(cutSettingIndexes).not.toContain(LAYER_INDEXES.bottomCopper)
})

test("does not create a top copper setting for a bottom-only conversion", async () => {
  const cutSettingIndexes = await getCopperCutSettingIndexes(["bottom"])

  expect(cutSettingIndexes).not.toContain(LAYER_INDEXES.topCopper)
  expect(cutSettingIndexes).toContain(LAYER_INDEXES.bottomCopper)
})
