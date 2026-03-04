using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace webnhom5.Models;

public partial class Category
{

    [Key]
    public int Id { get; set; }
    
    [Required]
    public string Name { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public int? ParentId { get; set; }

    public bool? IsActive { get; set; }

    public virtual ICollection<Category> InverseParent { get; set; } = new List<Category>();

    [ForeignKey("ParentId")]
    public virtual Category? Parent { get; set; }

    public virtual ICollection<Product> Products { get; set; } = new List<Product>();
    public virtual ICollection<Category> SubCategories { get; set; } = new List<Category>();
  
}

