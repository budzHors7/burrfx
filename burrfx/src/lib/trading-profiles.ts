import type {
  TradingProfileId,
  TradingProfileOption,
} from "@/types/api";

export const tradingProfileOptions: readonly TradingProfileOption[] = [
  {
    id: "smart_risk",
    label: "Smart Risk",
    description:
      "Broker minimum lot, lower spread cap, take profit on, break-even on, no trailing.",
    lot_mode: "min",
    risk_percent: 0.5,
    max_spread_points: 18,
    use_take_profit: true,
    use_break_even: true,
    use_trailing_stop: false,
  },
  {
    id: "regular_risk",
    label: "Regular Risk",
    description:
      "Current-style automatic lot sizing, take profit on, break-even on, trailing on.",
    lot_mode: "auto",
    risk_percent: 1,
    max_spread_points: 30,
    use_take_profit: true,
    use_break_even: true,
    use_trailing_stop: true,
  },
  {
    id: "highly_risky",
    label: "Highly Risky",
    description:
      "Higher automatic lot sizing, wider spread cap, no take profit, then break-even and trailing.",
    lot_mode: "auto",
    risk_percent: 2,
    max_spread_points: 45,
    use_take_profit: false,
    use_break_even: true,
    use_trailing_stop: true,
  },
] as const;

export const defaultTradingProfileId: TradingProfileId =
  "regular_risk";

export function getTradingProfileOption(
  tradingProfileId?: string | null
): TradingProfileOption {
  return (
    tradingProfileOptions.find(
      (option) => option.id === tradingProfileId
    ) ?? tradingProfileOptions[1]
  );
}
