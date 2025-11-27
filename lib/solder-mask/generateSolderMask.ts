import type { CircuitJson } from "circuit-json"
import { LightBurnProject, CutSetting, ShapePath } from "lbrnts"
import { cju } from "@tscircuit/circuit-json-util"
import type { ConvertContext } from "../ConvertContext"
import { addPlatedHole } from "./element-handlers/addPlatedHole"
import { addSmtPad } from "./element-handlers/addSmtPad"
import { addPcbBoard } from "./element-handlers/addPcbBoard"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { Polygon, Box, BooleanOperations } from "@flatten-js/core"
import { polygonToShapePathData } from "../polygon-to-shape-path"
import {
  calculateCircuitBounds,
  calculateOriginFromBounds,
} from "../calculateBounds"

export const generateSolderMask = (
  circuitJson: CircuitJson,
  options: {
    includeSilkscreen?: boolean
    origin?: { x: number; y: number }
    margin?: number
  } = {},
): LightBurnProject => {
  const db = cju(circuitJson)
  const project = new LightBurnProject({
    appVersion: "1.7.03",
    formatVersion: "1",
  })

  const copperCutSetting = new CutSetting({
    index: 0,
    name: "Cut Mask Openings",
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

  const connMap = getFullConnectivityMapFromCircuitJson(circuitJson)

  // Auto-calculate origin location
  let origin = options.origin
  if (!origin) {
    const bounds = calculateCircuitBounds(circuitJson)
    origin = calculateOriginFromBounds(bounds, options.margin)
  }

  const ctx: ConvertContext = {
    db,
    project,
    copperCutSetting, // Used for mask openings
    throughBoardCutSetting,
    connMap,
    netGeoms: new Map(),
    origin,
  }

  for (const net of Object.keys(connMap.netMap)) {
    ctx.netGeoms.set(net, [])
  }

  for (const smtpad of db.pcb_smtpad.list()) {
    addSmtPad(smtpad, ctx)
  }

  for (const platedHole of db.pcb_plated_hole.list()) {
    // Solder mask handler for plated holes only adds the pad opening (no inner hole)
    addPlatedHole(platedHole, ctx)
  }

  // No traces in solder mask

  for (const board of db.pcb_board.list()) {
    addPcbBoard(board, ctx)
  }

  // Create a union of all the net geoms (openings)
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

    for (const island of union.splitToIslands()) {
      const { verts, prims } = polygonToShapePathData(island)

      project.children.push(
        new ShapePath({
          cutIndex: copperCutSetting.index, // Cut mask openings
          verts,
          prims,
          isClosed: false,
        }),
      )
    }
  }
  return project
}
