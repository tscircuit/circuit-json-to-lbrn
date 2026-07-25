import type { CircuitJson } from "circuit-json"
import type { ConvertContext } from "./ConvertContext"
import { createStrokedRoutePaths } from "./helpers/create-stroked-route-paths"
import { createLayerShapePath } from "./helpers/createLayerShapePath"

export interface CopperCutFillReplacementPath {
  type: "pcb_fabrication_note_path"
  layer: "top" | "bottom"
  route: Array<{ x: number; y: number }>
  stroke_width: number
  role: "copper_cut_fill"
  replaces_pcb_trace_id: string
}

const isCopperCutFillReplacementPath = (
  element: CircuitJson[number],
): element is CircuitJson[number] & CopperCutFillReplacementPath =>
  element.type === "pcb_fabrication_note_path" &&
  "role" in element &&
  element.role === "copper_cut_fill" &&
  "replaces_pcb_trace_id" in element &&
  typeof element.replaces_pcb_trace_id === "string" &&
  Array.isArray(element.route) &&
  typeof element.stroke_width === "number" &&
  (element.layer === "top" || element.layer === "bottom")

export const getCopperCutFillReplacementPaths = (
  circuitJson: CircuitJson,
): CopperCutFillReplacementPath[] =>
  circuitJson.filter(isCopperCutFillReplacementPath)

export const addCopperCutFillReplacementShapes = (
  paths: CopperCutFillReplacementPath[],
  ctx: ConvertContext,
): void => {
  for (const path of paths) {
    const cutSetting =
      path.layer === "top"
        ? ctx.topCopperCutFillCutSetting
        : ctx.bottomCopperCutFillCutSetting
    if (!cutSetting || !ctx.includeLayers.includes(path.layer)) continue
    if (path.stroke_width <= 0 || path.route.length < 2) {
      throw new Error(
        `Invalid copper cut fill replacement for ${path.replaces_pcb_trace_id}`,
      )
    }

    const routePaths = createStrokedRoutePaths({
      route: path.route,
      strokeWidth: path.stroke_width,
      origin: ctx.origin,
    })
    if (routePaths.length === 0) {
      throw new Error(
        `Zero-length copper cut fill replacement for ${path.replaces_pcb_trace_id}`,
      )
    }
    for (const routePath of routePaths) {
      ctx.project.children.push(
        createLayerShapePath({
          cutIndex: cutSetting.index,
          pathData: routePath,
          layer: path.layer,
          isClosed: true,
          ctx,
        }),
      )
    }
  }
}
