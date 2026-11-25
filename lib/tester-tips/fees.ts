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
  for (const rule of [...rules].sort((a, b) => a.rule_order - b.rule_order)) {
    if (rule.fee_type === "fixed") {
      if (tipAmountPence > rule.from_pence) fee += rule.fee_value;
      continue;
    }
    const upper = rule.to_pence ?? tipAmountPence;
    const portion = Math.max(0, Math.min(tipAmountPence, upper) - rule.from_pence);
    fee += Math.floor((portion * rule.fee_value + 5000) / 10000);
  }
  if (!Number.isSafeInteger(fee) || fee < 0 || fee >= tipAmountPence * 2) {
    throw new Error("The current tester tip fee rules are invalid.");
  }
  return fee;
}

export function formatGbpPence(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value / 100);
}
