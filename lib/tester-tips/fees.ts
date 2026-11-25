export type TesterTipFeeRule = {
  rule_order: number;
  from_pence: number;
  to_pence: number | null;
  fee_type: "fixed" | "percentage";
  fee_value: number;
  description: string;
};

export function calculateTesterTipFeePence(tipAmountPence: number, rules: TesterTipFeeRule[]) {
  if (!Number.isSafeInteger(tipAmountPence) || tipAmountPence < 500 || tipAmountPence > 10000) {
    throw new Error("Choose a tip between £5 and £100.");
  }
  if (!rules.length) throw new Error("Tester tip fees are not configured.");
  let fee = 0;
  const ordered = [...rules].sort((a, b) => a.rule_order - b.rule_order);
  let expectedFrom = 0;
  for (const [index, rule] of ordered.entries()) {
    if (rule.from_pence !== expectedFrom || !Number.isSafeInteger(rule.fee_value) || rule.fee_value < 0) {
      throw new Error("The current tester tip fee rules are invalid.");
    }
    if (rule.fee_type === "fixed") {
      if (index !== 0 || rule.to_pence === null || rule.to_pence <= rule.from_pence) {
        throw new Error("The current tester tip fee rules are invalid.");
      }
      if (tipAmountPence > rule.from_pence) fee += rule.fee_value;
      expectedFrom = rule.to_pence;
      continue;
    }
    if (rule.fee_type !== "percentage" || rule.fee_value > 10000 ||
        (rule.to_pence !== null && rule.to_pence <= rule.from_pence) ||
        (rule.to_pence === null && index !== ordered.length - 1)) {
      throw new Error("The current tester tip fee rules are invalid.");
    }
    const upper = rule.to_pence ?? tipAmountPence;
    const portion = Math.max(0, Math.min(tipAmountPence, upper) - rule.from_pence);
    fee += Math.floor((portion * rule.fee_value + 5000) / 10000);
    if (rule.to_pence !== null) expectedFrom = rule.to_pence;
  }
  if (ordered.at(-1)?.to_pence !== null) {
    throw new Error("The current tester tip fee rules are invalid.");
  }
  if (!Number.isSafeInteger(fee) || fee < 0 || fee >= tipAmountPence * 2) {
    throw new Error("The current tester tip fee rules are invalid.");
  }
  return fee;
}

export function formatGbpPence(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value / 100);
}
