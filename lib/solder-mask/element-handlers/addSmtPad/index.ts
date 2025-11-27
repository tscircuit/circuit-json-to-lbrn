import type { PcbSmtPad } from "circuit-json"
import type { ConvertContext } from "../../../ConvertContext"
import { addRectSmtPad } from "./addRectSmtPad"

export const addSmtPad = (smtPad: PcbSmtPad, ctx: ConvertContext) => {
  switch (smtPad.shape) {
    case "rect": {
      addRectSmtPad(smtPad, ctx)
      break
    }
    default: {
      throw new Error(`Unknown smt pad shape: ${smtPad.shape}`)
    }
  }
}
