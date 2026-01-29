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
import { createCopperCutFillForLayer } from "./createCopperCutFillForLayer"
import { createOxidationCleaningLayerForLayer } from "./createOxidationCleaningLayerForLayer"
import { LAYER_INDEXES } from "./layer-indexes"
import { createSoldermaskCureLayer } from "./createSoldermaskCureLayer"

export interface ConvertCircuitJsonToLbrnOptions {
  includeSilkscreen?: boolean
  origin?: { x: number; y: number }
  margin?: number
  includeCopper?: boolean
  includeSoldermask?: boolean
  includeSoldermaskCure?: boolean
  globalCopperSoldermaskMarginAdjustment?: number
  solderMaskMarginPercent?: number
  includeLayers?: Array<"top" | "bottom">
  traceMargin?: number
  laserSpotSize?: number
  /**
   * Whether to generate copper cut fill layers.
   * Creates a ring/band around traces and pads that will be laser cut
   * to remove copper, without cutting into the traces or pads themselves.
   */
  includeCopperCutFill?: boolean
  /**
   * Margin to expand the copper outline for the cut fill band (in mm).
   * This determines how wide the band of copper removal will be around traces/pads.
   */
  copperCutFillMargin?: number
  /**
   * Whether to generate an oxidation cleaning layer.
   * Creates a filled area covering the entire "inside" of the board outline
   * for laser ablation to clean oxidation from the copper surface.
   */
  includeOxidationCleaningLayer?: boolean
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
export const convertCircuitJsonToLbrn = async (
  circuitJson: CircuitJson,
  options: ConvertCircuitJsonToLbrnOptions = {},
): Promise<LightBurnProject> => {
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
  const includeSoldermaskCure = options.includeSoldermaskCure ?? false
  const shouldIncludeSoldermaskCure = includeSoldermask && includeSoldermaskCure
  const globalCopperSoldermaskMarginAdjustment =
    options.globalCopperSoldermaskMarginAdjustment ?? 0
  const solderMaskMarginPercent = options.solderMaskMarginPercent ?? 0
  const laserProfile = options.laserProfile
  const includeCopperCutFill = options.includeCopperCutFill ?? false
  const copperCutFillMargin = options.copperCutFillMargin ?? 0.5
  const includeOxidationCleaningLayer =
    options.includeOxidationCleaningLayer ?? false

  // Default laser settings
  const defaultCopperSettings = {
    speed: 300,
    numPasses: 100,
    frequency: 20000,
    pulseWidth: 1,
  }
  const defaultBoardSettings = {
    speed: 20,
    numPasses: 100,
    frequency: 20000,
    pulseWidth: 1,
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
    index: LAYER_INDEXES.topCopper,
    name: "Cut Top Copper",
    numPasses: copperSettings.numPasses,
    speed: copperSettings.speed,
    frequency: copperSettings.frequency,
    qPulseWidth: copperSettings.pulseWidth,
  })
  project.children.push(topCopperCutSetting)

  const bottomCopperCutSetting = new CutSetting({
    index: LAYER_INDEXES.bottomCopper,
    name: "Cut Bottom Copper",
    numPasses: copperSettings.numPasses,
    speed: copperSettings.speed,
    frequency: copperSettings.frequency,
    qPulseWidth: copperSettings.pulseWidth,
  })
  project.children.push(bottomCopperCutSetting)

  const throughBoardCutSetting = new CutSetting({
    index: LAYER_INDEXES.throughBoard,
    name: "Cut Through Board",
    numPasses: boardSettings.numPasses,
    speed: boardSettings.speed,
    frequency: boardSettings.frequency,
    qPulseWidth: boardSettings.pulseWidth,
  })
  project.children.push(throughBoardCutSetting)

  const soldermaskCutSetting = new CutSetting({
    type: "Scan",
    index: LAYER_INDEXES.soldermask,
    name: "Soldermask",
    numPasses: 1,
    speed: 150,
    scanOpt: "individual",
    interval: 0.18,
    angle: 45,
    crossHatch: true,
  })
  project.children.push(soldermaskCutSetting)

  let soldermaskCureCutSetting: CutSetting | undefined
  if (shouldIncludeSoldermaskCure) {
    soldermaskCureCutSetting = new CutSetting({
      type: "Scan",
      index: LAYER_INDEXES.soldermaskCure,
      name: "Soldermask Cure",
      numPasses: 1,
      speed: 150,
      scanOpt: "individual",
      interval: 0.18,
      angle: 45,
      crossHatch: true,
    })
    project.children.push(soldermaskCureCutSetting)
  }

  // Create trace clearance cut settings if needed
  let topTraceClearanceAreaCutSetting: CutSetting | undefined
  let bottomTraceClearanceAreaCutSetting: CutSetting | undefined

