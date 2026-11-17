// src/modules/blog/blog.repository.ts
import { supabaseAdmin } from '../../config/supabase';
import type {
  BlogArticleFilter,
  BlogArticleRecord,
  BlogCategoryRecord,
  BlogCommentRecord,
  CreateCommentInput,
} from '../../types/blog';

function parseJsonArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return raw
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
    }
  }
  return [];
}

async function enrichArticles(rows: Record<string, unknown>[]): Promise<BlogArticleRecord[]> {
  const { data: cats } = await supabaseAdmin
    .from('blog_categories')
    .select('id, name, slug, badge_color');

  const catMap: Record<number, { name: string; badge_color: string }> = {};
  if (Array.isArray(cats)) {
    for (const c of cats as Array<{ id: number; name: string; badge_color?: string }>) {
      catMap[c.id] = {
        name: c.name,
        badge_color: c.badge_color || 'bg-slate-900 text-white',
      };
    }
  }

  return rows.map((row) => {
    const id = Number(row.id);
    const catId = row.category_id ? Number(row.category_id) : null;
    const matchedCat = catId ? catMap[catId] : undefined;
    const categoryName = matchedCat?.name || 'SaaS Architecture';

    return {
      id,
      title: String(row.title || ''),
      slug: String(row.slug || ''),
      excerpt: String(row.excerpt || ''),
      content: row.content ? String(row.content) : null,
      status: String(row.status || 'PUBLISHED'),
      category_id: catId,
      category: categoryName,
      category_name: categoryName,
      badge_color: row.badge_color
        ? String(row.badge_color)
        : matchedCat?.badge_color || 'bg-slate-900 text-white',
      tag: row.tag ? String(row.tag) : 'New',
      cover_image: row.cover_image ? String(row.cover_image) : '',
      read_time: String(row.read_time || '5 min read'),
      views_count: Number(row.views_count ?? 0),
      likes_count: Number(row.likes_count ?? 0),
      shares_count: Number(row.shares_count ?? 0),
      author_name: String(row.author_name || 'Muhammad Ariyanto'),
      author_avatar: row.author_avatar ? String(row.author_avatar) : '',
      author_role: String(row.author_role || 'Lead Architect'),
      lead_location: String(row.lead_location || `${categoryName} —`),
      paragraphs: parseJsonArray(row.paragraphs),
      subheading: String(row.subheading || 'Key Architecture & Implementation Notes'),
      sub_paragraph: String(row.sub_paragraph || ''),
      bullet_points: parseJsonArray(row.bullet_points),
      published_at: row.published_at ? String(row.published_at) : null,
      created_at: String(row.created_at || new Date().toISOString()),
    };
  });
}

export const publicBlogRepo = {
  async listCategories(): Promise<BlogCategoryRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('blog_categories')
      .select('id, name, slug, badge_color')
      .order('name', { ascending: true });

    if (error) {
      console.error('[blog.repository.listCategories] DB Error:', error.message);
      throw new Error('Failed to load blog categories');
    }
    return (data || []) as BlogCategoryRecord[];
  },

  async listPublishedArticles(filters: BlogArticleFilter): Promise<BlogArticleRecord[]> {
    let resolvedCategoryId: number | null = null;

    if (filters.category_id && filters.category_id !== 'ALL') {
      resolvedCategoryId = Number(filters.category_id);
    } else if (filters.category && filters.category.toUpperCase() !== 'ALL') {
      const { data: cat } = await supabaseAdmin
        .from('blog_categories')
        .select('id')
        .ilike('name', filters.category.trim())
        .maybeSingle();

      if (!cat) return [];
      resolvedCategoryId = Number(cat.id);
    }

    let query = supabaseAdmin
      .from('blog_articles')
      .select('*')
      .eq('status', 'PUBLISHED')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (resolvedCategoryId !== null && !Number.isNaN(resolvedCategoryId)) {
      query = query.eq('category_id', resolvedCategoryId);
    }

    if (filters.search?.trim()) {
      const safe = filters.search.replace(/[,().%]/g, '').trim().slice(0, 100);
      if (safe) {
        query = query.or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%`);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.error('[blog.repository.listPublishedArticles] DB Error:', error.message);
      throw new Error('Failed to load blog articles');
    }

    return enrichArticles((data || []) as Record<string, unknown>[]);
  },

  async getArticleBySlug(slugOrId: string): Promise<BlogArticleRecord | null> {
    const cleanParam = slugOrId.trim().slice(0, 160);
    const isId = /^\d+$/.test(cleanParam);
    let query = supabaseAdmin
      .from('blog_articles')
      .select('*')
      .eq('status', 'PUBLISHED');

    query = isId ? query.eq('id', Number(cleanParam)) : query.eq('slug', cleanParam);

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;

    const [enriched] = await enrichArticles([data as Record<string, unknown>]);
    if (!enriched) return null;

    const { data: comments } = await supabaseAdmin
      .from('blog_comments')
      .select('id, article_id, user_id, author_name, content, created_at')
      .eq('article_id', enriched.id)
      .order('created_at', { ascending: false })
      .limit(100);

    return {
      ...enriched,
      comments: (comments || []) as BlogCommentRecord[],
    };
  },

  async incrementViews(articleId: number, currentViews: number): Promise<void> {
    await supabaseAdmin
      .from('blog_articles')
      .update({ views_count: currentViews + 1 })
      .eq('id', articleId)
      .eq('status', 'PUBLISHED');
  },

  async createComment(payload: CreateCommentInput): Promise<BlogCommentRecord> {
    // Pastikan artikel target benar-benar ada & berstatus PUBLISHED
    const { data: publishedArticle, error: checkError } = await supabaseAdmin
      .from('blog_articles')
      .select('id')
      .eq('id', payload.article_id)
      .eq('status', 'PUBLISHED')
      .maybeSingle();

    if (checkError || !publishedArticle) {
      const notFoundErr = new Error('Target article not found or unpublished') as Error & {
        statusCode?: number;
      };
      notFoundErr.statusCode = 404;
      throw notFoundErr;
    }

    const { data, error } = await supabaseAdmin
      .from('blog_comments')
      .insert({
        article_id: payload.article_id,
        author_name: payload.author_name,
        content: payload.content,
        user_id: payload.user_id ?? null,
      })
      .select('id, article_id, user_id, author_name, content, created_at')
      .single();

    if (error || !data) {
      console.error('[blog.repository.createComment] DB Error:', error?.message);
      throw new Error('Failed to submit comment');
    }

    return data as BlogCommentRecord;
  },
};