import { test, expect } from "bun:test"
import circuitJson from "../assets/lga-interconnect.circuit.json" with {
  type: "json",
}
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"

test("lga-interconnect", async () => {
  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)

  expect(pcbSvg).toMatchSvgSnapshot(import.meta.filename)
})
