import { Request, Response } from 'express';
import { publicBlogRepo } from './blog.repository';

export const publicBlogController = {
  async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      const data = await publicBlogRepo.listCategories();
      res.status(200).json({ success: true, data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load categories';
      res.status(500).json({ success: false, message });
    }
  },

  async getArticles(req: Request, res: Response): Promise<void> {
    try {
      const category_id =
        typeof req.query.category_id === 'string' ? req.query.category_id : undefined;
      const category =
        typeof req.query.category === 'string' ? req.query.category : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const data = await publicBlogRepo.listPublishedArticles({
        category_id,
        category,
        search,
      });
      res.status(200).json({ success: true, data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load articles';
      res.status(500).json({ success: false, message });
    }
  },

  async getArticleDetail(req: Request, res: Response): Promise<void> {
    try {
      const slug = String(req.params.slug || '');
      const article = await publicBlogRepo.getArticleBySlug(slug);
      if (!article) {
        res.status(404).json({ success: false, message: 'Article not found' });
        return;
      }
      res.status(200).json({ success: true, data: article });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load article';
      res.status(500).json({ success: false, message });
    }
  },

  async postComment(req: Request, res: Response): Promise<void> {
    try {
      const articleId = Number(req.params.articleId);
      if (Number.isNaN(articleId) || articleId <= 0) {
        res.status(400).json({ success: false, message: 'Invalid article ID' });
        return;
      }

      const rawName = String(req.body?.author_name || 'Guest Reader')
        .replace(/<[^>]*>/g, '')
        .trim()
        .slice(0, 80);
      const rawContent = String(req.body?.content || '')
        .replace(/<[^>]*>/g, '')
        .trim()
        .slice(0, 1500);

      if (rawContent.length < 2) {
        res.status(400).json({ success: false, message: 'Comment is too short' });
        return;
      }

      const created = await publicBlogRepo.createComment(articleId, {
        author_name: rawName || 'Guest Reader',
        content: rawContent,
      });
      res.status(201).json({ success: true, data: created });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to post comment';
      res.status(400).json({ success: false, message });
    }
  },
};