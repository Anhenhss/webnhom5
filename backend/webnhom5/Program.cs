using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using webnhom5.Data;
using webnhom5.Models;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options => {
    // Cấu hình password 
    options.Password.RequireDigit = true; // Yêu cầu có số
    options.Password.RequireLowercase = true;
    options.Password.RequireNonAlphanumeric = false; // Không bắt buộc ký tự đặc biệt (@, #) cho dễ test
    options.Password.RequireUppercase = true;
    options.Password.RequiredLength = 6; // Độ dài tối thiểu 6
    
    // Cấu hình User
    options.User.RequireUniqueEmail = true; // Email không được trùng
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthentication(); 

app.UseAuthorization();

app.MapControllers();

app.Run();