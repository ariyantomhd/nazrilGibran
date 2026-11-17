// src/modules/blog/blog.controller.ts
import { Request, Response, NextFunction } from 'express';
import { blogService } from './blog.service';

function sanitizeText(input: unknown, maxLength: number): string {
  return String(input ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export const publicBlogController = {
  async getCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await blogService.getCategories();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getArticles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const category_id =
        typeof req.query.category_id === 'string' ? req.query.category_id : undefined;
      const category =
        typeof req.query.category === 'string' ? req.query.category : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;

      const data = await blogService.getArticles({
        category_id,
        category,
        search,
      });
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getArticleDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = String(req.params.slug || '');
      const article = await blogService.getArticleDetail(slug);
      if (!article) {
        res.status(404).json({ success: false, message: 'Article not found' });
        return;
      }
      res.status(200).json({ success: true, data: article });
    } catch (err) {
      next(err);
    }
  },

  async postComment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const articleId = Number(req.params.articleId);
      if (!Number.isInteger(articleId) || articleId <= 0) {
        res.status(400).json({ success: false, message: 'Invalid article ID' });
        return;
      }

      const cleanName = sanitizeText(req.body?.author_name || 'Guest Reader', 60);
      const cleanContent = sanitizeText(req.body?.content, 1000);

      if (cleanContent.length < 2) {
        res.status(400).json({
          success: false,
          message: 'Comment must be at least 2 characters long',
        });
        return;
      }

      const created = await blogService.addComment(articleId, {
        author_name: cleanName || 'Guest Reader',
        content: cleanContent,
      });

      res.status(201).json({ success: true, data: created });
    } catch (err) {
      next(err);
    }
  },
};