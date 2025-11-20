import type { CircuitJson } from "circuit-json"
import { LightBurnProject, CutSetting } from "lbrnts"
import { cju } from "@tscircuit/circuit-json-util"
import type {ConvertContext} from "./ConvertContext"
import {addPlatedHole} from "./element-handlers/addPlatedHole"

export const convertCircuitJsonToLbrn = (
  circuitJson: CircuitJson,
  options?: { includeSilkscreen?: boolean } = {},
): LightBurnProject => {
  const db = cju(circuitJson)
  const project = new LightBurnProject({
    appVersion: "1.7.03",
    formatVersion: "1",
  })

  project.children.push(new CutSetting({
    index: 0,
    name: "Cut Copper",
    numPasses: 12,
    speed: 100
  }))

  const ctx: ConvertContext = {
    db,
    project,
  }

  for (const platedHole of db.pcb_plated_hole.list()) {
    addPlatedHole(platedHole, ctx)
  }


  return project
}
