// src/modules/blog/blog.route.ts
import { Router } from 'express';
import { publicBlogController } from './blog.controller';
import { interactionRateLimiter } from '../../middlewares/rateLimiter';

const router = Router();

router.get('/categories', publicBlogController.getCategories);
router.get('/', publicBlogController.getArticles);
router.post('/:articleId/comments', interactionRateLimiter, publicBlogController.postComment);
router.get('/:slug', publicBlogController.getArticleDetail);

export default router;