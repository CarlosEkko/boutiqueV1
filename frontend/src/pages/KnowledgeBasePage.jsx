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
  MoreHorizontal,
  Bell,
  Shield
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import ReactMarkdown from 'react-markdown';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Icon mapping for categories
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
  'account': HelpCircle,
  'api': FileText,
  'compliance': Scale,
  'deposits': Folder,
  'fees': FileCheck,
  'payments': FileCheck,
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
  const [searching, setSearching] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [categoryArticles, setCategoryArticles] = useState({});
  const [subcategories, setSubcategories] = useState([]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all categories
        const catResponse = await axios.get(`${API_URL}/api/kb/categories`);
        setCategories(catResponse.data || []);

        // Fetch articles for each main category
        const mainCategories = (catResponse.data || []).filter(c => !c.parent_id);
        const articlesMap = {};
        
        await Promise.all(mainCategories.map(async (cat) => {
          try {
            const artResponse = await axios.get(`${API_URL}/api/kb/articles?category=${cat.slug}&limit=5`);
            articlesMap[cat.id] = artResponse.data.articles || [];
          } catch (err) {
            articlesMap[cat.id] = [];
          }
        }));
        
        setCategoryArticles(articlesMap);
      } catch (err) {
        console.error('Error fetching data', err);
      } finally {
        setLoading(false);
      }
    };

    if (!categorySlug && !articleSlug) {
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
      const response = await axios.get(`${API_URL}/api/kb/categories/${slug}`);
      const categoryData = response.data.category || response.data;
      const articlesData = response.data.articles || [];
      
      setCurrentCategory(categoryData);
      setArticles(articlesData);
      setCurrentArticle(null);

      // Fetch subcategories
      const allCats = await axios.get(`${API_URL}/api/kb/categories`);
      const subs = (allCats.data || []).filter(c => c.parent_id === categoryData.id);
      setSubcategories(subs);

      // Fetch articles for each subcategory
      const subArticlesMap = {};
      await Promise.all(subs.map(async (sub) => {
        try {
          const artResponse = await axios.get(`${API_URL}/api/kb/articles?category=${sub.slug}&limit=5`);
          subArticlesMap[sub.id] = artResponse.data.articles || [];
        } catch (err) {
          subArticlesMap[sub.id] = [];
        }
      }));
      setCategoryArticles(prev => ({ ...prev, ...subArticlesMap }));
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
    
    setSearching(true);
    try {
      const response = await axios.get(`${API_URL}/api/kb/articles?search=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response.data.articles || []);
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setSearching(false);
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

  const getCategoryIcon = (slug) => {
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
                <Link to="/help" className="text-gray-400 hover:text-gold-400">Help Center</Link>
                <span className="text-gray-600">/</span>
                <Link to="/help" className="text-gray-400 hover:text-gold-400">HELP CENTER</Link>
                {currentCategory && (
                  <>
                    <span className="text-gray-600">/</span>
                    <Link to={`/help/${currentCategory.slug}`} className="text-gray-400 hover:text-gold-400">
                      {currentCategory.name?.toUpperCase()}
                    </Link>
                  </>
                )}
              </nav>
              <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search articles"
                  className="w-64 bg-zinc-900 border-zinc-700 text-white"
                />
                <Button type="submit" size="icon" variant="ghost" className="text-gray-400">
                  <Search size={18} />
                </Button>
              </form>
            </div>

            <div className="flex gap-8">
              {/* Main Content */}
              <article className="flex-1 min-w-0">
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
                ">
                  {currentArticle.content?.startsWith('<') ? (
                    <div dangerouslySetInnerHTML={{ __html: currentArticle.content }} />
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
                    Follow
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Subscribe to receive notifications from this article.
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
                      <span className="text-white font-medium">Related Articles</span>
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

  // Category View (with subcategories in grid)
  if (currentCategory) {
    const Icon = getCategoryIcon(currentCategory.slug);
    
    return (
      <div className="min-h-screen bg-zinc-950">
        <Header />
        
        <main className="pt-24 pb-20">
          <div className="max-w-7xl mx-auto px-4">
            {/* Breadcrumb & Search */}
            <div className="flex items-center justify-between mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link to="/help" className="text-gray-400 hover:text-gold-400">Help Center</Link>
                <span className="text-gray-600">/</span>
                <Link to="/help" className="text-gray-400 hover:text-gold-400">HELP CENTER</Link>
                <span className="text-gray-600">/</span>
                <span className="text-gold-400">{currentCategory.name?.toUpperCase()}</span>
              </nav>
              <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search articles"
                  className="w-64 bg-zinc-900 border-zinc-700 text-white"
                />
                <Button type="submit" size="icon" variant="ghost" className="text-gray-400">
                  <Search size={18} />
                </Button>
              </form>
            </div>

            {/* Grid of Subcategories or Articles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subcategories.length > 0 ? (
                // Show subcategories with their articles
                subcategories.map(sub => {
                  const SubIcon = getCategoryIcon(sub.slug);
                  const subArticles = categoryArticles[sub.id] || [];
                  
                  return (
                    <div key={sub.id} className="bg-zinc-900/30 rounded-lg p-6">
                      {/* Subcategory Header */}
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
                        <div className="flex items-center gap-3">
                          <SubIcon size={24} style={{ color: sub.color || '#D4AF37' }} />
                          <div>
                            <h3 className="text-white font-medium">{sub.name}</h3>
                            <p className="text-xs text-gray-500">{sub.name}</p>
                          </div>
                        </div>
                        <MoreHorizontal size={20} className="text-gray-600" />
                      </div>

                      {/* Articles List */}
                      <div className="space-y-3">
                        {subArticles.slice(0, 5).map(article => (
                          <Link
                            key={article.id}
                            to={`/help/article/${article.slug}`}
                            className="flex items-start gap-2 text-sm text-gray-300 hover:text-gold-400 transition-colors"
                          >
                            <FileText size={14} className="mt-0.5 flex-shrink-0 text-gray-500" />
                            <span>{article.title}</span>
                          </Link>
                        ))}
                        {subArticles.length === 0 && (
                          <p className="text-sm text-gray-500">Nenhum artigo ainda.</p>
                        )}
                      </div>

                      {/* More Link */}
                      {subArticles.length > 5 && (
                        <Link 
                          to={`/help/${sub.slug}`}
                          className="inline-flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300 mt-4"
                        >
                          more <ChevronRight size={14} />
                        </Link>
                      )}
                    </div>
                  );
                })
              ) : (
                // No subcategories - show articles directly in one card
                <div className="bg-zinc-900/30 rounded-lg p-6 col-span-full max-w-md">
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Icon size={24} style={{ color: currentCategory.color || '#D4AF37' }} />
                      <div>
                        <h3 className="text-white font-medium">{currentCategory.name}</h3>
                        <p className="text-xs text-gray-500">{currentCategory.description}</p>
                      </div>
                    </div>
                    <MoreHorizontal size={20} className="text-gray-600" />
                  </div>

                  {/* Articles List */}
                  <div className="space-y-3">
                    {articles.map(article => (
                      <Link
                        key={article.id}
                        to={`/help/article/${article.slug}`}
                        className="flex items-start gap-2 text-sm text-gray-300 hover:text-gold-400 transition-colors"
                      >
                        <FileText size={14} className="mt-0.5 flex-shrink-0 text-gray-500" />
                        <span>{article.title}</span>
                      </Link>
                    ))}
                    {articles.length === 0 && (
                      <p className="text-sm text-gray-500">Nenhum artigo ainda.</p>
                    )}
                  </div>
                </div>
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

  // Main Help Center View
  const mainCategories = categories.filter(c => !c.parent_id);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Header />
      
      <main className="pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Breadcrumb & Search */}
          <div className="flex items-center justify-between mb-8">
            <nav className="flex items-center gap-2 text-sm">
              <Link to="/help" className="text-gray-400 hover:text-gold-400">Help Center</Link>
              <span className="text-gray-600">/</span>
              <span className="text-gold-400">HELP CENTER</span>
            </nav>
            <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search articles"
                className="w-64 bg-zinc-900 border-zinc-700 text-white placeholder:text-gray-500"
              />
              <Button type="submit" size="icon" variant="ghost" className="text-gray-400">
                <Search size={18} />
              </Button>
            </form>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mb-8 p-6 bg-zinc-900/30 rounded-lg">
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

          {/* Grid of Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mainCategories.map(category => {
              const Icon = getCategoryIcon(category.slug);
              const catArticles = categoryArticles[category.id] || [];
              
              return (
                <div key={category.id} className="bg-zinc-900/30 rounded-lg p-6">
                  {/* Category Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                      <Icon size={24} style={{ color: category.color || '#D4AF37' }} />
                      <div>
                        <h3 className="text-white font-medium uppercase">{category.name}</h3>
                        <p className="text-xs text-gray-500 uppercase">{category.name}</p>
                      </div>
                    </div>
                    <MoreHorizontal size={20} className="text-gray-600" />
                  </div>

                  {/* Articles List */}
                  <div className="space-y-3">
                    {catArticles.slice(0, 5).map(article => (
                      <Link
                        key={article.id}
                        to={`/help/article/${article.slug}`}
                        className="flex items-start gap-2 text-sm text-gray-300 hover:text-gold-400 transition-colors"
                      >
                        <FileText size={14} className="mt-0.5 flex-shrink-0 text-gray-500" />
                        <span>{article.title}</span>
                      </Link>
                    ))}
                    {catArticles.length === 0 && (
                      <p className="text-sm text-gray-500">Nenhum artigo ainda.</p>
                    )}
                  </div>

                  {/* More Link */}
                  {(catArticles.length > 5 || category.article_count > 5) && (
                    <Link 
                      to={`/help/${category.slug}`}
                      className="inline-flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300 mt-4"
                    >
                      more <ChevronRight size={14} />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>

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
