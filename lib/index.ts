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
    connMap,
    netGeoms: new Map(),
    copperLayerPolygons: [],
    boardCutPolygons: [],
    origin,
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

  // Phase 1: Construct flattenjs polygons for each cutting layer
  // Create a union of all the net geoms and collect polygons for the copper layer
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
      ctx.copperLayerPolygons.push(island)
    }
  }
  // Phase 2: Construct a single cut path for each cutting layer

  if (ctx.copperLayerPolygons.length > 0) {
    const [firstCopper, ...restCopper] = ctx.copperLayerPolygons
    let copperUnion: Polygon = firstCopper!
    for (const poly of restCopper) {
      copperUnion = BooleanOperations.unify(copperUnion, poly)
    }

    const { verts, prims } = polygonToShapePathData(copperUnion)

    project.children.push(
      new ShapePath({
        cutIndex: copperCutSetting.index,
        verts,
        prims,
        isClosed: false,
      }),
    )
  }

  if (ctx.boardCutPolygons.length > 0) {
    const [firstBoard, ...restBoards] = ctx.boardCutPolygons
    let boardUnion: Polygon = firstBoard!
    for (const poly of restBoards) {
      boardUnion = BooleanOperations.unify(boardUnion, poly)
    }

    const { verts, prims } = polygonToShapePathData(boardUnion)

    project.children.push(
      new ShapePath({
        cutIndex: throughBoardCutSetting.index,
        verts,
        prims,
        isClosed: true,
      }),
    )
  }
  return project
}
