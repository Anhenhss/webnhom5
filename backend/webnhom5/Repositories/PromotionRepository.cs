using Microsoft.EntityFrameworkCore;
using webnhom5.Data;
using webnhom5.Models;

namespace webnhom5.Repositories
{
    public class PromotionRepository : GenericRepository<Promotion>, IPromotionRepository
    {
        public PromotionRepository(FashionDbContext context) : base(context)
        {
        }

        public override async Task<IEnumerable<Promotion>> GetAllAsync()
        {
            return await _context.Promotions
                .Include(p => p.PromotionConditions)
                .ToListAsync();
        }
    }
}
