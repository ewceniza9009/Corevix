using System;
using System.Security.Claims;
using Corevix.Core;

namespace Corevix.Application.Security
{
    public record TokenResponse(string AccessToken, string RefreshToken, DateTime RefreshTokenExpiry);

    public interface IJwtTokenService
    {
        TokenResponse GenerateTokens(User user);
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string token);
    }
}
