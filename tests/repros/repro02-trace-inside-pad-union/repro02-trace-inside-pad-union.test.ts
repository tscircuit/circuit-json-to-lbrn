import { expect, test } from "bun:test"
import type { CircuitJson, SourceTrace } from "circuit-json"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { generateLightBurnSvg } from "lbrnts"
import { convertCircuitJsonToLbrn } from "lib/index"
import { stackSvgsVertically } from "stack-svgs"

/**
 * Repro: trace crossing inside a rectangular pad is not unioned in copper output.
 *
 * This mimics net connectivity loss seen in some kicad_pcb -> circuit-json conversions:
 * both the pad and trace are emitted as standalone copper paths instead of one unified
 * polygon, leaving a visible line inside the pad area.
 */
test.skip("repro02 - trace inside pad should be unioned", async () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board_1",
      width: 12,
      height: 12,
      center: { x: 0, y: 0 },
    },
    {
      type: "pcb_smtpad",
      pcb_smtpad_id: "pad_1",
      x: 0,
      y: 0,
      width: 2.8,
      height: 2.8,
      shape: "rect",
      layer: "top",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "trace_1",
      source_trace_id: "source_trace_1",
      route: [
        { x: -0.9, y: 0, width: 0.35, layer: "top" },
        { x: 0.9, y: 0, width: 0.35, layer: "top" },
      ],
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_1",
      connected_source_net_ids: [],
      connected_source_port_ids: [],
    } as SourceTrace,
  ] as CircuitJson

  const pcbSvg = await convertCircuitJsonToPcbSvg(circuitJson)
  const project = await convertCircuitJsonToLbrn(circuitJson, {
    includeLayers: ["top"],
    includeCopperCutFill: true,
  })

  const lbrnSvg = await generateLightBurnSvg(project, {
    defaultStrokeWidth: 0.01,
  })

  expect(stackSvgsVertically([pcbSvg, lbrnSvg])).toMatchSvgSnapshot(
    import.meta.filename,
  )

  const projectXml = project.getString()
  const topCopperPathCount = (
    projectXml.match(/<Shape Type="Path" CutIndex="0">/g) ?? []
  ).length

  // Expected for a fixed implementation: trace+pad are unioned into one top-copper path.
  // Current behavior reproduces the bug: this assertion fails because we get >1 path.
  expect(topCopperPathCount).toBe(1)
})
