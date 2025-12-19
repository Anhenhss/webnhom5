# webnhom5
dotnet add package Microsoft.EntityFrameworkCore --version 6.*
dotnet add package Microsoft.EntityFrameworkCore.SqlServer --version 6.*
dotnet add package Microsoft.EntityFrameworkCore.Tools --version 6.*
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore --version 6.*
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 6.*
dotnet add package AutoMapper --version 12.0.1
dotnet add package AutoMapper.Extensions.Microsoft.DependencyInjection --version 12.0.1


dotnet ef migrations add InitialCreate
dotnet ef database update
