// src/modules/blog/blog.service.ts
import {
  blogRepository,
  type BlogArticleFilter,
  type CreateArticleInput,
} from './blog.repository';

export class BlogService {
  async getCategories() {
    return blogRepository.findAllCategories();
  }

  async getArticles(filter: BlogArticleFilter) {
    const rows = await blogRepository.findAllArticles({
      status: filter.status || 'PUBLISHED',
      category_id: filter.category_id,
      category: filter.category,
      search: filter.search,
    });

    return rows.map((row: any) => this.formatArticlePayload(row));
  }

  async getArticleDetail(slugOrId: string) {
    const article = await blogRepository.findArticleBySlugOrId(slugOrId);
    if (!article) return null;

    // Increment views secara non-blocking
    blogRepository
      .incrementCounter(article.id, 'views_count', article.views_count ?? 0)
      .catch(() => {});

    return this.formatArticlePayload(article);
  }

  async createArticle(payload: CreateArticleInput) {
    if (!payload.title?.trim() || !payload.slug?.trim() || !payload.cover_image?.trim()) {
      const err = new Error('title, slug, and cover_image are required') as Error & {
        statusCode?: number;
      };
      err.statusCode = 400;
      throw err;
    }

    const created = await blogRepository.createArticle(payload);
    return this.formatArticlePayload(created);
  }

  async engageArticle(slugOrId: string, action: 'like' | 'share') {
    const article = await blogRepository.findArticleBySlugOrId(slugOrId);
    if (!article) return null;

    const column = action === 'like' ? 'likes_count' : 'shares_count';
    const current =
      action === 'like' ? article.likes_count ?? 0 : article.shares_count ?? 0;

    return blogRepository.incrementCounter(article.id, column, current);
  }

  async addComment(
    articleId: number | string,
    payload: { author_name?: string; content?: string; user_id?: string | null }
  ) {
    const cleanContent = payload.content?.trim();
    if (!cleanContent) {
      const err = new Error('Comment content is required') as Error & {
        statusCode?: number;
      };
      err.statusCode = 400;
      throw err;
    }

    const saved = await blogRepository.createComment({
      article_id: articleId,
      author_name: payload.author_name?.trim() || 'Guest Reader',
      content: cleanContent,
      user_id: payload.user_id ?? null,
    });

    return {
      id: saved.id,
      author_name: saved.author_name,
      author: saved.author_name,
      content: saved.content,
      text: saved.content,
      time: 'Just now',
      created_at: saved.created_at,
    };
  }

  private formatArticlePayload(row: any) {
    const categoryObj = Array.isArray(row.category)
      ? row.category[0] ?? null
      : row.category ?? null;

    const categoryName = categoryObj?.name || '';
    const badgeColor = row.badge_color || categoryObj?.badge_color || 'bg-slate-900 text-white';

    const paragraphs: string[] =
      Array.isArray(row.paragraphs) && row.paragraphs.length > 0
        ? row.paragraphs
        : row.content
          ? String(row.content)
              .split(/\n{2,}/)
              .map((p: string) => p.trim())
              .filter(Boolean)
          : row.excerpt
            ? [row.excerpt]
            : [];

    const bulletPoints: string[] = Array.isArray(row.bullet_points)
      ? row.bullet_points
      : [];

    const comments = Array.isArray(row.comments)
      ? [...row.comments]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .map((c: any) => ({
            id: c.id,
            author: c.author_name || 'Guest Reader',
            author_name: c.author_name || 'Guest Reader',
            text: c.content,
            content: c.content,
            time: this.formatRelativeTime(c.created_at),
            created_at: c.created_at,
          }))
      : [];

    const viewsCount = Number(row.views_count ?? 0);

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt || '',
      content: row.content || paragraphs.join('\n\n'),
      status: row.status,
      cover_image: row.cover_image,
      image: row.cover_image,
      category: categoryObj || categoryName,
      category_name: categoryName,
      badge_color: badgeColor,
      badgeColor,
      tag: row.tag || null,
      read_time: row.read_time || '',
      readTime: row.read_time || '',
      views_count: viewsCount,
      views:
        viewsCount >= 1000
          ? `${(viewsCount / 1000).toFixed(1)}k views`
          : `${viewsCount} views`,
      likes_count: Number(row.likes_count ?? 0),
      likes: Number(row.likes_count ?? 0),
      shares_count: Number(row.shares_count ?? 0),
      shares: Number(row.shares_count ?? 0),
      author_name: row.author_name || '',
      author_avatar: row.author_avatar || '',
      author_role: row.author_role || '',
      author: {
        name: row.author_name || '',
        avatar: row.author_avatar || '',
        role: row.author_role || '',
      },
      leadLocation: row.lead_location || '',
      paragraphs,
      subheading: row.subheading || '',
      subParagraph: row.sub_paragraph || '',
      bulletPoints,
      comments,
      published_at: row.published_at,
      created_at: row.created_at,
    };
  }

  private formatRelativeTime(dateStr?: string): string {
    if (!dateStr) return '';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    if (Number.isNaN(diffMs) || diffMs < 0) return 'Just now';
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}

export const blogService = new BlogService();