  if (shouldGenerateTraceClearanceZones) {
    if (includeLayers.includes("top")) {
      topTraceClearanceAreaCutSetting = new CutSetting({
        type: "Scan",
        index: LAYER_INDEXES.topTraceClearance,
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
        index: LAYER_INDEXES.bottomTraceClearance,
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

  // Create copper cut fill cut settings if needed
  let topCopperCutFillCutSetting: CutSetting | undefined
  let bottomCopperCutFillCutSetting: CutSetting | undefined

  if (includeCopperCutFill && includeCopper) {
    if (includeLayers.includes("top")) {
      topCopperCutFillCutSetting = new CutSetting({
        type: "Scan",
        index: LAYER_INDEXES.topCopperCutFill,
        name: "Top Copper Cut Fill",
        numPasses: copperSettings.numPasses,
        speed: copperSettings.speed,
        scanOpt: "individual",
        interval: laserSpotSize,
        angle: 45,
        crossHatch: true,
      })
      project.children.push(topCopperCutFillCutSetting)
    }

    if (includeLayers.includes("bottom")) {
      bottomCopperCutFillCutSetting = new CutSetting({
        type: "Scan",
        index: LAYER_INDEXES.bottomCopperCutFill,
        name: "Bottom Copper Cut Fill",
        numPasses: copperSettings.numPasses,
        speed: copperSettings.speed,
        scanOpt: "individual",
        interval: laserSpotSize,
        angle: 45,
        crossHatch: true,
      })
      project.children.push(bottomCopperCutFillCutSetting)
    }
  }

  // Create oxidation cleaning layer cut settings if needed
  let topOxidationCleaningCutSetting: CutSetting | undefined
  let bottomOxidationCleaningCutSetting: CutSetting | undefined

  if (includeOxidationCleaningLayer) {
    if (includeLayers.includes("top")) {
      topOxidationCleaningCutSetting = new CutSetting({
        type: "Scan",
        index: LAYER_INDEXES.topOxidationCleaning,
        name: "Top Oxidation Cleaning",
        numPasses: copperSettings.numPasses,
        speed: 500,
        scanOpt: "individual",
        interval: laserSpotSize,
        angle: 45,
        crossHatch: true,
      })
      project.children.push(topOxidationCleaningCutSetting)
    }

    if (includeLayers.includes("bottom")) {
      bottomOxidationCleaningCutSetting = new CutSetting({
        type: "Scan",
        index: LAYER_INDEXES.bottomOxidationCleaning,
        name: "Bottom Oxidation Cleaning",
        numPasses: copperSettings.numPasses,
        speed: 500,
        scanOpt: "individual",
        interval: laserSpotSize,
        angle: 45,
        crossHatch: true,
      })
      project.children.push(bottomOxidationCleaningCutSetting)
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
    soldermaskCureCutSetting,
    connMap,
    topCutNetGeoms: new Map(),
    bottomCutNetGeoms: new Map(),
    topScanNetGeoms: new Map(),
    bottomScanNetGeoms: new Map(),
    origin,
    includeCopper,
    includeSoldermask,
    includeSoldermaskCure,
    globalCopperSoldermaskMarginAdjustment,
    includeLayers,
    traceMargin,
    laserSpotSize,
    topTraceClearanceAreaCutSetting,
    bottomTraceClearanceAreaCutSetting,
    solderMaskMarginPercent,
    topCopperCutFillCutSetting,
    bottomCopperCutFillCutSetting,
    copperCutFillMargin,
    topOxidationCleaningCutSetting,
    bottomOxidationCleaningCutSetting,
    topTraceEndpoints: new Set(),
    bottomTraceEndpoints: new Set(),
  }

  // Initialize net geometry maps
  for (const net of Object.keys(connMap.netMap)) {
    ctx.topCutNetGeoms.set(net, [])
    ctx.bottomCutNetGeoms.set(net, [])
    ctx.topScanNetGeoms.set(net, [])
    ctx.bottomScanNetGeoms.set(net, [])
  }

  // Extract board outline for clipping copper cut fill
  for (const board of db.pcb_board.list()) {
    if (board.outline?.length) {
      ctx.boardOutlineContour = board.outline.map((outlinePoint) => [
        outlinePoint.x + origin.x,
        outlinePoint.y + origin.y,
      ])
    } else if (
      typeof board.width === "number" &&
      typeof board.height === "number" &&
      board.center
    ) {
      const halfWidth = board.width / 2
      const halfHeight = board.height / 2
      const minX = board.center.x - halfWidth + origin.x
      const minY = board.center.y - halfHeight + origin.y
      const maxX = board.center.x + halfWidth + origin.x
      const maxY = board.center.y + halfHeight + origin.y
      ctx.boardOutlineContour = [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
      ]
    }
    break // Only use the first board
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

  // Create copper cut fill for each layer
  if (includeCopperCutFill && includeCopper) {
    if (includeLayers.includes("top")) {
      await createCopperCutFillForLayer({ layer: "top", ctx })
    }
    if (includeLayers.includes("bottom")) {
      await createCopperCutFillForLayer({ layer: "bottom", ctx })
    }
  }

  // Create oxidation cleaning layer for each layer
  if (includeOxidationCleaningLayer) {
    if (includeLayers.includes("top")) {
      await createOxidationCleaningLayerForLayer({ layer: "top", ctx })
    }
    if (includeLayers.includes("bottom")) {
      await createOxidationCleaningLayerForLayer({ layer: "bottom", ctx })
    }
  }

  if (shouldIncludeSoldermaskCure) {
    await createSoldermaskCureLayer({ ctx })
  }

  return project
}
