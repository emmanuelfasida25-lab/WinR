export const ACTIVATION_FEE = 5500;
export const REFERRAL_BONUS = 500;
export const MIN_WITHDRAWAL = 1000;
export const PAYMENT_INFO = {
  bankName: process.env.WINR_BANK_NAME ?? "Opay",
  accountNumber: process.env.WINR_ACCOUNT_NUMBER ?? "8012345678",
  accountName: process.env.WINR_ACCOUNT_NAME ?? "WINR Platform",
};
export const PAYMENT_INSTRUCTIONS = `Transfer exactly ₦${ACTIVATION_FEE.toLocaleString("en-NG")} to the bank details below. You MUST use your reference code as the transfer narration so we can match your payment to your account. After paying, click "I have paid" and an admin will confirm within 24 hours.`;
