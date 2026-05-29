using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Corevix.Core;

namespace Corevix.Application.Security
{
    public record AuthResponseDto(string AccessToken, string RefreshToken, string Email, string Role, Guid? CustomerId);

    public record LoginCommand(string Email, string Password) : IRequest<AuthResponseDto>;

    public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponseDto>
    {
        private readonly IApplicationDbContext _dbContext;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IJwtTokenService _jwtTokenService;

        public LoginCommandHandler(IApplicationDbContext dbContext, IPasswordHasher passwordHasher, IJwtTokenService jwtTokenService)
        {
            _dbContext = dbContext;
            _passwordHasher = passwordHasher;
            _jwtTokenService = jwtTokenService;
        }

        public async Task<AuthResponseDto> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            var user = await _dbContext.Users
                .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower() && u.IsActive, cancellationToken);

            if (user == null)
            {
                throw new UnauthorizedAccessException("Invalid email or password.");
            }

            bool isValid = _passwordHasher.VerifyPassword(request.Password, user.PasswordHash, user.PasswordSalt);
            if (!isValid)
            {
                throw new UnauthorizedAccessException("Invalid email or password.");
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
