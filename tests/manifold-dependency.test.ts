import { expect, test } from "bun:test"
import manifoldPackageJson from "../node_modules/@tscircuit/manifold-2d/package.json"
import packageJson from "../package.json"

test("uses the zero-dependency manifold runtime", () => {
  expect(packageJson.dependencies["@tscircuit/manifold-2d"]).toBe("^0.0.6")
  expect("manifold-3d" in packageJson.dependencies).toBe(false)

  const manifoldManifest = manifoldPackageJson as {
    dependencies?: Record<string, string>
  }
  expect(manifoldManifest.dependencies ?? {}).toEqual({})
})
