export interface CostInputs {
  carPrice: number;
  downPayment: number;
  loanTerm: number;
  interestRate: number;
  fuelEfficiency: number;
  monthlyMileage: number;
  fuelPrice: number;
  insuranceMonthly: number;
}

export const validateCostInputs = (inputs: CostInputs): string | null => {
  if (!Number.isFinite(inputs.carPrice) || inputs.carPrice <= 0) return "차량 가격을 0원보다 크게 입력해주세요.";
  if (!Number.isFinite(inputs.downPayment) || inputs.downPayment < 0 || inputs.downPayment > inputs.carPrice) {
    return "선수금은 0원 이상, 차량 가격 이하로 입력해주세요.";
  }
  if (!Number.isInteger(inputs.loanTerm) || inputs.loanTerm < 1 || inputs.loanTerm > 120) {
    return "할부 기간은 1~120개월 사이의 정수로 입력해주세요.";
  }
  if (!Number.isFinite(inputs.interestRate) || inputs.interestRate < 0 || inputs.interestRate > 30) {
    return "금리는 0~30% 사이로 입력해주세요.";
  }
  if (!Number.isFinite(inputs.fuelEfficiency) || inputs.fuelEfficiency <= 0) return "연비는 0보다 크게 입력해주세요.";
  if (!Number.isFinite(inputs.monthlyMileage) || inputs.monthlyMileage < 0) return "월 주행거리는 0 이상으로 입력해주세요.";
  if (!Number.isFinite(inputs.fuelPrice) || inputs.fuelPrice < 0) return "연료 단가는 0 이상으로 입력해주세요.";
  if (!Number.isFinite(inputs.insuranceMonthly) || inputs.insuranceMonthly < 0) return "보험료는 0 이상으로 입력해주세요.";
  return null;
};

export const calculateMonthlyLoanPayment = (
  principal: number,
  annualRatePercent: number,
  months: number,
) => {
  if (
    !Number.isFinite(principal) ||
    !Number.isFinite(annualRatePercent) ||
    !Number.isInteger(months) ||
    months < 1 ||
    annualRatePercent < 0
  ) {
    throw new RangeError("Loan inputs must be finite, with a non-negative rate and at least one month.");
  }
  if (principal <= 0) return 0;
  if (annualRatePercent === 0) return principal / months;
  const monthlyRate = annualRatePercent / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
};
