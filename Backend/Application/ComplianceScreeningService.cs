using System;
using System.Threading.Tasks;

namespace Corevix.Application
{
    public record ComplianceScreeningResult(
        bool IsMatch,
        string MatchType,
        string MatchedName,
        decimal ConfidenceScore);

    /// <summary>
    /// Screens customer names against sanctions and PEP (Politically Exposed Persons) lists.
    /// </summary>
    public interface IComplianceScreeningService
    {
        Task<ComplianceScreeningResult> ScreenCustomerAsync(string firstName, string lastName);
    }
}
