namespace Corevix.Core
{
    public static class GlAccount
    {
        public const string CashVault = "10000";             // Asset: Cash in Vault
        public const string CentralBankReserve = "11000";     // Asset: Central Bank Reserve (Interbank Settlement)
        public const string LoanReceivable = "12000";         // Asset: Customer Loan Receivables
        
        public const string SavingsDeposits = "20000";        // Liability: Customer Savings Accounts
        public const string CheckingDeposits = "21000";       // Liability: Customer Checking Accounts
        public const string TimeDeposits = "22000";           // Liability: Customer Time Deposit Accounts
        public const string BillerClearing = "23000";         // Liability: Biller Settlement Clearing
        
        public const string InterestExpense = "40000";        // Expense: Interest Paid to Customers
        
        public const string InterestIncome = "50000";         // Revenue: Interest Earned on Loans
        public const string FeeIncome = "51000";              // Revenue: Transaction Fees Received
    }
}
