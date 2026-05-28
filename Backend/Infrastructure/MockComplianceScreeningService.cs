using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Corevix.Application;

namespace Corevix.Infrastructure
{
    /// <summary>
    /// Mock implementation of AML/PEP compliance screening.
    /// In production, this would call an external API (e.g., ComplyAdvantage, Dow Jones, World-Check).
    /// Uses fuzzy name matching against a hardcoded sanctions/PEP list for demo purposes.
    /// </summary>
    public class MockComplianceScreeningService : IComplianceScreeningService
    {
        private static readonly List<(string Name, string Type)> WatchList = new()
        {
            ("Juan Dela Cruz Sanctions", "SANCTIONS"),
            ("Maria Santos Blacklist", "SANCTIONS"),
            ("Pedro Marcos", "PEP"),
            ("Imelda Romualdez", "PEP"),
            ("Ricardo Napoles", "SANCTIONS"),
            ("Janet Lim Napoles", "SANCTIONS"),
            ("Bong Revilla", "PEP"),
            ("Gloria Arroyo", "PEP")
        };

        public Task<ComplianceScreeningResult> ScreenCustomerAsync(string firstName, string lastName)
        {
            var fullName = $"{firstName} {lastName}".Trim();

            foreach (var (watchlistName, type) in WatchList)
            {
                var similarity = CalculateSimilarity(fullName.ToLowerInvariant(), watchlistName.ToLowerInvariant());

                if (similarity >= 0.5m)
                {
                    return Task.FromResult(new ComplianceScreeningResult(
                        IsMatch: true,
                        MatchType: type,
                        MatchedName: watchlistName,
                        ConfidenceScore: similarity
                    ));
                }
            }

            return Task.FromResult(new ComplianceScreeningResult(
                IsMatch: false,
                MatchType: "NONE",
                MatchedName: string.Empty,
                ConfidenceScore: 0m
            ));
        }

        /// <summary>
        /// Calculates similarity between two strings using a combination of
        /// substring matching and Levenshtein-based scoring.
        /// Returns a value between 0.0 and 1.0.
        /// </summary>
        private static decimal CalculateSimilarity(string input, string watchlistEntry)
        {
            // Direct containment check
            if (watchlistEntry.Contains(input) || input.Contains(watchlistEntry))
            {
                return 1.0m;
            }

            // Token-based overlap: check how many words from the input appear in the watchlist name
            var inputTokens = input.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var watchlistTokens = watchlistEntry.Split(' ', StringSplitOptions.RemoveEmptyEntries);

            if (inputTokens.Length == 0 || watchlistTokens.Length == 0)
                return 0m;

            int matchedTokens = 0;
            foreach (var inputToken in inputTokens)
            {
                foreach (var watchToken in watchlistTokens)
                {
                    if (watchToken.Contains(inputToken) || inputToken.Contains(watchToken))
                    {
                        matchedTokens++;
                        break;
                    }

                    // Levenshtein distance for fuzzy matching
                    int distance = LevenshteinDistance(inputToken, watchToken);
                    int maxLen = Math.Max(inputToken.Length, watchToken.Length);
                    if (maxLen > 0 && (1.0 - (double)distance / maxLen) >= 0.7)
                    {
                        matchedTokens++;
                        break;
                    }
                }
            }

            return (decimal)matchedTokens / Math.Max(inputTokens.Length, watchlistTokens.Length);
        }

        private static int LevenshteinDistance(string s, string t)
        {
            int n = s.Length;
            int m = t.Length;
            var d = new int[n + 1, m + 1];

            for (int i = 0; i <= n; i++) d[i, 0] = i;
            for (int j = 0; j <= m; j++) d[0, j] = j;

            for (int i = 1; i <= n; i++)
            {
                for (int j = 1; j <= m; j++)
                {
                    int cost = s[i - 1] == t[j - 1] ? 0 : 1;
                    d[i, j] = Math.Min(
                        Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                        d[i - 1, j - 1] + cost);
                }
            }

            return d[n, m];
        }
    }
}
