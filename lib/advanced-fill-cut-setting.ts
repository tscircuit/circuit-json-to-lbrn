import { CutSetting, type CutSettingInit, LightBurnBaseElement } from "lbrnts"

interface AdvancedFillCutSettingInit extends CutSettingInit {
  wobbleEnable: boolean
  anglePerPass: number
}

class CutSettingValueElement extends LightBurnBaseElement {
  constructor(
    private readonly propertyName: string,
    private readonly propertyValue: boolean | number,
  ) {
    super()
    this.token = propertyName
  }

  override toXml(indent = 0): string {
    const indentText = "    ".repeat(indent)
    const serializedValue =
      typeof this.propertyValue === "boolean"
        ? this.propertyValue
          ? "1"
          : "0"
        : String(this.propertyValue)
    return `${indentText}<${this.propertyName} Value="${serializedValue}"/>`
  }
}

export class AdvancedFillCutSetting extends CutSetting {
  readonly wobbleEnable: boolean
  readonly anglePerPass: number

  constructor(init: AdvancedFillCutSettingInit) {
    super(init)
    this.wobbleEnable = init.wobbleEnable
    this.anglePerPass = init.anglePerPass
  }

  override getChildren(): LightBurnBaseElement[] {
    return [
      ...super.getChildren(),
      new CutSettingValueElement("wobbleEnable", this.wobbleEnable),
      new CutSettingValueElement("anglePerPass", this.anglePerPass),
    ]
  }
}
