import Payment from "../models/Payment.js";

/**
 * Generates a unique receipt number in the format: RCP-YYYY-00001
 * @returns {Promise<string>} The generated receipt number
 */
export const generateReceiptNo = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const yearPrefix = `RCP-${currentYear}`;

  // Find the last payment with this year's prefix
  const lastPayment = await Payment.findOne({
    receiptNumber: new RegExp(`^${yearPrefix}`),
  })
    .sort({ receiptNumber: -1 })
    .exec();

  let nextNumber = 1;
  if (lastPayment && lastPayment.receiptNumber) {
    const lastNumberStr = lastPayment.receiptNumber.split("-").pop();
    if (lastNumberStr) {
      nextNumber = parseInt(lastNumberStr, 10) + 1;
    }
  }

  // Format the number to be 5 digits with leading zeros
  const formattedNumber = nextNumber.toString().padStart(5, "0");
  return `${yearPrefix}-${formattedNumber}`;
};
