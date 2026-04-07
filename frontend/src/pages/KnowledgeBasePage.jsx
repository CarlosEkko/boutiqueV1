import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { 
  Search, 
  ChevronRight,
  Book, 
  FileText, 
  HelpCircle, 
  Scale, 
  FileCheck, 
  Newspaper,
  Clock,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft,
  Tag,
  TrendingUp,
  Folder,
  Bell,
  Shield,
  Users,
  CreditCard,
  Settings,
  Lock,
  Wallet,
  BarChart
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { formatDate } from '../utils/formatters';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Icon mapping for categories - extended
const categoryIcons = {
  'blog': Newspaper,
  'faqs': HelpCircle,
  'learn': Book,
  'legal': Scale,
  'policies': FileCheck,
  'terms': FileText,
  'trading': TrendingUp,
  'seguranca': Shield,
  'security': Shield,
  'account': Users,
  'accounts': Users,
  'contas': Users,
  'api': Settings,
  'compliance': Scale,
  'deposits': Wallet,
  'depositos': Wallet,
  'fees': CreditCard,
  'taxas': CreditCard,
  'payments': CreditCard,
  'pagamentos': CreditCard,
  'withdrawals': Wallet,
  'levantamentos': Wallet,
  'kyc': Lock,
  'verificacao': Lock,
  'reports': BarChart,
  'relatorios': BarChart,
  'default': Folder
};

const KnowledgeBasePage = () => {
  const { categorySlug, articleSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [articles, setArticles] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [currentArticle, setCurrentArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [subcategories, setSubcategories] = useState([]);
  const [categoryArticles, setCategoryArticles] = useState({});
  const [recentArticles, setRecentArticles] = useState([]);
  const [popularArticles, setPopularArticles] = useState([]);

  // Fetch initial data for main page
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catResponse, recentResponse, popularResponse] = await Promise.all([
          axios.get(`${API_URL}/api/kb/categories`),
          axios.get(`${API_URL}/api/kb/recent?limit=5`),
          axios.get(`${API_URL}/api/kb/popular?limit=5`)
        ]);
        setCategories(catResponse.data || []);
        setRecentArticles(recentResponse.data || []);
        setPopularArticles(popularResponse.data || []);
      } catch (err) {
        console.error('Error fetching data', err);
      } finally {
        setLoading(false);
      }
    };

    if (!categorySlug && !articleSlug) {
      // Reset state when navigating back to main page
      setCurrentCategory(null);
      setCurrentArticle(null);
      setSubcategories([]);
      setCategoryArticles({});
      setRelatedArticles([]);
      setFeedbackGiven(false);
      fetchData();
    }
  }, [categorySlug, articleSlug]);

  // Handle category navigation
  useEffect(() => {
    if (categorySlug && !articleSlug) {
      fetchCategoryData(categorySlug);
    }
  }, [categorySlug, articleSlug]);

  // Handle article navigation
  useEffect(() => {
    if (articleSlug) {
      fetchArticle(articleSlug);
    }
  }, [articleSlug]);

  const fetchCategoryData = async (slug) => {
    setLoading(true);
    try {
      // Get all categories first
      const allCatsRes = await axios.get(`${API_URL}/api/kb/categories`);
      const allCats = allCatsRes.data || [];
      setCategories(allCats);

      // Get the category by slug
      const catResponse = await axios.get(`${API_URL}/api/kb/categories/${slug}`);
      const categoryData = catResponse.data.category || catResponse.data;
      const articlesData = catResponse.data.articles || [];
      
      setCurrentCategory(categoryData);
      setArticles(articlesData);
      setCurrentArticle(null);

      // Get subcategories of this category
      const subs = allCats.filter(c => c.parent_id === categoryData.id);
      setSubcategories(subs);

      // Fetch articles for each subcategory
      const subArticlesMap = {};
      await Promise.all(subs.map(async (sub) => {
        try {
          const artResponse = await axios.get(`${API_URL}/api/kb/articles?category=${sub.slug}&limit=10`);
          subArticlesMap[sub.id] = artResponse.data.articles || [];
        } catch (err) {
          subArticlesMap[sub.id] = [];
        }
      }));
      setCategoryArticles(subArticlesMap);
    } catch (err) {
      console.error('Error fetching category', err);
      navigate('/help');
    } finally {
      setLoading(false);
    }
  };

  const fetchArticle = async (slug) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/kb/articles/${slug}`);
      const articleData = response.data.article || response.data;
      setCurrentArticle(articleData);
      
      if (response.data.category) {
        setCurrentCategory(response.data.category);
      }
      
      if (response.data.related) {
        setRelatedArticles(response.data.related);
      }
    } catch (err) {
      console.error('Error fetching article', err);
      navigate('/help');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    try {
      const response = await axios.get(`${API_URL}/api/kb/articles?search=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response.data.articles || []);
      // If searching from article/category view, navigate to landing to show results
      if (articleSlug || categorySlug) {
        navigate('/help');
      }
    } catch (err) {
      console.error('Search error', err);
    }
  };

  const handleFeedback = async (helpful) => {
    if (feedbackGiven || !currentArticle) return;
    
    try {
      await axios.post(`${API_URL}/api/kb/articles/${currentArticle.id}/feedback?helpful=${helpful}`);
      setFeedbackGiven(true);
    } catch (err) {
      console.error('Feedback error', err);
    }
  };

  const getCategoryIcon = (slug, icon) => {
    // First check if category has a custom icon name
    if (icon && categoryIcons[icon.toLowerCase()]) {
      return categoryIcons[icon.toLowerCase()];
    }
    // Then check by slug
    const Icon = categoryIcons[slug?.toLowerCase()] || categoryIcons.default;
    return Icon;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-gold-400">Carregando...</div>
      </div>
    );
  }

  // Article View
  if (currentArticle) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <Header />
        
        <main className="pt-24 pb-20">
          <div className="max-w-7xl mx-auto px-4">
            {/* Breadcrumb & Search */}
            <div className="flex items-center justify-between mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link to="/help" className="text-gray-400 hover:text-gold-400">Centro de Ajuda</Link>
                {currentCategory && (
                  <>
                    <span className="text-gray-600">/</span>
                    <Link to={`/help/${currentCategory.slug}`} className="text-gray-400 hover:text-gold-400">
                      {currentCategory.name}
                    </Link>
                  </>
                )}
                <span className="text-gray-600">/</span>
                <span className="text-gold-400 truncate max-w-xs">{currentArticle.title}</span>
              </nav>
              <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar artigos"
                  className="w-64 bg-zinc-900 border-zinc-700 text-white"
                />
                <Button type="submit" size="icon" variant="ghost" className="text-gray-400">
                  <Search size={18} />
                </Button>
              </form>
            </div>

            <div className="flex gap-8">
              {/* Main Content */}
              <article className="flex-1 min-w-0 overflow-hidden">
                {/* Cover Image */}
                {currentArticle.cover_image && (
                  <div className="w-full h-64 mb-8 rounded-lg overflow-hidden">
                    <img 
                      src={currentArticle.cover_image.startsWith('http') 
                        ? currentArticle.cover_image 
                        : `${API_URL}${currentArticle.cover_image}`}
                      alt={currentArticle.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <h1 className="text-3xl md:text-4xl font-light text-white mb-8">
                  {currentArticle.title}
                </h1>

                {/* Content */}
                <div className="prose prose-invert max-w-none 
                  prose-headings:font-light prose-headings:text-white
                  prose-p:text-gray-300 prose-p:leading-relaxed
                  prose-a:text-gold-400 prose-a:no-underline hover:prose-a:underline
                  prose-strong:text-white
                  prose-li:text-gray-300
                  prose-img:rounded-lg
                  kb-article-content
                  overflow-hidden break-words
                ">
                  {currentArticle.content?.startsWith('<') ? (
                    <div 
                      className="kb-html-content break-words overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: currentArticle.content }} 
                    />
                  ) : (
                    <ReactMarkdown>{currentArticle.content}</ReactMarkdown>
                  )}
                </div>
              </article>

              {/* Sidebar */}
              <aside className="hidden lg:block w-80 flex-shrink-0">
                {/* Follow Button */}
                <div className="mb-6">
                  <Button className="bg-gold-500 hover:bg-gold-400 text-black">
                    <Bell size={16} className="mr-2" />
                    Seguir
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Subscreva para receber notificações deste artigo.
                  </p>
                </div>

                {/* Category Articles */}
                {currentCategory && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
                      <Folder size={16} className="text-gray-400" />
                      <span className="text-white font-medium">{currentCategory.name}</span>
                    </div>
                    <div className="space-y-2">
                      {relatedArticles.slice(0, 5).map(article => (
                        <Link
                          key={article.id}
                          to={`/help/article/${article.slug}`}
                          className={`flex items-start gap-2 text-sm py-1 hover:text-gold-400 transition-colors ${
                            article.slug === currentArticle.slug ? 'text-gold-400' : 'text-gray-400'
                          }`}
                        >
                          <FileText size={14} className="mt-0.5 flex-shrink-0" />
                          <span>{article.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {currentArticle.tags?.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
                      <Tag size={16} className="text-gray-400" />
                      <span className="text-white font-medium">Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentArticle.tags.map(tag => (
                        <Badge 
                          key={tag} 
                          className="bg-zinc-800 text-gray-300 border border-zinc-700 hover:border-gold-500/50"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Articles */}
                {relatedArticles.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
                      <Folder size={16} className="text-gray-400" />
                      <span className="text-white font-medium">Artigos Relacionados</span>
                    </div>
                    <div className="space-y-2">
                      {relatedArticles.slice(0, 5).map(article => (
                        <Link
                          key={article.id}
                          to={`/help/article/${article.slug}`}
                          className="flex items-start gap-2 text-sm text-gray-400 hover:text-gold-400 py-1"
                        >
                          <FileText size={14} className="mt-0.5 flex-shrink-0" />
                          <span>{article.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>

            {/* Back Button */}
            <div className="mt-8 pt-8 border-t border-zinc-800">
              <Button
                onClick={() => navigate(currentCategory ? `/help/${currentCategory.slug}` : '/help')}
                variant="outline"
                className="border-zinc-700 text-gray-400 hover:text-white"
              >
                <ArrowLeft size={16} className="mr-2" /> Voltar
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Category View - Shows all subcategories with articles
  if (currentCategory) {
    const Icon = getCategoryIcon(currentCategory.slug, currentCategory.icon);
    
    return (
      <div className="min-h-screen bg-zinc-950">
        <Header />
        
        <main className="pt-24 pb-20">
          <div className="max-w-7xl mx-auto px-4">
            {/* Breadcrumb & Search */}
            <div className="flex items-center justify-between mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link to="/help" className="text-gray-400 hover:text-gold-400">Centro de Ajuda</Link>
                <span className="text-gray-600">/</span>
                <span className="text-gold-400">{currentCategory.name}</span>
              </nav>
              <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar artigos"
                  className="w-64 bg-zinc-900 border-zinc-700 text-white"
                />
                <Button type="submit" size="icon" variant="ghost" className="text-gray-400">
                  <Search size={18} />
                </Button>
              </form>
            </div>

            {/* Category Header */}
            <div className="flex items-center gap-4 mb-8">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${currentCategory.color || '#D4AF37'}20` }}
              >
                <Icon size={28} style={{ color: currentCategory.color || '#D4AF37' }} />
              </div>
              <div>
                <h1 className="text-2xl font-light text-white">{currentCategory.name}</h1>
                {currentCategory.description && (
                  <p className="text-gray-400">{currentCategory.description}</p>
                )}
              </div>
            </div>

            {/* Grid of Subcategories as clickable cards (no button bar) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subcategories.length > 0 ? (
                // Show subcategories as clickable cards
                subcategories.map(sub => {
                  const SubIcon = getCategoryIcon(sub.slug, sub.icon);
                  const subArticles = categoryArticles[sub.id] || [];
                  
                  return (
                    <Link
                      key={sub.id}
                      to={`/help/${sub.slug}`}
                      className="group bg-zinc-900/30 border border-zinc-800/50 hover:border-gold-500/30 rounded-lg p-6 transition-all"
                    >
                      {/* Subcategory Header - Clean design */}
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${sub.color || '#D4AF37'}20` }}
                        >
                          <SubIcon size={20} style={{ color: sub.color || '#D4AF37' }} />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-medium group-hover:text-gold-400 transition-colors">{sub.name}</h3>
                          {sub.description && (
                            <p className="text-xs text-gray-500">{sub.description}</p>
                          )}
                        </div>
                        <ChevronRight size={18} className="text-gray-600 group-hover:text-gold-400 transition-colors" />
                      </div>
                      
                      {/* Article count */}
                      <div className="mt-4 pt-4 border-t border-zinc-800 text-xs text-gray-500">
                        {subArticles.length} artigo{subArticles.length !== 1 ? 's' : ''}
                      </div>
                    </Link>
                  );
                })
              ) : (
                // No subcategories - show articles as individual cards
                articles.length > 0 ? (
                  articles.map(article => (
                    <Link
                      key={article.id}
                      to={`/help/article/${article.slug}`}
                      className="group bg-zinc-900/30 border border-zinc-800/50 hover:border-gold-500/30 rounded-lg p-6 transition-all"
                    >
                      <div className="flex items-start gap-3">
                        <FileText size={20} className="mt-0.5 flex-shrink-0 text-gray-500 group-hover:text-gold-400 transition-colors" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium group-hover:text-gold-400 transition-colors mb-1">
                            {article.title}
                          </h3>
                          {article.summary && (
                            <p className="text-sm text-gray-500 line-clamp-2">{article.summary}</p>
                          )}
                        </div>
                        <ChevronRight size={18} className="text-gray-600 group-hover:text-gold-400 transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <FileText size={48} className="mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">Nenhum artigo nesta categoria ainda.</p>
                  </div>
                )
              )}
            </div>

            {/* Back Button */}
            <div className="mt-8">
              <Button
                onClick={() => navigate('/help')}
                variant="outline"
                className="border-zinc-700 text-gray-400 hover:text-white"
              >
                <ArrowLeft size={16} className="mr-2" /> Voltar ao Centro de Ajuda
              </Button>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  // Main Help Center View - Only Categories (clickable)
  const mainCategories = categories.filter(c => !c.parent_id);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      
      <main className="pt-24 pb-20">
        {/* Hero Section with Search */}
        <div className="py-16 mb-12">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-light text-white mb-4">
              Centro de Ajuda
            </h1>
            <p className="text-gray-400 text-lg mb-8">
              Como podemos ajudá-lo hoje?
            </p>
            
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex items-center max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar artigos, FAQs, documentação..."
                  className="w-full pl-11 pr-4 py-3 h-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-gray-500 rounded-l-lg rounded-r-none focus:ring-0 focus:border-zinc-600"
                />
              </div>
              <Button 
                type="submit" 
                className="h-12 px-6 text-white rounded-l-none rounded-r-lg transition-all duration-150 hover:brightness-110 hover:scale-[1.02] active:scale-95 active:brightness-90"
                style={{ backgroundColor: '#A57A50' }}
              >
                Pesquisar
              </Button>
            </form>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4">
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-8 p-6 bg-zinc-900/30 border border-zinc-800 rounded-lg">
              <h2 className="text-white font-medium mb-4">Resultados da Pesquisa</h2>
              <div className="space-y-3">
                {searchResults.map(article => (
                  <Link
                    key={article.id}
                    to={`/help/article/${article.slug}`}
                    className="flex items-start gap-2 text-sm text-gray-300 hover:text-gold-400"
                  >
                    <FileText size={14} className="mt-0.5 flex-shrink-0 text-gray-500" />
                    <span>{article.title}</span>
                  </Link>
                ))}
              </div>
              <Button
                onClick={() => setSearchResults([])}
                variant="ghost"
                size="sm"
                className="mt-4 text-gray-400"
              >
                Limpar pesquisa
              </Button>
            </div>
          )}

          {/* Section Title: Explorar Categorias */}
          <h2 className="text-2xl font-light text-white mb-8">Explorar Categorias</h2>

          {/* Grid of Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainCategories.map(category => {
              const Icon = getCategoryIcon(category.slug, category.icon);
              
              return (
                <Link
                  key={category.id}
                  to={`/help/${category.slug}`}
                  className="group bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl p-6 transition-all"
                >
                  {/* Icon */}
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${category.color || '#10B981'}30` }}
                  >
                    <Icon size={24} style={{ color: category.color || '#10B981' }} />
                  </div>
                  
                  {/* Category Name */}
                  <h3 className="text-lg font-medium text-white mb-2 group-hover:text-gold-400 transition-colors">
                    {category.name}
                  </h3>
                  
                  {/* Description */}
                  {category.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{category.description}</p>
                  )}

                  {/* Article count with icon */}
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FileText size={14} />
                    <span>{category.article_count || 0} artigos</span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Recent and Popular Articles */}
          {(recentArticles.length > 0 || popularArticles.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
              {/* Artigos Recentes */}
              {recentArticles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <Clock size={20} className="text-emerald-500" />
                    <h2 className="text-xl font-light text-white">Artigos Recentes</h2>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-1">
                    {recentArticles.map(article => (
                      <Link
                        key={article.id}
                        to={`/help/article/${article.slug}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group"
                      >
                        <FileText size={16} className="text-gray-500 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white group-hover:text-emerald-400 transition-colors truncate">
                            {article.title}
                          </p>
                          {article.created_at && (
                            <p className="text-xs text-gray-500">
                              {formatDate(article.created_at)}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Artigos Populares */}
              {popularArticles.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <TrendingUp size={20} className="text-gold-400" />
                    <h2 className="text-xl font-light text-white">Artigos Populares</h2>
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-1">
                    {popularArticles.map(article => (
                      <Link
                        key={article.id}
                        to={`/help/article/${article.slug}`}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors group"
                      >
                        <FileText size={16} className="text-gray-500 group-hover:text-gold-400 transition-colors flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white group-hover:text-gold-400 transition-colors truncate">
                            {article.title}
                          </p>
                          {article.views !== undefined && (
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <Eye size={12} /> {article.views} visualizações
                            </p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Contact Support */}
          <div className="mt-12 text-center">
            <p className="text-gray-400 mb-4">Não encontrou o que procurava?</p>
            <Link 
              to="/support"
              className="inline-flex items-center gap-2 text-gold-400 hover:text-gold-300"
            >
              Contactar Suporte <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default KnowledgeBasePage;
