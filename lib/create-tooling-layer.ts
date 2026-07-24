import type { CircuitJson } from "circuit-json"
import type { ConvertContext } from "./ConvertContext"
import { createStrokedSegmentPath } from "./helpers/create-stroked-segment-path"
import { createLayerShapePath } from "./helpers/createLayerShapePath"

export interface ToolingFabricationPath {
  type: "pcb_fabrication_note_path"
  layer: "top" | "bottom"
  route: Array<{ x: number; y: number }>
  stroke_width: number
  role: "tooling"
}

const isToolingFabricationPath = (
  element: CircuitJson[number],
): element is CircuitJson[number] & ToolingFabricationPath =>
  element.type === "pcb_fabrication_note_path" &&
  "role" in element &&
  element.role === "tooling" &&
  (element.layer === "top" || element.layer === "bottom")

export const getToolingFabricationPaths = (
  circuitJson: CircuitJson,
): ToolingFabricationPath[] => circuitJson.filter(isToolingFabricationPath)

export const addToolingLayerShapes = (
  paths: ToolingFabricationPath[],
  ctx: ConvertContext,
): void => {
  const cutIndex = ctx.tool1CutSetting?.index
  if (cutIndex === undefined) return

  for (const path of paths) {
    if (!ctx.includeLayers.includes(path.layer) || path.stroke_width <= 0) {
      continue
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
      if (!segmentPath) continue

      ctx.project.children.push(
        createLayerShapePath({
          cutIndex,
          pathData: segmentPath,
          layer: path.layer,
          isClosed: true,
          ctx,
        }),
      )
    }
  }
}
