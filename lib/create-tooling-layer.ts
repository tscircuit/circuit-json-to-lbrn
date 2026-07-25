import type { CircuitJson } from "circuit-json"
import type { ConvertContext } from "./ConvertContext"
import { createStrokedRoutePaths } from "./helpers/create-stroked-route-paths"
import { createLayerShapePath } from "./helpers/createLayerShapePath"

export interface ToolingFabricationPath {
  type: "pcb_fabrication_note_path"
  pcb_fabrication_note_path_id: string
  layer: "top" | "bottom"
  route: Array<{ x: number; y: number }>
  stroke_width: number
  role: "tooling"
}

const isToolingFabricationPath = (
  element: CircuitJson[number],
): element is CircuitJson[number] & ToolingFabricationPath =>
  element.type === "pcb_fabrication_note_path" &&
  typeof element.pcb_fabrication_note_path_id === "string" &&
  "role" in element &&
  element.role === "tooling" &&
  Array.isArray(element.route) &&
  typeof element.stroke_width === "number" &&
  (element.layer === "top" || element.layer === "bottom")

const TOOLING_PATH_ID_PREFIX = "pcb_fabrication_note_path_"

export const getToolingFabricationPaths = (
  circuitJson: CircuitJson,
  includeRefs: string[],
): ToolingFabricationPath[] => {
  const includedPathIds = new Set(
    includeRefs.map((ref) => `${TOOLING_PATH_ID_PREFIX}${ref}`),
  )

  return circuitJson
    .filter(isToolingFabricationPath)
    .filter((path) => includedPathIds.has(path.pcb_fabrication_note_path_id))
}

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

    const routePaths = createStrokedRoutePaths({
      route: path.route,
      strokeWidth: path.stroke_width,
      origin: ctx.origin,
    })
    for (const routePath of routePaths) {
      ctx.project.children.push(
        createLayerShapePath({
          cutIndex,
          pathData: routePath,
          layer: path.layer,
          isClosed: true,
          ctx,
        }),
      )
    }
  }
}
