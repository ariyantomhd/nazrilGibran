// src/components/blog/types.ts
export interface BlogArticle {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  badgeColor: string;
  tag?: 'Trending' | 'New' | 'Exclusive' | 'Featured';
  image: string;
  date: string;
  readTime: string;
  views: string;
  author: {
    name: string;
    avatar: string;
  };
}

export const BLOG_CATEGORIES = [
  'All',
  'SaaS Architecture',
  'Frontend',
  'Database',
  'Business & Tips',
];

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 1,
    title: 'Building Scalable Micro-SaaS Architecture with Next.js 16 App Router',
    slug: 'membangun-arsitektur-micro-saas-nextjs-16',
    excerpt:
      'Learn how to structure multi-tenant routing, caching layers, and edge authentication for high-growth SaaS products.',
    category: 'SaaS Architecture',
    badgeColor: 'bg-rose-600 text-white',
    tag: 'Featured',
    image:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop',
    date: '2h ago',
    readTime: '5 min read',
    views: '14.2k views',
    author: {
      name: 'Muhammad Ariyanto',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop',
    },
  },
  {
    id: 2,
    title: 'Mastering React Server Components & Streaming SSR Patterns',
    slug: 'mastering-react-server-components',
    excerpt:
      'React Server Components represent a paradigm shift in how we eliminate client bundle bloat and speed up initial loads.',
    category: 'Frontend',
    badgeColor: 'bg-cyan-500 text-slate-950',
    tag: 'Trending',
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=900&auto=format&fit=crop',
    date: '4h ago',
    readTime: '4 min read',
    views: '11.8k views',
    author: {
      name: 'Sarah Ananda',
      avatar:
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=100&auto=format&fit=crop',
    },
  },
  {
    id: 3,
    title: 'The Ultimate Guide to PostgreSQL & Supabase Query Performance',
    slug: 'postgresql-performance-guide',
    excerpt:
      'Indexing strategies, connection pooling, and Row-Level Security tuning when user traffic scales exponentially.',
    category: 'Database',
    badgeColor: 'bg-indigo-600 text-white',
    tag: 'Exclusive',
    image:
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=900&auto=format&fit=crop',
    date: '6h ago',
    readTime: '6 min read',
    views: '9.4k views',
    author: {
      name: 'Dev Lead',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop',
    },
  },
  {
    id: 4,
    title: 'Optimizing Web3 DApp State & Realtime Wallet Sync in Production',
    slug: 'optimasi-performa-web3-dapp',
    excerpt:
      'Practical patterns for caching RPC calls and keeping on-chain dashboards responsive under heavy load.',
    category: 'SaaS Architecture',
    badgeColor: 'bg-slate-900 text-white',
    tag: 'Trending',
    image:
      'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=800&auto=format&fit=crop',
    date: '1d ago',
    readTime: '6 min read',
    views: '8.1k views',
    author: {
      name: 'Muhammad Ariyanto',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop',
    },
  },
  {
    id: 5,
    title: 'Indie Developer Monetization Playbook: Licensing & Global Pricing',
    slug: 'panduan-monetisasi-digital-produk',
    excerpt:
      'How to structure Personal vs Extended commercial licenses and boost international checkout conversions.',
    category: 'Business & Tips',
    badgeColor: 'bg-emerald-600 text-white',
    tag: 'New',
    image:
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
    date: '2d ago',
    readTime: '5 min read',
    views: '6.7k views',
    author: {
      name: 'Sarah Ananda',
      avatar:
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=100&auto=format&fit=crop',
    },
  },
  {
    id: 6,
    title: 'Designing High-Converting UI Kits with Tailwind CSS v4',
    slug: 'designing-ui-kits-tailwind-v4',
    excerpt:
      'Modern color tokens, accessible contrast ratios, and component composition for clean developer dashboards.',
    category: 'Frontend',
    badgeColor: 'bg-purple-600 text-white',
    tag: 'New',
    image:
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop',
    date: '3d ago',
    readTime: '4 min read',
    views: '5.9k views',
    author: {
      name: 'Dev Lead',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop',
    },
  },
];