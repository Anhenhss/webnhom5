using System;
using System.Collections.Generic;

namespace webnhom5.Models;

public partial class Article
{
    public int Id { get; set; }

    public string Title { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string? Summary { get; set; }

    public string? Content { get; set; }

    public string? Thumbnail { get; set; }

    public int CategoryId { get; set; }

    public bool? IsPublished { get; set; }

    public DateTime? PublishedAt { get; set; }

    public virtual ArticleCategory Category { get; set; } = null!;
}
