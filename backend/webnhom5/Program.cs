using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using webnhom5.Data;
using webnhom5.Repositories; 
using webnhom5.Services;     

var builder = WebApplication.CreateBuilder(args);
// 1. CẤU HÌNH DATABASE & CORE
builder.Services.AddDbContext<FashionDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Cấu hình AutoMapper
builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());
// 2. DEPENDENCY INJECTION (ĐĂNG KÝ DỊCH VỤ)
// A. Repositories
// Đăng ký Generic Repository (Dùng chung cho tất cả bảng)
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));

// B. Services 
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IMarketingService, MarketingService>();

// 3. CẤU HÌNH AUTHENTICATION (JWT)
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
    };
});
// 4. CẤU HÌNH SWAGGER & API
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Cấu hình Swagger để hiện nút "Authorize" (Nhập Token)
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Fashion Shop API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập token theo định dạng: Bearer {your_token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// Thêm CORS (Cho phép Frontend gọi API)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        b => b.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

var app = builder.Build();

// 5. CẤU HÌNH PIPELINE (MIDDLEWARE)

// Môi trường Dev
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

//Cho phép truy cập ảnh trong thư mục wwwroot
app.UseStaticFiles(); 

app.UseCors("AllowAll");

// Thứ tự Auth
app.UseAuthentication(); // 1. Xác thực (Bạn là ai?)
app.UseAuthorization();  // 2. Phân quyền (Bạn được làm gì?)

app.MapControllers();

app.Run();