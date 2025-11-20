import type { CircuitJson } from "circuit-json"
import { LightBurnProject, CutSetting } from "lbrnts"
import { cju } from "@tscircuit/circuit-json-util"
import type { ConvertContext } from "./ConvertContext"
import { addPlatedHole } from "./element-handlers/addPlatedHole"
import { addSmtPad } from "./element-handlers/addSmtPad"
import { addPcbTrace } from "./element-handlers/addPcbTrace"
import { groupElementsByConnectivity } from "./utils/group-elements-by-connectivity"
import { elementToPolygon } from "./geometry/convert-element-to-polygon"
import { unionPolygons } from "./geometry/union-polygons"
import { polygonToShapePath } from "./geometry/convert-polygon-to-shape-path"

export const convertCircuitJsonToLbrn = (
  circuitJson: CircuitJson,
  options: { includeSilkscreen?: boolean } = {},
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

  const ctx: ConvertContext = {
    db,
    project,
    copperCutSetting,
  }

  // Group elements by connectivity (net)
  const grouped = groupElementsByConnectivity(db)

  // Process each net group with boolean union operations
  for (const netGroup of grouped.netGroups) {
    const polygons = []

    // Convert all pads to polygons
    for (const pad of netGroup.pads) {
      const poly = elementToPolygon(pad)
      if (poly) polygons.push(poly)
    }

    // Convert all traces to polygons
    for (const trace of netGroup.traces) {
      const poly = elementToPolygon(trace)
      if (poly) polygons.push(poly)
    }

    // Convert all plated holes to polygons
    for (const hole of netGroup.platedHoles) {
      const poly = elementToPolygon(hole)
      if (poly) polygons.push(poly)
    }

    // Union all polygons and split into islands
    const unifiedPolygons = unionPolygons(polygons)

    // Create a ShapePath for each island
    for (const polygon of unifiedPolygons) {
      const shapePath = polygonToShapePath(polygon, copperCutSetting.index ?? 0)
      project.children.push(shapePath)
    }
  }

  return project
}
