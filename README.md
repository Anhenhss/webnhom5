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
- Dotnet run xong kiểm tra cổng là bao nhiêu xem có trùng với cổng ở api.js không. Nếu không đúng Đổi lại port này theo đúng cổng mà backend ASP.NET Core đang chạy (vd: 5001, 7123...)
const BASE_URL = 'https://localhost:5195/api'; 
- Muốn xem web thì nên Open with Live Server hoặc theo đường link cổng ví dụ https://localhost:5500/index.html  
lưu ý dotnet run phần backend thì fontend mới chạy


1. Xem file appsettings.json Server = ... đúng Server của máy mình chưa
2. Mở file FashionEcommerecDB.sql chạy 4 câu lệnh cuối
EXEC sp_MSforeachtable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'
EXEC sp_MSforeachtable 'DELETE FROM ?'
EXEC sp_MSforeachtable 'ALTER TABLE ? CHECK CONSTRAINT ALL'

EXEC sp_MSforeachtable 'DBCC CHECKIDENT (''?'', RESEED, 0)'
3. Vào \wwwroot\images\products xóa hết ảnh trong đó
4. Chạy donet run