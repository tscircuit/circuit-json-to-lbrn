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
import { addPcbVia } from "./element-handlers/addPcbVia"
import { addPcbHole } from "./element-handlers/addPcbHole"
import { addPcbCutout } from "./element-handlers/addPcbCutout"
// import { writeDebugSvg } from "./writeDebugSvg"

export const convertCircuitJsonToLbrn = (
  circuitJson: CircuitJson,
  options: {
    includeSilkscreen?: boolean
    origin?: { x: number; y: number }
    margin?: number
    includeCopper?: boolean
    includeSoldermask?: boolean
    soldermaskMargin?: number
    includeLayers?: Array<"top" | "bottom">
    traceMargin?: number
    laserSpotSize?: number
  } = {},
): LightBurnProject => {
  const db = cju(circuitJson)
  const project = new LightBurnProject({
    appVersion: "1.7.03",
    formatVersion: "1",
  })

  // Default to all layers if not specified
  const includeLayers = options.includeLayers ?? ["top", "bottom"]

  // Default trace margin and laser spot size
  const traceMargin = options.traceMargin ?? 0
  const laserSpotSize = options.laserSpotSize ?? 0.005

  // Validate: traceMargin requires includeCopper
  const includeCopper = options.includeCopper ?? true
  if (traceMargin > 0 && !includeCopper) {
    throw new Error("traceMargin requires includeCopper to be true")
  }

  const topCopperCutSetting = new CutSetting({
    index: 0,
    name: "Cut Top Copper",
    numPasses: 12,
    speed: 100,
  })
  project.children.push(topCopperCutSetting)

  const bottomCopperCutSetting = new CutSetting({
    index: 1,
    name: "Cut Bottom Copper",
    numPasses: 12,
    speed: 100,
  })
  project.children.push(bottomCopperCutSetting)

  const throughBoardCutSetting = new CutSetting({
    index: 2,
    name: "Cut Through Board",
    numPasses: 3,
    speed: 50,
  })
  project.children.push(throughBoardCutSetting)

  const soldermaskCutSetting = new CutSetting({
    type: "Scan", // Use Scan mode to fill pad shapes for Kapton tape cutting
    index: 3,
    name: "Cut Soldermask",
    numPasses: 1,
    speed: 150,
    scanOpt: "individual", // Scan each shape individually
    interval: 0.18, // Distance between cross-hatch lines
    angle: 45, // Angle of cross-hatch lines
    crossHatch: true,
  })
  project.children.push(soldermaskCutSetting)

  // Create trace margin cut settings if traceMargin is enabled
  let topTraceMarginCutSetting: CutSetting | undefined
  let bottomTraceMarginCutSetting: CutSetting | undefined

  if (traceMargin > 0) {
    if (includeLayers.includes("top")) {
      topTraceMarginCutSetting = new CutSetting({
        type: "Scan",
        index: 4,
        name: "Clear Top Trace Margins",
        numPasses: 12,
        speed: 100,
        scanOpt: "individual",
        interval: laserSpotSize,
        angle: 45,
        crossHatch: true,
      })
      project.children.push(topTraceMarginCutSetting)
    }

    if (includeLayers.includes("bottom")) {
      bottomTraceMarginCutSetting = new CutSetting({
        type: "Scan",
        index: 5,
        name: "Clear Bottom Trace Margins",
        numPasses: 12,
        speed: 100,
        scanOpt: "individual",
        interval: laserSpotSize,
        angle: 45,
        crossHatch: true,
      })
      project.children.push(bottomTraceMarginCutSetting)
    }
  }

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
    topCopperCutSetting,
    bottomCopperCutSetting,
    throughBoardCutSetting,
    soldermaskCutSetting,
    connMap,
    topNetGeoms: new Map(),
    bottomNetGeoms: new Map(),
    topMarginNetGeoms: new Map(),
    bottomMarginNetGeoms: new Map(),
    origin,
    includeCopper,
    includeSoldermask: options.includeSoldermask ?? false,
    soldermaskMargin: options.soldermaskMargin ?? 0,
    includeLayers,
    traceMargin,
    laserSpotSize,
    topTraceMarginCutSetting,
    bottomTraceMarginCutSetting,
  }

  for (const net of Object.keys(connMap.netMap)) {
    ctx.topNetGeoms.set(net, [])
    ctx.bottomNetGeoms.set(net, [])
    ctx.topMarginNetGeoms.set(net, [])
    ctx.bottomMarginNetGeoms.set(net, [])
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

  for (const via of db.pcb_via.list()) {
    addPcbVia(via, ctx)
  }

  for (const hole of db.pcb_hole.list()) {
    addPcbHole(hole, ctx)
  }

  for (const cutout of db.pcb_cutout.list()) {
    addPcbCutout(cutout, ctx)
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
    // Process top layer
    if (includeLayers.includes("top")) {
      for (const net of Object.keys(connMap.netMap)) {
        const netGeoms = ctx.topNetGeoms.get(net)!

        if (netGeoms.length === 0) {
          continue
        }

        try {
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
            // Convert the polygon to verts and prims
            const { verts, prims } = polygonToShapePathData(island)

            project.children.push(
              new ShapePath({
                cutIndex: topCopperCutSetting.index,
                verts,
                prims,
                isClosed: false,
              }),
            )
          }
        } catch (error) {
          console.warn(
            `Failed to union geometries for net ${net} on top layer:`,
            error,
          )
          // Output individual geometries if union fails
          for (const geom of netGeoms) {
            const poly = geom instanceof Box ? new Polygon(geom) : geom
            const { verts, prims } = polygonToShapePathData(poly)
            project.children.push(
              new ShapePath({
                cutIndex: topCopperCutSetting.index,
                verts,
                prims,
                isClosed: false,
              }),
            )
          }
        }
      }
    }

    // Process bottom layer
    if (includeLayers.includes("bottom")) {
      for (const net of Object.keys(connMap.netMap)) {
        const netGeoms = ctx.bottomNetGeoms.get(net)!

        if (netGeoms.length === 0) {
          continue
        }

        try {
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
            // Convert the polygon to verts and prims
            const { verts, prims } = polygonToShapePathData(island)

            project.children.push(
              new ShapePath({
                cutIndex: bottomCopperCutSetting.index,
                verts,
                prims,
                isClosed: false,
              }),
            )
          }
        } catch (error) {
          console.warn(
            `Failed to union geometries for net ${net} on bottom layer:`,
            error,
          )
          // Output individual geometries if union fails
          for (const geom of netGeoms) {
            const poly = geom instanceof Box ? new Polygon(geom) : geom
            const { verts, prims } = polygonToShapePathData(poly)
            project.children.push(
              new ShapePath({
                cutIndex: bottomCopperCutSetting.index,
                verts,
                prims,
                isClosed: false,
              }),
            )
          }
        }
      }
    }
  }

  // Generate trace margin clearance areas (outerTraceUnion - innerTraceUnion)
  if (traceMargin > 0 && includeCopper) {
    // Process top layer trace margins
    if (includeLayers.includes("top") && topTraceMarginCutSetting) {
      for (const net of Object.keys(connMap.netMap)) {
        const innerGeoms = ctx.topNetGeoms.get(net)!
        const outerGeoms = ctx.topMarginNetGeoms.get(net)!

        if (innerGeoms.length === 0 || outerGeoms.length === 0) {
          continue
        }

        try {
          // Union inner geometries (normal traces)
          let innerUnion = innerGeoms[0]!
          if (innerUnion instanceof Box) {
            innerUnion = new Polygon(innerUnion)
          }
          for (const geom of innerGeoms.slice(1)) {
            if (geom instanceof Polygon) {
              innerUnion = BooleanOperations.unify(innerUnion, geom)
            } else if (geom instanceof Box) {
              innerUnion = BooleanOperations.unify(
                innerUnion,
                new Polygon(geom),
              )
            }
          }

          // Union outer geometries (traces with margin)
          let outerUnion = outerGeoms[0]!
          if (outerUnion instanceof Box) {
            outerUnion = new Polygon(outerUnion)
          }
          for (const geom of outerGeoms.slice(1)) {
            if (geom instanceof Polygon) {
              outerUnion = BooleanOperations.unify(outerUnion, geom)
            } else if (geom instanceof Box) {
              outerUnion = BooleanOperations.unify(
                outerUnion,
                new Polygon(geom),
              )
            }
          }

          // Calculate clearance area (outer - inner)
          const clearanceArea = BooleanOperations.subtract(
            outerUnion,
            innerUnion,
          )

          // Output clearance area as filled shapes
          for (const island of clearanceArea.splitToIslands()) {
            const { verts, prims } = polygonToShapePathData(island)

            project.children.push(
              new ShapePath({
                cutIndex: topTraceMarginCutSetting.index,
                verts,
                prims,
                isClosed: true, // Filled shapes should be closed
              }),
            )
          }
        } catch (error) {
          console.warn(
            `Failed to generate trace margin clearance for net ${net} on top layer:`,
            error,
          )
          // Skip this net's margin if we can't compute it
        }
      }
    }

    // Process bottom layer trace margins
    if (includeLayers.includes("bottom") && bottomTraceMarginCutSetting) {
      for (const net of Object.keys(connMap.netMap)) {
        const innerGeoms = ctx.bottomNetGeoms.get(net)!
        const outerGeoms = ctx.bottomMarginNetGeoms.get(net)!

        if (innerGeoms.length === 0 || outerGeoms.length === 0) {
          continue
        }

        try {
          // Union inner geometries (normal traces)
          let innerUnion = innerGeoms[0]!
          if (innerUnion instanceof Box) {
            innerUnion = new Polygon(innerUnion)
          }
          for (const geom of innerGeoms.slice(1)) {
            if (geom instanceof Polygon) {
              innerUnion = BooleanOperations.unify(innerUnion, geom)
            } else if (geom instanceof Box) {
              innerUnion = BooleanOperations.unify(
                innerUnion,
                new Polygon(geom),
              )
            }
          }

          // Union outer geometries (traces with margin)
          let outerUnion = outerGeoms[0]!
          if (outerUnion instanceof Box) {
            outerUnion = new Polygon(outerUnion)
          }
          for (const geom of outerGeoms.slice(1)) {
            if (geom instanceof Polygon) {
              outerUnion = BooleanOperations.unify(outerUnion, geom)
            } else if (geom instanceof Box) {
              outerUnion = BooleanOperations.unify(
                outerUnion,
                new Polygon(geom),
              )
            }
          }

          // Calculate clearance area (outer - inner)
          const clearanceArea = BooleanOperations.subtract(
            outerUnion,
            innerUnion,
          )

          // Output clearance area as filled shapes
          for (const island of clearanceArea.splitToIslands()) {
            const { verts, prims } = polygonToShapePathData(island)

            project.children.push(
              new ShapePath({
                cutIndex: bottomTraceMarginCutSetting.index,
                verts,
                prims,
                isClosed: true, // Filled shapes should be closed
              }),
            )
          }
        } catch (error) {
          console.warn(
            `Failed to generate trace margin clearance for net ${net} on bottom layer:`,
            error,
          )
          // Skip this net's margin if we can't compute it
        }
      }
    }
  }

  return project
}
