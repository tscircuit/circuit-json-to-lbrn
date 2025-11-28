import type { PcbSmtPad } from "circuit-json"
import type { ConvertContext } from "../../ConvertContext"
import { addRectSmtPad } from "./addRectSmtPad"
import { addCircleSmtPad } from "./addCircleSmtPad"
import { addPillSmtPad } from "./addPillSmtPad"
import { addRotatedPillSmtPad } from "./addRotatedPillSmtPad"
import { addPolygonSmtPad } from "./addPolygonSmtPad"
import { addRotatedRectSmtPad } from "./addRotatedRectSmtPad"

export const addSmtPad = (smtPad: PcbSmtPad, ctx: ConvertContext) => {
  switch (smtPad.shape) {
    case "rect":
      return addRectSmtPad(smtPad, ctx)

    case "circle":
      return addCircleSmtPad(smtPad, ctx)

    case "pill":
      return addPillSmtPad(smtPad, ctx)

    case "rotated_pill":
      return addRotatedPillSmtPad(smtPad, ctx)

    case "polygon":
      return addPolygonSmtPad(smtPad, ctx)

    case "rotated_rect":
      return addRotatedRectSmtPad(smtPad, ctx)

    default:
      throw new Error(`Unknown smt pad shape: ${(smtPad as any).shape}`)
  }
}
