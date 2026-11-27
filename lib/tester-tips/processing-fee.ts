function decimalRational(value: number): { numerator: bigint; denominator: bigint } {
  const match = value.toString().toLowerCase().match(/^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/);
  if (!match) throw new Error("Stripe returned an invalid exchange rate.");

  const fraction = match[2] ?? "";
  const exponent = Number(match[3] ?? 0);
  const scale = fraction.length - exponent;
  if (!Number.isSafeInteger(scale) || Math.abs(scale) > 400) {
    throw new Error("Stripe returned an unsupported exchange rate.");
  }

  let numerator = BigInt(`${match[1]}${fraction}`);
  let denominator = BigInt(1);
  if (scale > 0) denominator = BigInt(10) ** BigInt(scale);
  else if (scale < 0) numerator *= BigInt(10) ** BigInt(-scale);
  return { numerator, denominator };
}

/**
 * Stripe's BalanceTransaction exchange_rate multiplies source minor units by
 * the rate to produce destination minor units. Processing fees are reported
 * in the settlement transaction currency, so convert them back to the charge
 * currency by dividing and round up to the smallest charge currency unit.
 */
export function convertBalanceFeeToChargeMinorUnits(
  settlementFeeMinor: number,
  settlementCurrency: string,
  chargeCurrency: string,
  exchangeRate: unknown,
): number {
  if (!Number.isSafeInteger(settlementFeeMinor) || settlementFeeMinor < 0) {
    throw new Error("Stripe returned an invalid processing fee amount.");
  }
  if (settlementCurrency.toLowerCase() === chargeCurrency.toLowerCase()) return settlementFeeMinor;

  const rate = typeof exchangeRate === "number" ? exchangeRate : Number.NaN;
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Unable to convert the Stripe processing fee because Stripe omitted a valid exchange rate.");
  }

  const { numerator, denominator } = decimalRational(rate);
  const converted = (BigInt(settlementFeeMinor) * denominator + numerator - BigInt(1)) / numerator;
  const result = Number(converted);
  if (!Number.isSafeInteger(result)) throw new Error("Converted Stripe processing fee is out of range.");
  return result;
}

/** Cap a processing-fee reimbursement at the unrefunded part of the fee. */
export function availableApplicationFeeRefund(
  processingFeeChargeMinor: number,
  applicationFeeMinor: number,
  applicationFeeRefundedMinor: number,
): number {
  for (const amount of [processingFeeChargeMinor, applicationFeeMinor, applicationFeeRefundedMinor]) {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new Error("Stripe returned invalid application fee amounts.");
    }
  }
  if (applicationFeeRefundedMinor > applicationFeeMinor) {
    throw new Error("Stripe reports more application-fee refunds than the collected fee.");
  }
  return Math.min(processingFeeChargeMinor, applicationFeeMinor - applicationFeeRefundedMinor);
}
