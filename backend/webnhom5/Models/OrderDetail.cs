using System;
using System.Collections.Generic;

namespace webnhom5.Models;

public partial class OrderDetail
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public int ProductVariantId { get; set; }

    public string SnapshotProductName { get; set; } = null!;

    public string SnapshotSku { get; set; } = null!;

    public string? SnapshotThumbnail { get; set; }

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public virtual Order Order { get; set; } = null!;

    public virtual ProductVariant ProductVariant { get; set; } = null!;
}
