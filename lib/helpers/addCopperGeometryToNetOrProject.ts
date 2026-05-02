import type { ConvertContext } from "../ConvertContext"
import { pathToPolygon } from "./pathToPolygon"

const ensureGeometryMapsHaveNet = (ctx: ConvertContext, netId: string) => {
  if (!ctx.topCutNetGeoms.has(netId)) ctx.topCutNetGeoms.set(netId, [])
  if (!ctx.bottomCutNetGeoms.has(netId)) ctx.bottomCutNetGeoms.set(netId, [])
  if (!ctx.topScanNetGeoms.has(netId)) ctx.topScanNetGeoms.set(netId, [])
  if (!ctx.bottomScanNetGeoms.has(netId)) ctx.bottomScanNetGeoms.set(netId, [])
}

export const addCopperGeometryToNetOrProject = ({
  geometryId,
  path,
  layer,
  ctx,
}: {
  geometryId: string
  path: { verts: { x: number; y: number }[]; prims: Array<{ type: number }> }
  layer: "top" | "bottom"
  ctx: ConvertContext
}) => {
  const { connMap, topCutNetGeoms, bottomCutNetGeoms, includeLayers } = ctx

  if (!includeLayers.includes(layer)) return

  const netId =
    connMap.getNetConnectedToId(geometryId) ?? `unconnected:${geometryId}`
  const netGeoms = layer === "top" ? topCutNetGeoms : bottomCutNetGeoms

  ensureGeometryMapsHaveNet(ctx, netId)
  netGeoms.get(netId)!.push(pathToPolygon(path.verts))
}
