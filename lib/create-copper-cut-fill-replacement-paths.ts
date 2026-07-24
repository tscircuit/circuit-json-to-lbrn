import type { CircuitJson } from "circuit-json"
import type { ConvertContext } from "./ConvertContext"
import { createStrokedSegmentPath } from "./helpers/create-stroked-segment-path"
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

    for (let index = 0; index < path.route.length - 1; index += 1) {
      const start = path.route[index]!
      const end = path.route[index + 1]!
      const segmentPath = createStrokedSegmentPath({
        start,
        end,
        strokeWidth: path.stroke_width,
        origin: ctx.origin,
      })
      if (!segmentPath) {
        throw new Error(
          `Zero-length copper cut fill replacement for ${path.replaces_pcb_trace_id}`,
        )
      }

      ctx.project.children.push(
        createLayerShapePath({
          cutIndex: cutSetting.index,
          pathData: segmentPath,
          layer: path.layer,
          isClosed: true,
          ctx,
        }),
      )
    }
  }
}
