import type { PcbCutout } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { addCirclePcbCutout } from "./addCirclePcbCutout"
import { addRectPcbCutout } from "./addRectPcbCutout"
import { addPolygonPcbCutout } from "./addPolygonPcbCutout"
import { addPathPcbCutout } from "./addPathPcbCutout"

/**
 * Main dispatcher function that routes PCB cutouts to the appropriate handler
 * based on their shape property
 */
export const addPcbCutout = (cutout: PcbCutout, ctx: ConvertContext): void => {
  switch (cutout.shape) {
    case "circle":
      return addCirclePcbCutout(cutout, ctx)

    case "rect":
      return addRectPcbCutout(cutout, ctx)

    case "polygon":
      return addPolygonPcbCutout(cutout, ctx)

    case "path":
      return addPathPcbCutout(cutout, ctx)

    default:
      // Type guard to ensure we handle all cases
      const _exhaustive: never = cutout
      console.warn(`Unknown cutout shape: ${(cutout as any).shape}`)
  }
}
