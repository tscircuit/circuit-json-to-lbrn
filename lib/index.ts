import type { CircuitJson } from "circuit-json"
import { LightBurnProject, CutSetting, ShapePath } from "lbrnts"
import { cju } from "@tscircuit/circuit-json-util"
import type { ConvertContext } from "./ConvertContext"
import { addPlatedHole } from "./element-handlers/addPlatedHole"
import { addSmtPad } from "./element-handlers/addSmtPad"
import { addPcbTrace } from "./element-handlers/addPcbTrace"
import { addPcbBoard } from "./element-handlers/addPcbBoard"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { Polygon, Box, BooleanOperations } from "@flatten-js/core"
import { polygonToShapePathData } from "./polygon-to-shape-path"
import {
  calculateCircuitBounds,
  calculateOriginFromBounds,
} from "./calculateBounds"
// import { writeDebugSvg } from "./writeDebugSvg"

export const convertCircuitJsonToLbrn = (
  circuitJson: CircuitJson,
  options: {
    includeSilkscreen?: boolean
    origin?: { x: number; y: number }
    margin?: number
    includeCopper?: boolean
    includeSoldermask?: boolean
  } = {},
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

  const throughBoardCutSetting = new CutSetting({
    index: 1,
    name: "Cut Through Board",
    numPasses: 3,
    speed: 50,
  })
  project.children.push(throughBoardCutSetting)

  const soldermaskCutSetting = new CutSetting({
    index: 2,
    name: "Cut Soldermask",
    numPasses: 1,
    speed: 150,
  })
  project.children.push(soldermaskCutSetting)

  const connMap = getFullConnectivityMapFromCircuitJson(circuitJson)

  // Auto-calculate origin if not provided to ensure all elements are in positive quadrant
  let origin = options.origin
  if (!origin) {
    const bounds = calculateCircuitBounds(circuitJson)
    origin = calculateOriginFromBounds(bounds, options.margin)
  }

  const ctx: ConvertContext = {
    db,
    project,
    copperCutSetting,
    throughBoardCutSetting,
    soldermaskCutSetting,
    connMap,
    netGeoms: new Map(),
    origin,
    includeCopper: options.includeCopper ?? true,
    includeSoldermask: options.includeSoldermask ?? false,
  }

  for (const net of Object.keys(connMap.netMap)) {
    ctx.netGeoms.set(net, [])
  }

  for (const smtpad of db.pcb_smtpad.list()) {
    addSmtPad(smtpad, ctx)
  }

  for (const platedHole of db.pcb_plated_hole.list()) {
    addPlatedHole(platedHole, ctx)
  }

  for (const trace of db.pcb_trace.list()) {
    addPcbTrace(trace, ctx)
  }

  for (const board of db.pcb_board.list()) {
    addPcbBoard(board, ctx)
  }

  // Draw each individual shape geometry as a ShapePath
  // FOR DEBUGGING!!!
  // for (const net of Object.keys(connMap.netMap)) {
  //   const netGeoms = ctx.netGeoms.get(net)!

  //   if (netGeoms.length === 0) {
  //     continue
  //   }

  //   for (const geom of netGeoms) {
  //     // Convert Box to Polygon if needed
  //     const polygon = geom instanceof Box ? new Polygon(geom) : geom

  //     // Convert the polygon to verts and prims
  //     const { verts, prims } = polygonToShapePathData(polygon)

  //     project.children.push(
  //       new ShapePath({
  //         cutIndex: copperCutSetting.index,
  //         verts,
  //         prims,
  //         isClosed: false,
  //       }),
  //     )
  //   }
  // }

  // Create a union of all the net geoms, and add to project
  // Only do this when including copper
  if (ctx.includeCopper) {
    for (const net of Object.keys(connMap.netMap)) {
      const netGeoms = ctx.netGeoms.get(net)!

      if (netGeoms.length === 0) {
        continue
      }

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

      // DEBUGGING ONLY!!!
      // if (netGeoms.length > 1) {
      //   writeDebugSvg(net, union)
      // }

      for (const island of union.splitToIslands()) {
        // Convert the polygon to verts and prims
        const { verts, prims } = polygonToShapePathData(island)

        project.children.push(
          new ShapePath({
            cutIndex: copperCutSetting.index,
            verts,
            prims,
            isClosed: false,
          }),
        )
      }
    }
  }
  return project
}
