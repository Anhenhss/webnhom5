using System;
using System.Collections.Generic;

namespace webnhom5.Models;

public partial class ProductImage
{
    public int Id { get; set; }

    public int ProductId { get; set; }

    public string ImageUrl { get; set; } = null!;

    public int? SortOrder { get; set; }

    public virtual Product Product { get; set; } = null!;
}
