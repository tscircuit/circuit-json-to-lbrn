import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { CutSetting, LightBurnProject, ShapePath } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../../lib"
import type { ConvertContext } from "../../../lib/ConvertContext"
import { createCopperCutFillForLayer } from "../../../lib/createCopperCutFillForLayer"
import { createCopperShapesForLayer } from "../../../lib/createCopperShapesForLayer"
import { addCopperGeometryToNetOrProject } from "../../../lib/helpers/addCopperGeometryToNetOrProject"
import { LAYER_INDEXES } from "../../../lib/layer-indexes"

type LightBurnNode = {
  cutIndex?: number
  children?: LightBurnNode[]
}

const countShapePathsForCutIndex = (
  nodes: LightBurnNode[],
  cutIndex: number,
): number =>
  nodes.reduce((count, node) => {
    const ownCount =
      node instanceof ShapePath && node.cutIndex === cutIndex ? 1 : 0
    const childCount = node.children
      ? countShapePathsForCutIndex(node.children, cutIndex)
      : 0
    return count + ownCount + childCount
  }, 0)

test("renders unconnected smt pad as its own copper net", async () => {
  const project = new LightBurnProject({
    appVersion: "1.7.03",
    formatVersion: "1",
  })
  const topCopperCutSetting = new CutSetting({
    index: LAYER_INDEXES.topCopper,
    name: "Cut Top Copper",
  })
  const bottomCopperCutSetting = new CutSetting({
    index: LAYER_INDEXES.bottomCopper,
    name: "Cut Bottom Copper",
  })
  const topCopperCutFillCutSetting = new CutSetting({
    type: "Scan",
    index: LAYER_INDEXES.topCopperCutFill,
    name: "Top Copper Cut Fill",
  })

  project.children.push(
    topCopperCutSetting,
    bottomCopperCutSetting,
    topCopperCutFillCutSetting,
  )

  const ctx = {
    project,
    connMap: {
      getNetConnectedToId: () => undefined,
    },
    topCutNetGeoms: new Map(),
    bottomCutNetGeoms: new Map(),
    topScanNetGeoms: new Map(),
    bottomScanNetGeoms: new Map(),
    topCopperCutSetting,
    bottomCopperCutSetting,
    topCopperCutFillCutSetting,
    includeLayers: ["top"],
    copperCutFillMargin: 0.25,
  } as unknown as ConvertContext

  addCopperGeometryToNetOrProject({
    geometryId: "unconnected_pad_1",
    layer: "top",
    ctx,
    path: {
      verts: [
        { x: -1, y: -0.5 },
        { x: 1, y: -0.5 },
        { x: 1, y: 0.5 },
        { x: -1, y: 0.5 },
        { x: -1, y: -0.5 },
      ],
      prims: [{ type: 0 }, { type: 0 }, { type: 0 }, { type: 0 }, { type: 0 }],
    },
  })

  expect(ctx.topCutNetGeoms.has("unconnected:unconnected_pad_1")).toBe(true)

  await createCopperShapesForLayer({ layer: "top", ctx })
  await createCopperCutFillForLayer({ layer: "top", ctx })

  expect(
    countShapePathsForCutIndex(
      project.children as LightBurnNode[],
      LAYER_INDEXES.topCopper,
    ),
  ).toBeGreaterThan(0)
  expect(
    countShapePathsForCutIndex(
      project.children as LightBurnNode[],
      LAYER_INDEXES.topCopperCutFill,
    ),
  ).toBeGreaterThan(0)
})

test("includes manually inserted no-net smt pad in copper cut fill", async () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      width: 10,
      height: 10,
      center: { x: 0, y: 0 },
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "manual_pad_1",
      shape: "rect",
      x: 0,
      y: 0,
      width: 1.5,
      height: 1,
      layer: "top",
    },
  ] as CircuitJson

  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeCopper: true,
    includeCopperCutFill: true,
    includeLayers: ["top"],
    copperCutFillMargin: 0.25,
  })

  expect(
    countShapePathsForCutIndex(
      project.children as LightBurnNode[],
      LAYER_INDEXES.topCopper,
    ),
  ).toBeGreaterThan(0)
  expect(
    countShapePathsForCutIndex(
      project.children as LightBurnNode[],
      LAYER_INDEXES.topCopperCutFill,
    ),
  ).toBeGreaterThan(0)
})
