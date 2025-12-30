# webnhom5
Sử dung .NET 8.0 SDK
Bước 1: Chạy SQL
Bước 2: Chạy các thư viện sau
dotnet add package Microsoft.EntityFrameworkCore --version 8.0.11
dotnet add package Microsoft.EntityFrameworkCore.SqlServer --version 8.0.11
dotnet add package Microsoft.EntityFrameworkCore.Tools --version 8.0.11
dotnet add package Microsoft.EntityFrameworkCore.Design --version 8.0.11
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer --version 8.0.11
dotnet add package BCrypt.Net-Next --version 4.0.3
dotnet add package AutoMapper --version 12.0.1
dotnet add package AutoMapper.Extensions.Microsoft.DependencyInjection --version 12.0.1
dotnet add package Google.Apis.Auth
Bước 3: Nếu Models đã có 20 class rồi thì không cần chạy câu lệnh này
dotnet ef dbcontext scaffold "Server=.\SQLEXPRESS;Database=FashionEcommerceDB;Trusted_Connection=True;TrustServerCertificate=True;" Microsoft.EntityFrameworkCore.SqlServer -o Models --context-dir Data -c FashionDbContext --namespace webnhom5.Models --context-namespace webnhom5.Data -f




Lưu ý: Lúc git clone về là webnhom5 sẽ bao gồm các mục backend, fontend,... nên khi làm cần:
- Lúc chay các thư viện dotnet, hay chạy chương trình cần cd backend -> cd webnhom5 rồi mới dotnet
- Lúc lưu cần cd .. rồi cd .. một lần nữa mới git add . -> git commit -m "ghi chi tiết rõ ràng" -> git push