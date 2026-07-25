import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { CutSetting } from "lbrnts"
import { convertCircuitJsonToLbrn } from "../../lib"
import { LAYER_INDEXES } from "../../lib/layer-indexes"
import circuitJson from "../examples/example05/example05.circuit.json" with {
  type: "json",
}

test("uses the production fill settings for layers 6 and 16", async () => {
  const project = await convertCircuitJsonToLbrn(circuitJson as CircuitJson, {
    includeLayers: ["top"],
    includeCopper: true,
    includeCopperCutFill: true,
    includeSoldermaskAblation: true,
  })
  const cutSettings = project.children.filter(
    (child): child is CutSetting => child instanceof CutSetting,
  )
  const topCopper = cutSettings.find(
    (setting) => setting.index === LAYER_INDEXES.topCopper,
  )
  const copperCutFill = cutSettings.find(
    (setting) => setting.index === LAYER_INDEXES.topCopperCutFill,
  )
  const soldermaskAblation = cutSettings.find(
    (setting) => setting.index === LAYER_INDEXES.topSoldermaskAblation,
  )

  expect(topCopper).toMatchObject({
    type: "Cut",
    speed: 300,
    numPasses: 1,
  })
  expect(copperCutFill).toMatchObject({
    type: "Scan",
    speed: 700,
    frequency: 20000,
    qPulseWidth: 1,
    interval: 0.03,
    numPasses: 50,
    scanOpt: "mergeAll",
    crossHatch: true,
    wobbleEnable: true,
    anglePerPass: 1,
  })
  expect(soldermaskAblation).toMatchObject({
    type: "Scan",
    speed: 7000,
    frequency: 40000,
    qPulseWidth: 1,
    interval: 0.1,
    numPasses: 5,
    scanOpt: "mergeAll",
    crossHatch: true,
    wobbleEnable: true,
    anglePerPass: 1,
  })

  const xml = project.getString()
  const copperCutFillXml = xml.match(
    /<CutSetting type="Scan">\s*<index Value="6"\/>[\s\S]*?<\/CutSetting>/,
  )?.[0]
  const soldermaskAblationXml = xml.match(
    /<CutSetting type="Scan">\s*<index Value="16"\/>[\s\S]*?<\/CutSetting>/,
  )?.[0]

  for (const layerXml of [copperCutFillXml, soldermaskAblationXml]) {
    expect(layerXml).toContain('<scanOpt Value="mergeAll"/>')
    expect(layerXml).toContain('<crossHatch Value="1"/>')
    expect(layerXml).toContain('<wobbleEnable Value="1"/>')
    expect(layerXml).toContain('<anglePerPass Value="1"/>')
  }
})
