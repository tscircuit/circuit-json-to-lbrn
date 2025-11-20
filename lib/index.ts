import type { CircuitJson } from "circuit-json"
import { LightBurnProject, CutSetting } from "lbrnts"
import { cju } from "@tscircuit/circuit-json-util"
import type { ConvertContext } from "./ConvertContext"
import { addPlatedHole } from "./element-handlers/addPlatedHole"
import { addSmtPad } from "./element-handlers/addSmtPad"

export const convertCircuitJsonToLbrn = (
  circuitJson: CircuitJson,
  options: { includeSilkscreen?: boolean } = {},
): LightBurnProject => {
  const db = cju(circuitJson)
  const project = new LightBurnProject({
    appVersion: "1.7.03",
    formatVersion: "1",
  })

  const copperCutSetting = new CutSetting({
    index: 0,
    name: "Cut Copper",
    numPasses: 12,
    speed: 100,
  })
  project.children.push(copperCutSetting)

  const ctx: ConvertContext = {
    db,
    project,
    copperCutSetting,
  }

  for (const smtpad of db.pcb_smtpad.list()) {
    addSmtPad(smtpad, ctx)
  }

  for (const platedHole of db.pcb_plated_hole.list()) {
    addPlatedHole(platedHole, ctx)
  }

  return project
}
