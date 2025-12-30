using System;
using System.Collections.Generic;

namespace webnhom5.Models;

public partial class ArticleCategory
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public virtual ICollection<Article> Articles { get; set; } = new List<Article>();
}
