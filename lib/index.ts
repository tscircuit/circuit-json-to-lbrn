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
import { createCopperShapesForLayer } from "./createCopperShapesForLayer"
import { createTraceClearanceAreasForLayer } from "./createTraceClearanceAreasForLayer"

export interface ConvertCircuitJsonToLbrnOptions {
  includeSilkscreen?: boolean
  origin?: { x: number; y: number }
  margin?: number
  includeCopper?: boolean
  includeSoldermask?: boolean
  globalCopperSoldermaskMarginAdjustment?: number
  solderMaskMarginPercent?: number
  includeLayers?: Array<"top" | "bottom">
  traceMargin?: number
  laserSpotSize?: number
  laserProfile?: {
    copper?: {
      speed?: number
      numPasses?: number
      frequency?: number
      pulseWidth?: number
    }
    board?: {
      speed?: number
      numPasses?: number
      frequency?: number
      pulseWidth?: number
    }
  }
}
export const convertCircuitJsonToLbrn = (
  circuitJson: CircuitJson,
  options: ConvertCircuitJsonToLbrnOptions = {},
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
  const globalCopperSoldermaskMarginAdjustment =
    options.globalCopperSoldermaskMarginAdjustment ?? 0
  const solderMaskMarginPercent = options.solderMaskMarginPercent ?? 0
  const laserProfile = options.laserProfile

  // Default laser settings from GitHub issue
  const defaultCopperSettings = {
    speed: 300,
    numPasses: 100,
    frequency: 20000,
    pulseWidth: 1e-9,
  }
  const defaultBoardSettings = {
    speed: 20,
    numPasses: 100,
    frequency: 20000,
    pulseWidth: 1e-9,
  }

  // Merge user settings with defaults
  const copperSettings = { ...defaultCopperSettings, ...laserProfile?.copper }
  const boardSettings = { ...defaultBoardSettings, ...laserProfile?.board }

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
    numPasses: copperSettings.numPasses,
    speed: copperSettings.speed,
    frequency: copperSettings.frequency,
    pulseWidth: copperSettings.pulseWidth,
  })
  project.children.push(topCopperCutSetting)

  const bottomCopperCutSetting = new CutSetting({
    index: 1,
    name: "Cut Bottom Copper",
    numPasses: copperSettings.numPasses,
    speed: copperSettings.speed,
    frequency: copperSettings.frequency,
    pulseWidth: copperSettings.pulseWidth,
  })
  project.children.push(bottomCopperCutSetting)

  const throughBoardCutSetting = new CutSetting({
    index: 2,
    name: "Cut Through Board",
    numPasses: boardSettings.numPasses,
    speed: boardSettings.speed,
    frequency: boardSettings.frequency,
    pulseWidth: boardSettings.pulseWidth,
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
  let topTraceClearanceAreaCutSetting: CutSetting | undefined
  let bottomTraceClearanceAreaCutSetting: CutSetting | undefined

  if (shouldGenerateTraceClearanceZones) {
    if (includeLayers.includes("top")) {
      topTraceClearanceAreaCutSetting = new CutSetting({
        type: "Scan",
        index: 4,
        name: "Clear Top Trace Clearance Areas",
        numPasses: 12,
        speed: 100,
        scanOpt: "individual",
        interval: laserSpotSize,
        angle: 45,
        crossHatch: true,
      })
      project.children.push(topTraceClearanceAreaCutSetting)
    }

    if (includeLayers.includes("bottom")) {
      bottomTraceClearanceAreaCutSetting = new CutSetting({
        type: "Scan",
        index: 5,
        name: "Clear Bottom Trace Clearance Areas",
        numPasses: 12,
        speed: 100,
        scanOpt: "individual",
        interval: laserSpotSize,
        angle: 45,
        crossHatch: true,
      })
      project.children.push(bottomTraceClearanceAreaCutSetting)
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
    topCutNetGeoms: new Map(),
    bottomCutNetGeoms: new Map(),
    topScanNetGeoms: new Map(),
    bottomScanNetGeoms: new Map(),
    origin,
    includeCopper,
    includeSoldermask,
    globalCopperSoldermaskMarginAdjustment,
    includeLayers,
    traceMargin,
    laserSpotSize,
    topTraceClearanceAreaCutSetting,
    bottomTraceClearanceAreaCutSetting,
    solderMaskMarginPercent,
  }

  // Initialize net geometry maps
  for (const net of Object.keys(connMap.netMap)) {
    ctx.topCutNetGeoms.set(net, [])
    ctx.bottomCutNetGeoms.set(net, [])
    ctx.topScanNetGeoms.set(net, [])
    ctx.bottomScanNetGeoms.set(net, [])
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

  // Create copper shapes for each layer
  if (includeCopper) {
    if (includeLayers.includes("top")) {
      createCopperShapesForLayer({ layer: "top", ctx })
    }
    if (includeLayers.includes("bottom")) {
      createCopperShapesForLayer({ layer: "bottom", ctx })
    }
  }

  // Create trace clearance areas for each layer
  if (shouldGenerateTraceClearanceZones) {
    if (includeLayers.includes("top")) {
      createTraceClearanceAreasForLayer({ layer: "top", ctx })
    }
    if (includeLayers.includes("bottom")) {
      createTraceClearanceAreasForLayer({ layer: "bottom", ctx })
    }
  }

  return project
}
