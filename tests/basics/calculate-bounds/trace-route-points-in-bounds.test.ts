import { test, expect } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { calculateCircuitBounds } from "lib/calculateBounds"
import tetrisCircuitJson from "../../assets/tscircuit-tetris-v2.circuit.json"

test("trace route points contribute their half width", () => {
  const bounds = calculateCircuitBounds([
    {
      type: "pcb_trace",
      pcb_trace_id: "trace1",
      route: [
        {
          route_type: "wire",
          x: 0,
          y: 0,
          width: 0.5,
          layer: "top",
        },
        {
          route_type: "wire",
          x: 10,
          y: 0,
          width: 0.5,
          layer: "top",
        },
      ],
    },
  ])

  expect(bounds).toEqual({ minX: -0.25, minY: -0.25, maxX: 10.25, maxY: 0.25 })
})

test("a route point without x and y does not void the bounds", () => {
  // The tetris board carries two through_obstacle route points, which hold
  // start/end instead of x/y. Reading x off those produced NaN, and the NaN
  // spread through every comparison, so the whole board fell back to a zero
  // bounding box and lost its origin shift.
  const bounds = calculateCircuitBounds(tetrisCircuitJson as CircuitJson)

  expect(bounds).toEqual({ minX: -34, minY: -26, maxX: 34, maxY: 26 })
})
