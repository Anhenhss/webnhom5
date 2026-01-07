using System.ComponentModel.DataAnnotations.Schema;

namespace webnhom5.Models;

public partial class User
{
    [NotMapped]
    public string? RefreshToken { get; set; }

    [NotMapped]
    public DateTime? RefreshTokenExpiryTime { get; set; }
}