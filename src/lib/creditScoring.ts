// Credit scoring utility functions for family members

export interface CreditScoreFactors {
  paymentHistory: number; // 0-40 points
  loanRepayment: number; // 0-30 points
  contributionConsistency: number; // 0-20 points
  finesIncurred: number; // 0-10 points (deduction)
  membershipLength: number; // 0-10 points
}

export interface CreditScoreResult {
  score: number; // 0-100
  rating: "Excellent" | "Good" | "Fair" | "Poor";
  factors: CreditScoreFactors;
  recommendations: string[];
}

export function calculateCreditScore(data: {
  totalContributions: number;
  paidOnTimeContributions: number;
  lateContributions: number;
  totalLoans: number;
  repaidLoansOnTime: number;
  defaultedLoans: number;
  totalFines: number;
  monthsAsMember: number;
  consecutiveMonthsPaid: number;
}): CreditScoreResult {
  const factors: CreditScoreFactors = {
    paymentHistory: 0,
    loanRepayment: 0,
    contributionConsistency: 0,
    finesIncurred: 0,
    membershipLength: 0,
  };

  // 1. Payment History (40 points max)
  if (data.totalContributions > 0) {
    const onTimeRate = data.paidOnTimeContributions / data.totalContributions;
    factors.paymentHistory = Math.round(onTimeRate * 40);
  }

  // 2. Loan Repayment (30 points max)
  if (data.totalLoans > 0) {
    const repaymentRate = data.repaidLoansOnTime / data.totalLoans;
    const defaultPenalty = data.defaultedLoans * 10; // -10 points per default
    factors.loanRepayment = Math.max(0, Math.round(repaymentRate * 30) - defaultPenalty);
  } else {
    factors.loanRepayment = 15; // Neutral score if no loan history
  }

  // 3. Contribution Consistency (20 points max)
  const consistencyScore = Math.min(data.consecutiveMonthsPaid, 12) / 12;
  factors.contributionConsistency = Math.round(consistencyScore * 20);

  // 4. Fines Deduction (up to -10 points)
  const finesPenalty = Math.min(data.totalFines / 1000, 10); // 1 point per 1000 FCFA in fines
  factors.finesIncurred = -Math.round(finesPenalty);

  // 5. Membership Length (10 points max)
  const lengthScore = Math.min(data.monthsAsMember / 24, 1); // Max score at 2 years
  factors.membershipLength = Math.round(lengthScore * 10);

  // Calculate total score
  const totalScore = Math.max(
    0,
    Math.min(
      100,
      factors.paymentHistory +
        factors.loanRepayment +
        factors.contributionConsistency +
        factors.finesIncurred +
        factors.membershipLength
    )
  );

  // Determine rating
  let rating: "Excellent" | "Good" | "Fair" | "Poor";
  if (totalScore >= 80) rating = "Excellent";
  else if (totalScore >= 60) rating = "Good";
  else if (totalScore >= 40) rating = "Fair";
  else rating = "Poor";

  // Generate recommendations
  const recommendations: string[] = [];
  if (factors.paymentHistory < 30) {
    recommendations.push("Improve payment timeliness to boost your score");
  }
  if (factors.loanRepayment < 20 && data.totalLoans > 0) {
    recommendations.push("Focus on timely loan repayments");
  }
  if (factors.contributionConsistency < 15) {
    recommendations.push("Maintain consistent monthly contributions");
  }
  if (factors.finesIncurred < -5) {
    recommendations.push("Reduce late fees and fines");
  }
  if (recommendations.length === 0) {
    recommendations.push("Excellent credit profile! Keep up the good work.");
  }

  return {
    score: totalScore,
    rating,
    factors,
    recommendations,
  };
}

export function getCreditScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
}

export function getCreditScoreBadgeVariant(rating: string): "default" | "secondary" | "destructive" | "outline" {
  switch (rating) {
    case "Excellent":
      return "default";
    case "Good":
      return "secondary";
    case "Fair":
      return "outline";
    case "Poor":
      return "destructive";
    default:
      return "secondary";
  }
}