import { describe, expect, it } from "vitest";
import { calculateMonthlyLoanPayment, validateCostInputs, type CostInputs } from "./calculator";

const validInputs: CostInputs = {
  carPrice: 35_000_000,
  downPayment: 10_000_000,
  loanTerm: 48,
  interestRate: 5.5,
  fuelEfficiency: 12,
  monthlyMileage: 1_500,
  fuelPrice: 1_650,
  insuranceMonthly: 85_000,
};

describe("validateCostInputs", () => {
  it("accepts a realistic calculator input", () => {
    expect(validateCostInputs(validInputs)).toBeNull();
  });

  it("rejects a down payment above the vehicle price", () => {
    expect(validateCostInputs({ ...validInputs, downPayment: 40_000_000 })).toContain("차량 가격 이하");
  });

  it("rejects zero fuel efficiency before division", () => {
    expect(validateCostInputs({ ...validInputs, fuelEfficiency: 0 })).toContain("0보다 크게");
  });
});

describe("calculateMonthlyLoanPayment", () => {
  it("handles zero-interest loans without producing NaN", () => {
    expect(calculateMonthlyLoanPayment(12_000_000, 0, 12)).toBe(1_000_000);
  });

  it("returns zero when no principal remains", () => {
    expect(calculateMonthlyLoanPayment(0, 5, 48)).toBe(0);
  });

  it("rejects an invalid term before division", () => {
    expect(() => calculateMonthlyLoanPayment(12_000_000, 5, 0)).toThrow(RangeError);
  });

  it("rejects non-finite loan values", () => {
    expect(() => calculateMonthlyLoanPayment(Number.NaN, 5, 48)).toThrow(RangeError);
  });
});
