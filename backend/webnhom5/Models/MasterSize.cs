using System;
using System.Collections.Generic;

namespace webnhom5.Models;

public partial class MasterSize
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public virtual ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();
}
