namespace Corevix.Application
{
    public interface IIdempotentCommand
    {
        string IdempotencyKey { get; }
    }
}
