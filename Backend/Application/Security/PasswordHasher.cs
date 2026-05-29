using System;
using System.Security.Cryptography;

namespace Corevix.Application.Security
{
    public interface IPasswordHasher
    {
        (string Hash, string Salt) HashPassword(string password);
        bool VerifyPassword(string password, string hash, string salt);
    }

    public class PasswordHasher : IPasswordHasher
    {
        private const int SaltSize = 32; 
        private const int KeySize = 64;  
        private const int Iterations = 350000;
        private static readonly HashAlgorithmName HashAlgorithm = HashAlgorithmName.SHA512;

        public (string Hash, string Salt) HashPassword(string password)
        {
            byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
            byte[] hash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                Iterations,
                HashAlgorithm,
                KeySize
            );
            return (Convert.ToHexString(hash), Convert.ToHexString(salt));
        }

        public bool VerifyPassword(string password, string hash, string salt)
        {
            byte[] saltBytes = Convert.FromHexString(salt);
            byte[] hashBytes = Convert.FromHexString(hash);
            byte[] testHash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                saltBytes,
                Iterations,
                HashAlgorithm,
                KeySize
            );
            return CryptographicOperations.FixedTimeEquals(hashBytes, testHash);
        }
    }
}
