import type { CircuitJsonUtilObjects } from "@tscircuit/circuit-json-util"
import type { PcbComponent } from "circuit-json"
import { CutSetting, LightBurnProject, ShapePath } from "lbrnts"
import type { ConvertContext } from "./ConvertContext"
import { createCopperShapesForLayer } from "./createCopperShapesForLayer"
import { addPlatedHole } from "./element-handlers/addPlatedHole"
import { addSmtPad } from "./element-handlers/addSmtPad"

export const getToolingLayerPcbComponents = ({
  db,
  includeLayers,
  selectors,
}: {
  db: CircuitJsonUtilObjects
  includeLayers: Array<"top" | "bottom">
  selectors: string[]
}): PcbComponent[] => {
  if (selectors.length === 0) return []

  const selectedSourceComponentIds = new Set(
    selectors
      .map((selector) => db.source_component.select(selector))
      .filter((component) => component !== null)
      .map((component) => component.source_component_id),
  )

  return db.pcb_component
    .list()
    .filter(
      (component) =>
        selectedSourceComponentIds.has(component.source_component_id) &&
        includeLayers.includes(component.layer as "top" | "bottom"),
    )
}

export const createToolingLayerForComponents = async ({
  ctx,
  pcbComponents,
}: {
  ctx: ConvertContext
  pcbComponents: PcbComponent[]
}): Promise<void> => {
  const { tool1CutSetting } = ctx
  if (!tool1CutSetting || pcbComponents.length === 0) return

  const toolingProject = new LightBurnProject()
  const ignoredDrillCutSetting = new CutSetting({ index: -1 })
  const toolingCtx: ConvertContext = {
    ...ctx,
    project: toolingProject,
    topCopperCutSetting: tool1CutSetting,
    bottomCopperCutSetting: tool1CutSetting,
    throughBoardCutSetting: ignoredDrillCutSetting,
    topSoldermaskCutSetting: undefined,
    bottomSoldermaskCutSetting: undefined,
    topSoldermaskCureCutSetting: undefined,
    bottomSoldermaskCureCutSetting: undefined,
    reflectedBottomBoardCutSetting: undefined,
    topCutNetGeoms: new Map(),
    bottomCutNetGeoms: new Map(),
    topScanNetGeoms: new Map(),
    bottomScanNetGeoms: new Map(),
    includeCopper: true,
    includeSoldermask: false,
    includeSoldermaskCure: false,
    topTraceEndpoints: new Set(),
    bottomTraceEndpoints: new Set(),
  }
  const smtPads = ctx.db.pcb_smtpad.list()
  const platedHoles = ctx.db.pcb_plated_hole.list()
  const toolingLayers = new Set<"top" | "bottom">()

  for (const component of pcbComponents) {
    const componentLayer = component.layer as "top" | "bottom"
    toolingLayers.add(componentLayer)
    const componentCtx = {
      ...toolingCtx,
      includeLayers: [componentLayer],
    }

    for (const smtPad of smtPads) {
      if (smtPad.pcb_component_id === component.pcb_component_id) {
        addSmtPad(smtPad, componentCtx)
      }
    }

    for (const platedHole of platedHoles) {
      if (platedHole.pcb_component_id === component.pcb_component_id) {
        addPlatedHole(platedHole, componentCtx)
      }
    }
  }

  for (const layer of toolingLayers) {
    await createCopperShapesForLayer({ layer, ctx: toolingCtx })
  }

  ctx.project.children.push(
    ...toolingProject.children.filter(
      (child): child is ShapePath =>
        child instanceof ShapePath && child.cutIndex === tool1CutSetting.index,
    ),
  )
}
