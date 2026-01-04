using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.Models;
using webnhom5.Repositories;

namespace webnhom5.Controllers
{
    [Authorize(Roles = "Admin")]
    [ApiController]
    [Route("api/admin/promotions")]
    public class AdminPromotionController : ControllerBase
    {
        private readonly IRepository<Promotion> _repo;

        public AdminPromotionController(IRepository<Promotion> repo)
        {
            _repo = repo;
        }

        [HttpPost]
        public async Task<IActionResult> Create(Promotion promotion)
        {
            await _repo.AddAsync(promotion);
            await _repo.SaveChangesAsync();

            return Ok(promotion);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var promotions = await _repo.GetAllAsync();
            return Ok(promotions);
        }
    }
}
