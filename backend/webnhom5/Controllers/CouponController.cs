using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using webnhom5.DTOs;
using webnhom5.Services;
using webnhom5.Repositories;
using webnhom5.Models;


namespace webnhom5.Controllers;

[Authorize(Roles = "Admin")]

[ApiController]
[Route("api/admin/coupons")]
public class AdminCouponController : ControllerBase
{
    private readonly IRepository<Coupon> _repo;

    public AdminCouponController(IRepository<Coupon> repo)
    {
        _repo = repo;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate(int promotionId, int userId)
    {
        var code = Guid.NewGuid().ToString("N")[..8].ToUpper();

        var coupon = new Coupon
        {
            Code = code,
            PromotionId = promotionId,
            UserId = userId,
            IsUsed = false
        };

        await _repo.AddAsync(coupon);
       await _repo.SaveChangesAsync();


        return Ok(coupon);
    }
}
