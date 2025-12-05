import type { CircuitJson } from "circuit-json"
import { LightBurnProject, CutSetting } from "lbrnts"
import { cju } from "@tscircuit/circuit-json-util"
import type { ConvertContext } from "./ConvertContext"
import { addPlatedHole } from "./element-handlers/addPlatedHole"
import { addSmtPad } from "./element-handlers/addSmtPad"
import { addPcbTrace } from "./element-handlers/addPcbTrace"
import { addPcbBoard } from "./element-handlers/addPcbBoard"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import {
  calculateCircuitBounds,
  calculateOriginFromBounds,
} from "./calculateBounds"
import { addPcbVia } from "./element-handlers/addPcbVia"
import { addPcbHole } from "./element-handlers/addPcbHole"
import { addPcbCutout } from "./element-handlers/addPcbCutout"
import { outputCopperShapes } from "./outputCopperShapes"
import { generateTraceClearanceAreas } from "./generateTraceClearanceAreas"

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

  // Parse options
  const includeLayers = options.includeLayers ?? ["top", "bottom"]
  const traceMargin = options.traceMargin ?? 0
  const laserSpotSize = options.laserSpotSize ?? 0.005
  const includeCopper = options.includeCopper ?? true
  const includeSoldermask = options.includeSoldermask ?? false
  const soldermaskMargin = options.soldermaskMargin ?? 0

  // Determine if we should generate trace clearance zones
  const shouldGenerateTraceClearanceZones = traceMargin > 0 && includeCopper

  // Validate options
  if (traceMargin > 0 && !includeCopper) {
    throw new Error("traceMargin requires includeCopper to be true")
  }

  // Create cut settings
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
    type: "Scan",
    index: 3,
    name: "Cut Soldermask",
    numPasses: 1,
    speed: 150,
    scanOpt: "individual",
    interval: 0.18,
    angle: 45,
    crossHatch: true,
  })
  project.children.push(soldermaskCutSetting)

  // Create trace clearance cut settings if needed
  let topTraceMarginCutSetting: CutSetting | undefined
  let bottomTraceMarginCutSetting: CutSetting | undefined

  if (shouldGenerateTraceClearanceZones) {
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

  // Build connectivity map and origin
  const connMap = getFullConnectivityMapFromCircuitJson(circuitJson)
  let origin = options.origin
  if (!origin) {
    const bounds = calculateCircuitBounds(circuitJson)
    origin = calculateOriginFromBounds(bounds, options.margin)
  }

  // Create conversion context
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
    includeSoldermask,
    soldermaskMargin,
    includeLayers,
    traceMargin,
    laserSpotSize,
    topTraceMarginCutSetting,
    bottomTraceMarginCutSetting,
  }

  // Initialize net geometry maps
  for (const net of Object.keys(connMap.netMap)) {
    ctx.topNetGeoms.set(net, [])
    ctx.bottomNetGeoms.set(net, [])
    ctx.topMarginNetGeoms.set(net, [])
    ctx.bottomMarginNetGeoms.set(net, [])
  }

  // Process all PCB elements
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

  // Output copper shapes
  if (includeCopper) {
    if (includeLayers.includes("top")) {
      outputCopperShapes({ layer: "top", ctx })
    }
    if (includeLayers.includes("bottom")) {
      outputCopperShapes({ layer: "bottom", ctx })
    }
  }

  // Generate trace clearance zones
  if (shouldGenerateTraceClearanceZones) {
    if (includeLayers.includes("top")) {
      generateTraceClearanceAreas({ layer: "top", ctx })
    }
    if (includeLayers.includes("bottom")) {
      generateTraceClearanceAreas({ layer: "bottom", ctx })
    }
  }

  return project
}
