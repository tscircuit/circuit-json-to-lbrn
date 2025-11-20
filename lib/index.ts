import type { CircuitJson } from "circuit-json"
import { LightBurnProject, CutSetting, ShapePath } from "lbrnts"
import { cju } from "@tscircuit/circuit-json-util"
import type { ConvertContext } from "./ConvertContext"
import { addPlatedHole } from "./element-handlers/addPlatedHole"
import { addSmtPad } from "./element-handlers/addSmtPad"
import { addPcbTrace } from "./element-handlers/addPcbTrace"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { Polygon, Box, BooleanOperations } from "@flatten-js/core"

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

  const connMap = getFullConnectivityMapFromCircuitJson(circuitJson)

  const ctx: ConvertContext = {
    db,
    project,
    copperCutSetting,
    connMap,
    netGeoms: new Map(),
  }

  for (const net of Object.keys(connMap.netMap)) {
    ctx.netGeoms.set(net, [])
  }

  for (const smtpad of db.pcb_smtpad.list()) {
    addSmtPad(smtpad, ctx)
  }

  // for (const platedHole of db.pcb_plated_hole.list()) {
  //   addPlatedHole(platedHole, ctx)
  // }

  for (const trace of db.pcb_trace.list()) {
    addPcbTrace(trace, ctx)
  }

  // Create a union of all the net geoms, and add to project

  for (const net of Object.keys(connMap.netMap)) {
    const netGeoms = ctx.netGeoms.get(net)!

    if (netGeoms.length === 0) {
      continue
    }

    console.log(netGeoms)

    let union = netGeoms[0]!
    if (union instanceof Box) {
      union = new Polygon(union)
    }
    for (const geom of netGeoms.slice(1)) {
      if (geom instanceof Polygon) {
        union = BooleanOperations.unify(union, geom)
      } else if (geom instanceof Box) {
        union = BooleanOperations.unify(union, new Polygon(geom))
      }
    }

    project.children.push(
      new ShapePath({
        cutIndex: copperCutSetting.index,
        verts: [],
        prims: [],
      }),
    )
  }

  return project
}
