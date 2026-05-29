using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application.Security
{
    public record RefreshTokenCommand(string AccessToken, string RefreshToken) : IRequest<AuthResponseDto>;

    public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
    {
        private readonly IApplicationDbContext _dbContext;
        private readonly IJwtTokenService _jwtTokenService;

        public RefreshTokenCommandHandler(IApplicationDbContext dbContext, IJwtTokenService jwtTokenService)
        {
            _dbContext = dbContext;
            _jwtTokenService = jwtTokenService;
        }

        public async Task<AuthResponseDto> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
        {
            var principal = _jwtTokenService.GetPrincipalFromExpiredToken(request.AccessToken);
            if (principal == null)
            {
                throw new UnauthorizedAccessException("Invalid access token.");
            }

            var email = principal.Identity?.Name;
            if (string.IsNullOrEmpty(email))
            {
                throw new UnauthorizedAccessException("Invalid email claim.");
            }

            var user = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower() && u.IsActive, cancellationToken);

            if (user == null || user.RefreshToken != request.RefreshToken || user.RefreshTokenExpiryTime <= DateTime.UtcNow)
            {
                throw new UnauthorizedAccessException("Invalid refresh token or session expired.");
            }

            var tokens = _jwtTokenService.GenerateTokens(user);

            user.RefreshToken = tokens.RefreshToken;
            user.RefreshTokenExpiryTime = tokens.RefreshTokenExpiry;

            await _dbContext.SaveChangesAsync(cancellationToken);

            return new AuthResponseDto(
                tokens.AccessToken,
                tokens.RefreshToken,
                user.Email,
                user.Role.ToString(),
                user.CustomerId
            );
        }
    }
}
