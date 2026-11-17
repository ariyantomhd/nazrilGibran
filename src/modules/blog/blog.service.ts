// src/modules/blog/blog.service.ts
import { publicBlogRepo } from './blog.repository';
import type {
  BlogArticleFilter,
  BlogArticleRecord,
  BlogCommentRecord,
} from '../../types/blog';

export class BlogService {
  async getCategories() {
    return publicBlogRepo.listCategories();
  }

  async getArticles(filter: BlogArticleFilter) {
    const rows = await publicBlogRepo.listPublishedArticles({
      status: 'PUBLISHED',
      category_id: filter.category_id,
      category: filter.category,
      search: filter.search,
    });

    return rows.map((row) => this.formatArticlePayload(row));
  }

  async getArticleDetail(slugOrId: string) {
    const article = await publicBlogRepo.getArticleBySlug(slugOrId);
    if (!article) return null;

    // Increment views secara non-blocking
    publicBlogRepo.incrementViews(article.id, article.views_count).catch(() => {});

    return this.formatArticlePayload(article);
  }

  async addComment(
    articleId: number,
    payload: { author_name: string; content: string; user_id?: string | null }
  ) {
    const saved = await publicBlogRepo.createComment({
      article_id: articleId,
      author_name: payload.author_name,
      content: payload.content,
      user_id: payload.user_id ?? null,
    });

    return {
      id: saved.id,
      article_id: saved.article_id,
      author_name: saved.author_name,
      author: saved.author_name,
      content: saved.content,
      text: saved.content,
      time: 'Just now',
      created_at: saved.created_at,
    };
  }

  private formatArticlePayload(row: BlogArticleRecord) {
    const paragraphs =
      row.paragraphs.length > 0
        ? row.paragraphs
        : row.content
          ? row.content
              .split(/\n{2,}/)
              .map((p) => p.trim())
              .filter(Boolean)
          : row.excerpt
            ? [row.excerpt]
            : [];

    const comments = Array.isArray(row.comments)
      ? [...row.comments]
          .sort(
            (a: BlogCommentRecord, b: BlogCommentRecord) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          .map((c) => ({
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
      ...row,
      image: row.cover_image,
      badgeColor: row.badge_color,
      readTime: row.read_time,
      views:
        viewsCount >= 1000
          ? `${(viewsCount / 1000).toFixed(1)}k views`
          : `${viewsCount} views`,
      likes: row.likes_count,
      shares: row.shares_count,
      author: {
        name: row.author_name,
        avatar: row.author_avatar,
        role: row.author_role,
      },
      leadLocation: row.lead_location,
      paragraphs,
      subParagraph: row.sub_paragraph,
      bulletPoints: row.bullet_points,
      comments,
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