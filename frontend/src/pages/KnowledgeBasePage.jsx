import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
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
  TrendingUp
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
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
  'default': FileText
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
  const [recentArticles, setRecentArticles] = useState([]);
  const [popularArticles, setPopularArticles] = useState([]);
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchRecentArticles();
    fetchPopularArticles();
  }, []);

  useEffect(() => {
    if (articleSlug) {
      fetchArticle(articleSlug);
    } else if (categorySlug) {
      fetchCategoryArticles(categorySlug);
    } else {
      setCurrentCategory(null);
      setCurrentArticle(null);
      setLoading(false);
    }
  }, [categorySlug, articleSlug]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/kb/categories`);
      setCategories(response.data);
    } catch (err) {
      console.error('Error fetching categories', err);
    }
  };

  const fetchRecentArticles = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/kb/recent?limit=5`);
      setRecentArticles(response.data);
    } catch (err) {
      console.error('Error fetching recent articles', err);
    }
  };

  const fetchPopularArticles = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/kb/popular?limit=5`);
      setPopularArticles(response.data);
    } catch (err) {
      console.error('Error fetching popular articles', err);
    }
  };

  const fetchCategoryArticles = async (slug) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/kb/categories/${slug}`);
      setCurrentCategory(response.data.category);
      setArticles(response.data.articles);
      setCurrentArticle(null);
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
      setCurrentArticle(response.data.article);
      setCurrentCategory(response.data.category);
      setRelatedArticles(response.data.related || []);
      setFeedbackGiven(false);
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
      setSearchResults(response.data.articles);
    } catch (err) {
      console.error('Error searching', err);
    } finally {
      setSearching(false);
    }
  };

  const submitFeedback = async (helpful) => {
    if (!currentArticle || feedbackGiven) return;
    
    try {
      await axios.post(`${API_URL}/api/kb/articles/${currentArticle.id}/feedback?helpful=${helpful}`);
      setFeedbackGiven(true);
    } catch (err) {
      console.error('Error submitting feedback', err);
    }
  };

  const getCategoryIcon = (iconName) => {
    const Icon = categoryIcons[iconName?.toLowerCase()] || categoryIcons.default;
    return Icon;
  };

  // Homepage view
  if (!categorySlug && !articleSlug) {
    return (
      <div className="min-h-screen bg-black">
        {/* Hero Section */}
        <div className="bg-gradient-to-b from-zinc-900 to-black py-16">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Centro de Ajuda
            </h1>
            <p className="text-xl text-gray-400 mb-8">
              Como podemos ajudá-lo hoje?
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                  type="text"
                  placeholder="Pesquisar artigos, FAQs, documentação..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-800 border-zinc-700 text-white text-lg rounded-xl"
                />
                <Button 
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-600"
                  disabled={searching}
                >
                  {searching ? 'A pesquisar...' : 'Pesquisar'}
                </Button>
              </div>
            </form>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6 text-left bg-zinc-900 rounded-xl p-4 max-w-2xl mx-auto">
                <h3 className="text-white font-semibold mb-3">Resultados ({searchResults.length})</h3>
                <div className="space-y-2">
                  {searchResults.map(article => (
                    <Link
                      key={article.id}
                      to={`/help/article/${article.slug}`}
                      className="block p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                      <div className="text-white font-medium">{article.title}</div>
                      {article.summary && (
                        <div className="text-sm text-gray-400 mt-1 line-clamp-2">{article.summary}</div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Categories Grid */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-white mb-8">Explorar Categorias</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map(category => {
              const Icon = getCategoryIcon(category.icon);
              return (
                <Link
                  key={category.id}
                  to={`/help/${category.slug}`}
                  className="group"
                >
                  <Card className="bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 transition-all h-full">
                    <CardContent className="p-6">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <Icon size={24} style={{ color: category.color }} />
                      </div>
                      <h3 className="text-xl font-semibold text-white group-hover:text-emerald-400 transition-colors mb-2">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-gray-400 text-sm mb-4">{category.description}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-500">
                        <FileText size={14} className="mr-1" />
                        {category.article_count} artigos
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent & Popular */}
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Clock size={20} className="text-emerald-400" />
                Artigos Recentes
              </h2>
              <div className="space-y-3">
                {recentArticles.map(article => (
                  <Link
                    key={article.id}
                    to={`/help/article/${article.slug}`}
                    className="block p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="text-white font-medium">{article.title}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      {new Date(article.published_at).toLocaleDateString('pt-PT')}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Popular */}
            <div>
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-gold-400" />
                Artigos Populares
              </h2>
              <div className="space-y-3">
                {popularArticles.map(article => (
                  <Link
                    key={article.id}
                    to={`/help/article/${article.slug}`}
                    className="block p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-gold-500/50 transition-colors"
                  >
                    <div className="text-white font-medium">{article.title}</div>
                    <div className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                      <Eye size={14} />
                      {article.view_count} visualizações
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Support CTA */}
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <Card className="bg-gradient-to-r from-emerald-900/30 to-gold-900/30 border-emerald-800/30">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-white mb-4">
                Não encontrou o que procurava?
              </h2>
              <p className="text-gray-400 mb-6">
                A nossa equipa de suporte está disponível para ajudá-lo
              </p>
              <Link to="/dashboard/support">
                <Button className="bg-emerald-500 hover:bg-emerald-600">
                  Contactar Suporte
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Category view
  if (categorySlug && !articleSlug) {
    return (
      <div className="min-h-screen bg-black py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link to="/help" className="hover:text-white">Centro de Ajuda</Link>
            <ChevronRight size={14} />
            <span className="text-white">{currentCategory?.name}</span>
          </div>

          {/* Category Header */}
          {currentCategory && (
            <div className="mb-8">
              <div 
                className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${currentCategory.color}20` }}
              >
                {React.createElement(getCategoryIcon(currentCategory.icon), {
                  size: 32,
                  style: { color: currentCategory.color }
                })}
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">{currentCategory.name}</h1>
              {currentCategory.description && (
                <p className="text-gray-400">{currentCategory.description}</p>
              )}
            </div>
          )}

          {/* Articles List */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">A carregar...</div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              Nenhum artigo encontrado nesta categoria
            </div>
          ) : (
            <div className="space-y-4">
              {articles.map(article => (
                <Link
                  key={article.id}
                  to={`/help/article/${article.slug}`}
                  className="block"
                >
                  <Card className="bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white hover:text-emerald-400 transition-colors">
                            {article.title}
                          </h3>
                          {article.summary && (
                            <p className="text-gray-400 mt-2 line-clamp-2">{article.summary}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {new Date(article.published_at).toLocaleDateString('pt-PT')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye size={14} />
                              {article.view_count}
                            </span>
                          </div>
                        </div>
                        {article.is_featured && (
                          <Badge className="bg-gold-500/20 text-gold-400 border-0 shrink-0 ml-4">
                            Destaque
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Article view
  if (articleSlug && currentArticle) {
    return (
      <div className="min-h-screen bg-black py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <Link to="/help" className="hover:text-white">Centro de Ajuda</Link>
            <ChevronRight size={14} />
            {currentCategory && (
              <>
                <Link to={`/help/${currentCategory.slug}`} className="hover:text-white">
                  {currentCategory.name}
                </Link>
                <ChevronRight size={14} />
              </>
            )}
            <span className="text-white truncate">{currentArticle.title}</span>
          </div>

          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 text-gray-400 hover:text-white"
          >
            <ArrowLeft size={16} className="mr-2" />
            Voltar
          </Button>

          {/* Article */}
          <article className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-4">{currentArticle.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {new Date(currentArticle.published_at).toLocaleDateString('pt-PT', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={14} />
                  {currentArticle.view_count} visualizações
                </span>
                {currentArticle.author_name && (
                  <span>Por {currentArticle.author_name}</span>
                )}
              </div>

              {currentArticle.tags && currentArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {currentArticle.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="border-zinc-700 text-gray-400">
                      <Tag size={12} className="mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </header>

            {/* Content */}
            <div className="prose prose-invert prose-emerald max-w-none">
              <ReactMarkdown>{currentArticle.content}</ReactMarkdown>
            </div>

            {/* Feedback */}
            <div className="mt-12 pt-8 border-t border-zinc-800">
              <div className="text-center">
                <p className="text-gray-400 mb-4">Este artigo foi útil?</p>
                {feedbackGiven ? (
                  <p className="text-emerald-400">Obrigado pelo seu feedback!</p>
                ) : (
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => submitFeedback(true)}
                      className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <ThumbsUp size={16} className="mr-2" />
                      Sim ({currentArticle.helpful_yes})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => submitFeedback(false)}
                      className="border-zinc-700 text-gray-400 hover:bg-zinc-800"
                    >
                      <ThumbsDown size={16} className="mr-2" />
                      Não ({currentArticle.helpful_no})
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </article>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4">Artigos Relacionados</h2>
              <div className="grid gap-4">
                {relatedArticles.map(article => (
                  <Link
                    key={article.id}
                    to={`/help/article/${article.slug}`}
                    className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-emerald-500/50 transition-colors"
                  >
                    <div className="text-white font-medium">{article.title}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-gray-400">A carregar...</div>
    </div>
  );
};

export default KnowledgeBasePage;
