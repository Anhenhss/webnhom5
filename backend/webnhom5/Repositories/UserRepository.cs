using Microsoft.EntityFrameworkCore;
using webnhom5.Models;
using webnhom5.Data;

namespace webnhom5.Repositories;

public interface IUserRepository {
    Task<User?> GetByEmailAsync(string email);
    Task AddAsync(User user);
    Task UpdateAsync(User user);
    Task SaveChangesAsync();
}

public class UserRepository : IUserRepository {
    private readonly FashionDbContext _db;
    public UserRepository(FashionDbContext db) => _db = db;
    public async Task<User?> GetByEmailAsync(string email) => await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
    public async Task AddAsync(User user) => await _db.Users.AddAsync(user);
    public async Task UpdateAsync(User user) { _db.Users.Update(user); await Task.CompletedTask; }
    public async Task SaveChangesAsync() => await _db.SaveChangesAsync();
}