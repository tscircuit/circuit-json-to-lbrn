# circuit-json-to-lbrn

Convert Circuit JSON to LBRN XML for PCB fabrication via laser ablation.

## Usage

```tsx
import { convertCircuitJsonToLbrn } from "circuit-json-to-lbrn"

const lbrnXml = convertCircuitJsonToLbrn(circuitJson, {
  includeSilkscreen: true,
})
```
