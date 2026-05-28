using MongoDB.Driver;
using Corevix.Core;

namespace Corevix.Persistence
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(string connectionString, string databaseName)
        {
            var client = new MongoClient(connectionString);
            _database = client.GetDatabase(databaseName);
        }

        public IMongoCollection<AuditLog> AuditLogs => 
            _database.GetCollection<AuditLog>("audit_logs");
    }
}
