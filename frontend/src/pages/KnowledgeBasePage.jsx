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
  Headphones,
  MessageSquare,
  Loader2
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
  'seguranca': Scale,
  'security': Scale,
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
      const response = await axios.get(`${API_URL}/api/kb/articles?limit=5&sort=recent`);
      setRecentArticles(response.data.articles || []);
    } catch (err) {
      console.error('Error fetching recent articles', err);
    }
  };

  const fetchPopularArticles = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/kb/articles?limit=5&sort=popular`);
      setPopularArticles(response.data.articles || []);
    } catch (err) {
      console.error('Error fetching popular articles', err);
    }
  };

  const fetchCategoryArticles = async (slug) => {
    setLoading(true);
    try {
      const catResponse = await axios.get(`${API_URL}/api/kb/categories/${slug}`);
      setCurrentCategory(catResponse.data);
      
      const artResponse = await axios.get(`${API_URL}/api/kb/articles?category=${slug}`);
      setArticles(artResponse.data.articles || []);
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
      setCurrentArticle(response.data);
      
      if (response.data.category_id) {
        const catResponse = await axios.get(`${API_URL}/api/kb/categories`);
        const cat = catResponse.data.find(c => c.id === response.data.category_id);
        setCurrentCategory(cat);
        
        const relatedResponse = await axios.get(`${API_URL}/api/kb/articles?category_id=${response.data.category_id}&limit=3`);
        setRelatedArticles(relatedResponse.data.articles?.filter(a => a.slug !== slug) || []);
      }
    } catch (err) {
      console.error('Error fetching article', err);
      navigate('/help');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
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
      <div className="min-h-screen bg-black">
        <Header />
        <div className="pt-32 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  // Article View
  if (currentArticle) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        
        <main className="pt-32 pb-20">
          <div className="max-w-4xl mx-auto px-4">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-8">
              <Link to="/help" className="text-gray-400 hover:text-gold-400 transition-colors">
                Centro de Ajuda
              </Link>
              <ChevronRight size={14} className="text-gray-600" />
              {currentCategory && (
                <>
                  <Link 
                    to={`/help/${currentCategory.slug}`}
                    className="text-gray-400 hover:text-gold-400 transition-colors"
                  >
                    {currentCategory.name}
                  </Link>
                  <ChevronRight size={14} className="text-gray-600" />
                </>
              )}
              <span className="text-gold-400">{currentArticle.title}</span>
            </nav>

            {/* Article */}
            <article className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8 md:p-12">
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-light text-white mb-4">
                  {currentArticle.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(currentArticle.created_at).toLocaleDateString('pt-PT')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={14} />
                    {currentArticle.views || 0} visualizações
                  </span>
                  {currentArticle.tags?.map(tag => (
                    <Badge key={tag} className="bg-gold-500/20 text-gold-400 border-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div className="prose prose-invert prose-gold max-w-none 
                prose-headings:text-white prose-headings:font-light
                prose-p:text-gray-300 prose-p:leading-relaxed
                prose-a:text-gold-400 prose-a:no-underline hover:prose-a:underline
                prose-strong:text-white
                prose-code:text-gold-400 prose-code:bg-zinc-800 prose-code:px-1 prose-code:rounded
                prose-pre:bg-zinc-800/50 prose-pre:border prose-pre:border-zinc-700
                prose-blockquote:border-gold-500 prose-blockquote:text-gray-400
                prose-li:text-gray-300
              ">
                {currentArticle.content?.startsWith('<') ? (
                  <div dangerouslySetInnerHTML={{ __html: currentArticle.content }} />
                ) : (
                  <ReactMarkdown>{currentArticle.content}</ReactMarkdown>
                )}
              </div>

              {/* Feedback */}
              <div className="mt-12 pt-8 border-t border-zinc-800">
                <p className="text-gray-400 mb-4">Este artigo foi útil?</p>
                {feedbackGiven ? (
                  <p className="text-gold-400">Obrigado pelo seu feedback!</p>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleFeedback(true)}
                      variant="outline"
                      className="border-gold-600/50 text-gold-400 hover:bg-gold-900/30"
                    >
                      <ThumbsUp size={16} className="mr-2" /> Sim
                    </Button>
                    <Button
                      onClick={() => handleFeedback(false)}
                      variant="outline"
                      className="border-zinc-700 text-gray-400 hover:bg-zinc-800"
                    >
                      <ThumbsDown size={16} className="mr-2" /> Não
                    </Button>
                  </div>
                )}
              </div>
            </article>

            {/* Related Articles */}
            {relatedArticles.length > 0 && (
              <div className="mt-12">
                <h3 className="text-xl font-light text-white mb-6">Artigos Relacionados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relatedArticles.map(article => (
                    <Link
                      key={article.id}
                      to={`/help/article/${article.slug}`}
                      className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl hover:border-gold-500/30 transition-all group"
                    >
                      <h4 className="text-white group-hover:text-gold-400 transition-colors">{article.title}</h4>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.summary}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Back Button */}
            <div className="mt-8">
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

  // Category View
  if (currentCategory) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        
        <main className="pt-32 pb-20">
          <div className="max-w-6xl mx-auto px-4">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm mb-8">
              <Link to="/help" className="text-gray-400 hover:text-gold-400 transition-colors">
                Centro de Ajuda
              </Link>
              <ChevronRight size={14} className="text-gray-600" />
              <span className="text-gold-400">{currentCategory.name}</span>
            </nav>

            {/* Category Header */}
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8 mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${currentCategory.color || '#D4AF37'}20` }}
                >
                  {React.createElement(getCategoryIcon(currentCategory.slug), {
                    size: 28,
                    style: { color: currentCategory.color || '#D4AF37' }
                  })}
                </div>
                <div>
                  <h1 className="text-3xl font-light text-white">{currentCategory.name}</h1>
                  <p className="text-gray-400">{currentCategory.description}</p>
                </div>
              </div>
            </div>

            {/* Articles List */}
            <div className="space-y-4">
              {articles.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                  <FileText size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">Nenhum artigo nesta categoria ainda.</p>
                </div>
              ) : (
                articles.map(article => (
                  <Link
                    key={article.id}
                    to={`/help/article/${article.slug}`}
                    className="block p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-xl hover:border-gold-500/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg text-white group-hover:text-gold-400 transition-colors mb-2">
                          {article.title}
                        </h3>
                        <p className="text-gray-400 text-sm line-clamp-2">{article.summary}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(article.created_at).toLocaleDateString('pt-PT')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye size={12} />
                            {article.views || 0}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-600 group-hover:text-gold-400 transition-colors flex-shrink-0" />
                    </div>
                  </Link>
                ))
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
  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      {/* Hero Section */}
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden pt-20">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900/50 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gold-900/20 via-transparent to-transparent" />
        
        {/* Animated lines */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold-500/20 to-transparent animate-pulse" />
          <div className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold-500/10 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center py-12">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-gradient-to-br from-gold-400/20 to-gold-600/20 border border-gold-500/30 flex items-center justify-center">
            <Book size={36} className="text-gold-400" />
          </div>
          <h1 className="text-5xl md:text-6xl font-light text-white mb-6">
            Centro de <span className="text-gold-400">Ajuda</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Como podemos ajudá-lo hoje?
          </p>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <Input
                type="text"
                placeholder="Pesquisar artigos, FAQs, documentação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-32 py-6 bg-zinc-900/80 border-gold-800/30 text-white placeholder:text-gray-500 focus:border-gold-500 rounded-xl text-lg"
              />
              <Button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-gold-500 hover:bg-gold-400 text-black font-medium"
                disabled={searching}
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pesquisar'}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <section className="py-12 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-light text-white mb-6">
              Resultados da Pesquisa ({searchResults.length})
            </h2>
            <div className="space-y-4">
              {searchResults.map(article => (
                <Link
                  key={article.id}
                  to={`/help/article/${article.slug}`}
                  className="block p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-xl hover:border-gold-500/30 transition-all group"
                >
                  <h3 className="text-lg text-white group-hover:text-gold-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-gray-400 text-sm mt-2 line-clamp-2">{article.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-light text-white mb-8">Explorar Categorias</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.filter(cat => !cat.parent_id).map(category => {
              const Icon = getCategoryIcon(category.slug);
              const subcategories = categories.filter(c => c.parent_id === category.id);
              
              return (
                <Link
                  key={category.id}
                  to={`/help/${category.slug}`}
                  className="p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-xl hover:border-gold-500/30 transition-all group"
                >
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${category.color || '#D4AF37'}20` }}
                  >
                    <Icon size={24} style={{ color: category.color || '#D4AF37' }} />
                  </div>
                  <h3 className="text-lg text-white group-hover:text-gold-400 transition-colors mb-2">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                    {category.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <FileText size={12} />
                    <span>{category.article_count || 0} artigos</span>
                  </div>
                  
                  {/* Subcategories */}
                  {subcategories.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-zinc-800">
                      <p className="text-xs text-gray-500 mb-2">Subcategorias:</p>
                      <div className="flex flex-wrap gap-2">
                        {subcategories.map(sub => (
                          <Badge 
                            key={sub.id} 
                            className="bg-zinc-800 text-gray-400 border-0 text-xs"
                          >
                            {sub.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Recent & Popular Articles */}
      <section className="py-16 px-6 bg-zinc-900/20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Recent */}
            <div>
              <h2 className="text-xl font-light text-white mb-6 flex items-center gap-2">
                <Clock size={20} className="text-gold-400" />
                Artigos Recentes
              </h2>
              <div className="space-y-3">
                {recentArticles.map(article => (
                  <Link
                    key={article.id}
                    to={`/help/article/${article.slug}`}
                    className="block p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg hover:border-gold-500/30 transition-all group"
                  >
                    <h4 className="text-white group-hover:text-gold-400 transition-colors">
                      {article.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(article.created_at).toLocaleDateString('pt-PT')}
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Popular */}
            <div>
              <h2 className="text-xl font-light text-white mb-6 flex items-center gap-2">
                <TrendingUp size={20} className="text-gold-400" />
                Artigos Populares
              </h2>
              <div className="space-y-3">
                {popularArticles.map(article => (
                  <Link
                    key={article.id}
                    to={`/help/article/${article.slug}`}
                    className="block p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg hover:border-gold-500/30 transition-all group"
                  >
                    <h4 className="text-white group-hover:text-gold-400 transition-colors">
                      {article.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Eye size={12} /> {article.views || 0} visualizações
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-gold-900/20 to-zinc-900/50 border border-gold-500/20 rounded-2xl p-12">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gold-500/20 flex items-center justify-center">
              <Headphones size={32} className="text-gold-400" />
            </div>
            <h2 className="text-2xl font-light text-white mb-4">
              Não encontrou o que procurava?
            </h2>
            <p className="text-gray-400 mb-8">
              A nossa equipa de suporte está disponível para ajudar com qualquer questão.
            </p>
            <Link to="/support">
              <Button className="bg-gold-500 hover:bg-gold-400 text-black font-medium px-8 py-6 text-lg">
                <MessageSquare size={20} className="mr-2" />
                Contactar Suporte
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default KnowledgeBasePage;
