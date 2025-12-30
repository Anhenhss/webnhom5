using System;
using System.Collections.Generic;

namespace webnhom5.Models;

public partial class UserAddress
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string ContactName { get; set; } = null!;

    public string ContactPhone { get; set; } = null!;

    public string AddressLine { get; set; } = null!;

    public string Province { get; set; } = null!;

    public string District { get; set; } = null!;

    public string Ward { get; set; } = null!;

    public bool? IsDefault { get; set; }

    public virtual User User { get; set; } = null!;
}
