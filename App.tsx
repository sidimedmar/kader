
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  History, 
  PieChart, 
  Settings, 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Globe, 
  Trash2, 
  Edit,
  MessageCircle,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Layers,
  Lock,
  LogOut,
  KeyRound
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import bcrypt from 'bcryptjs';
import { Product, AuditLog, Language, CartItem, CATEGORIES, Variation } from './types';
import { translations } from './constants';

const App: React.FC = () => {
  // --- Auth State ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('mm_auth') === 'true';
  });
  const [adminPasswordHash, setAdminPasswordHash] = useState<string>(() => {
    const saved = localStorage.getItem('mm_pwd_hash');
    // Default password 'admin123' hashed if not set
    return saved || bcrypt.hashSync('admin123', 10);
  });
  const [loginError, setLoginError] = useState<string | null>(null);

  // --- App State ---
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('mm_products');
    return saved ? JSON.parse(saved) : [];
  });
  const [logs, setLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('mm_logs');
    return saved ? JSON.parse(saved) : [];
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('mm_lang') as Language) || 'ar';
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'catalog' | 'history' | 'stats' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [currentVariations, setCurrentVariations] = useState<Variation[]>([]);

  const t = translations[language];
  const isRtl = language === 'ar';

  // --- Auto-save & Sync ---
  useEffect(() => {
    localStorage.setItem('mm_products', JSON.stringify(products));
    localStorage.setItem('mm_logs', JSON.stringify(logs));
    localStorage.setItem('mm_lang', language);
    localStorage.setItem('mm_pwd_hash', adminPasswordHash);
    localStorage.setItem('mm_auth', isAuthenticated.toString());
  }, [products, logs, language, adminPasswordHash, isAuthenticated]);

  useEffect(() => {
    if (editingProduct) {
      setCurrentVariations(editingProduct.variations || []);
    } else {
      setCurrentVariations([]);
    }
  }, [editingProduct, isModalOpen]);

  // --- Auth Handlers ---
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    if (bcrypt.compareSync(password, adminPasswordHash)) {
      setIsAuthenticated(true);
      setLoginError(null);
      addLog('IMPORT', 'Admin login successful');
    } else {
      setLoginError(t.wrongPassword);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setActiveTab('dashboard');
  };

  const handleChangePassword = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const oldPwd = formData.get('oldPassword') as string;
    const newPwd = formData.get('newPassword') as string;

    if (bcrypt.compareSync(oldPwd, adminPasswordHash)) {
      setAdminPasswordHash(bcrypt.hashSync(newPwd, 10));
      alert(t.passwordChanged);
      e.currentTarget.reset();
    } else {
      alert(t.wrongPassword);
    }
  };

  // --- Product Handlers ---
  const addLog = (action: AuditLog['action'], details: string) => {
    const newLog: AuditLog = {
      id: Date.now().toString(),
      action,
      details,
      timestamp: Date.now()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const addVariationToForm = () => {
    setCurrentVariations(prev => [
      ...prev,
      { id: Math.random().toString(36).substr(2, 9), name: '', price: 0, stock: 0 }
    ]);
  };

  const updateVariationInForm = (index: number, field: keyof Variation, value: any) => {
    setCurrentVariations(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const removeVariationFromForm = (index: number) => {
    setCurrentVariations(prev => prev.filter((_, i) => i !== index));
  };

  const saveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const productData: Partial<Product> = {
      name: formData.get('name') as string,
      price: Number(formData.get('price')),
      discountPrice: formData.get('discountPrice') ? Number(formData.get('discountPrice')) : undefined,
      category: formData.get('category') as string,
      stock: Number(formData.get('stock')),
      description: formData.get('description') as string,
      image: (formData.get('image_base64') as string) || (editingProduct?.image || 'https://picsum.photos/200/200'),
      variations: currentVariations.length > 0 ? currentVariations : undefined
    };

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productData } : p));
      addLog('UPDATE', `Updated product: ${productData.name}`);
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        createdAt: Date.now(),
        ...(productData as Product)
      };
      setProducts(prev => [newProduct, ...prev]);
      addLog('CREATE', `Created product: ${newProduct.name}`);
    }
    
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const deleteProduct = (id: string) => {
    if (window.confirm(t.confirmDelete)) {
      const p = products.find(prod => prod.id === id);
      setProducts(prev => prev.filter(prod => prod.id !== id));
      addLog('DELETE', `Deleted product: ${p?.name}`);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, inputName: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const hiddenInput = document.getElementById(inputName) as HTMLInputElement;
        if (hiddenInput) hiddenInput.value = base64;
      };
      reader.readAsDataURL(file);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify({ products, logs, language, adminPasswordHash });
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marketmaster_export_${new Date().toISOString()}.json`;
    link.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target?.result as string);
          if (imported.products) setProducts(imported.products);
          if (imported.logs) setLogs(imported.logs);
          if (imported.adminPasswordHash) setAdminPasswordHash(imported.adminPasswordHash);
          addLog('IMPORT', 'Imported data from JSON');
          alert(t.successImport);
        } catch (err) {
          alert('Error parsing JSON');
        }
      };
      reader.readAsText(file);
    }
  };

  const addToCart = (p: Product, variationId?: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === p.id && item.selectedVariationId === variationId);
      if (existing) {
        return prev.map(item => (item.id === p.id && item.selectedVariationId === variationId) ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...p, quantity: 1, selectedVariationId: variationId }];
    });
  };

  const checkoutWhatsApp = () => {
    const cartText = cart.map(item => {
      const variationName = item.variations?.find(v => v.id === item.selectedVariationId)?.name;
      return `- ${item.name} ${variationName ? `(${variationName})` : ''} (x${item.quantity})`;
    }).join('\n');
    
    const total = cart.reduce((sum, item) => {
      const varData = item.variations?.find(v => v.id === item.selectedVariationId);
      const price = varData ? (varData.discountPrice || varData.price) : (item.discountPrice || item.price);
      return sum + price * item.quantity;
    }, 0);

    const message = encodeURIComponent(`New Order:\n${cartText}\n\nTotal: ${total.toFixed(2)} ${t.currency}`);
    window.open(`https://wa.me/212600000000?text=${message}`, '_blank');
  };

  // --- Computed Stats ---
  const statsData = useMemo(() => {
    const catMap: Record<string, number> = {};
    products.forEach(p => {
      catMap[p.category] = (catMap[p.category] || 0) + 1;
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [products]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = products.reduce((sum, p) => {
    if (p.variations && p.variations.length > 0) {
      return sum + p.variations.reduce((vSum, v) => vSum + (v.price * v.stock), 0);
    }
    return sum + (p.price * p.stock);
  }, 0);

  const lowStockCount = products.filter(p => {
    if (p.variations && p.variations.length > 0) {
      return p.variations.some(v => v.stock < 5);
    }
    return p.stock < 5;
  }).length;

  // --- Login Page ---
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-slate-100 p-6 ${isRtl ? 'rtl' : 'ltr'}`}>
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center mb-10">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200 mb-6">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">{t.title}</h1>
            <p className="text-slate-400 font-medium mt-2">{t.adminAccess}</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">{t.password}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  name="password" 
                  required 
                  className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
              {loginError && <p className="text-rose-500 text-xs font-bold mt-1 animate-bounce">{loginError}</p>}
            </div>

            <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-bold shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2">
              <span>{t.login}</span>
              <ChevronRight size={18} className={isRtl ? 'rotate-180' : ''} />
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100 flex justify-center">
            <button 
              onClick={() => setLanguage(language === 'ar' ? 'fr' : 'ar')}
              className="text-slate-400 hover:text-blue-600 text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Globe size={16} />
              {language === 'ar' ? 'Passer en Français' : 'التحويل للعربية'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Sub-Components ---
  const SidebarItem = ({ id, icon: Icon, label }: { id: any, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${isRtl ? 'space-x-reverse' : ''} ${
        activeTab === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className={`min-h-screen flex ${isRtl ? 'rtl text-right' : 'ltr text-left'}`}>
      {/* Sidebar */}
      <aside className="w-64 bg-white border-e border-slate-200 p-6 flex flex-col fixed h-full z-10 hidden md:flex">
        <div className="flex items-center space-x-3 mb-10 px-2 group cursor-pointer">
          <div className="bg-blue-600 p-2 rounded-lg group-hover:rotate-12 transition-transform">
            <Package className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t.title}</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label={t.dashboard} />
          <SidebarItem id="products" icon={Package} label={t.products} />
          <SidebarItem id="catalog" icon={ShoppingCart} label={t.catalog} />
          <SidebarItem id="stats" icon={PieChart} label={t.stats} />
          <SidebarItem id="history" icon={History} label={t.history} />
          <SidebarItem id="settings" icon={Settings} label={t.settings} />
        </nav>

        <div className="mt-auto space-y-2">
          <button 
            onClick={() => setLanguage(language === 'ar' ? 'fr' : 'ar')}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center space-x-2 space-x-reverse">
              <Globe size={18} />
              <span>{language === 'ar' ? 'Français' : 'العربية'}</span>
            </div>
          </button>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors font-bold"
          >
            <LogOut size={18} />
            <span>{t.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${isRtl ? 'md:mr-64' : 'md:ml-64'} transition-all duration-300 bg-slate-50 min-h-screen`}>
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <div className="relative w-96 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
            <input 
              type="text" 
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all border border-transparent"
            />
          </div>

          <div className="flex items-center space-x-4 space-x-reverse">
            <button 
              onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse shadow-md shadow-blue-200 transition-all active:scale-95"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">{t.addProduct}</span>
            </button>
          </div>
        </header>

        <div className="p-8">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: t.totalProducts, val: products.length, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: t.revenue, val: `${totalValue.toLocaleString()} ${t.currency}`, icon: PieChart, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: t.lowStock, val: lowStockCount, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
                  { label: t.cart, val: cart.length, icon: ShoppingCart, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((s, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-500">{s.label}</p>
                      <h3 className="text-2xl font-bold text-slate-800 mt-1">{s.val}</h3>
                    </div>
                    <div className={`${s.bg} p-3 rounded-xl`}>
                      <s.icon className={s.color} size={24} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-100 shadow-sm h-[400px]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800 text-lg">{t.stats}</h3>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <button onClick={exportData} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><Download size={20} /></button>
                      <label className="p-2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
                        <Upload size={20} />
                        <input type="file" className="hidden" accept=".json" onChange={importData} />
                      </label>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {statsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[400px]">
                  <h3 className="font-bold text-slate-800 text-lg mb-6">{t.recentActions}</h3>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {logs.length > 0 ? logs.map(log => (
                      <div key={log.id} className="flex items-start space-x-3 space-x-reverse group">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          log.action === 'CREATE' ? 'bg-emerald-500' :
                          log.action === 'UPDATE' ? 'bg-blue-500' :
                          log.action === 'DELETE' ? 'bg-rose-500' : 'bg-slate-400'
                        }`} />
                        <div>
                          <p className="text-sm text-slate-700 font-medium group-hover:text-blue-600 transition-colors">{log.details}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-30">
                        <History size={48} />
                        <p className="mt-2 text-sm">{t.noProducts}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-300">
               <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                       <KeyRound size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">{t.changePassword}</h2>
                  </div>
                  
                  <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">{t.oldPassword}</label>
                        <input required type="password" name="oldPassword" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                     </div>
                     <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">{t.newPassword}</label>
                        <input required type="password" name="newPassword" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                     </div>
                     <div className="md:col-span-2 flex justify-end">
                        <button type="submit" className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-100">
                           {t.save}
                        </button>
                     </div>
                  </form>
               </div>

               <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                       <Download size={24} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">Data Management</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <button onClick={exportData} className="flex items-center justify-between p-6 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all text-left group">
                        <div>
                           <p className="font-bold text-slate-800">{t.export}</p>
                           <p className="text-xs text-slate-400 mt-1">Download backup of all your data</p>
                        </div>
                        <Download className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                     </button>
                     <label className="flex items-center justify-between p-6 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all text-left group cursor-pointer">
                        <div>
                           <p className="font-bold text-slate-800">{t.import}</p>
                           <p className="text-xs text-slate-400 mt-1">Restore your store from JSON file</p>
                        </div>
                        <Upload className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        <input type="file" className="hidden" accept=".json" onChange={importData} />
                     </label>
                  </div>
               </div>
            </div>
          )}

          {/* Product Management Tab */}
          {activeTab === 'products' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left rtl:text-right">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">{t.image}</th>
                      <th className="px-6 py-4">{t.name}</th>
                      <th className="px-6 py-4">{t.category}</th>
                      <th className="px-6 py-4">{t.price}</th>
                      <th className="px-6 py-4">{t.stock}</th>
                      <th className="px-6 py-4 text-center">{t.settings}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <img src={p.image} className="w-12 h-12 rounded-lg object-cover shadow-sm border border-slate-200" alt="" />
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          <div className="flex items-center gap-2">
                            {p.name}
                            {p.variations && <span title="Has variations"><Layers size={14} className="text-blue-500" /></span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-medium uppercase">{p.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            {p.variations ? (
                              <span className="text-blue-600 font-bold italic">Mult. {t.price}</span>
                            ) : p.discountPrice ? (
                              <>
                                <span className="text-emerald-600 font-bold">{p.discountPrice.toFixed(2)} {t.currency}</span>
                                <span className="text-slate-400 text-xs line-through">{p.price.toFixed(2)} {t.currency}</span>
                              </>
                            ) : (
                              <span className="font-bold text-slate-700">{p.price.toFixed(2)} {t.currency}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            (p.variations ? p.variations.reduce((s, v) => s + v.stock, 0) : p.stock) < 5 
                            ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {p.variations ? p.variations.reduce((s, v) => s + v.stock, 0) : p.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center space-x-2 space-x-reverse opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => { setEditingProduct(p); setIsModalOpen(true); }}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit size={18} />
                            </button>
                            <button 
                              onClick={() => deleteProduct(p.id)}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredProducts.length === 0 && (
                  <div className="p-20 text-center text-slate-400">
                    <Package size={48} className="mx-auto mb-4 opacity-20" />
                    <p>{t.noProducts}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Catalog View */}
          {activeTab === 'catalog' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {filteredProducts.map(p => (
                <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col">
                  <div className="relative h-48 overflow-hidden">
                    <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                    {p.discountPrice && !p.variations && (
                      <div className={`absolute top-4 ${isRtl ? 'right-4' : 'left-4'} bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-lg`}>
                        {Math.round((1 - p.discountPrice/p.price) * 100)}% OFF
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <span className="text-xs text-slate-400 font-bold uppercase mb-1">{p.category}</span>
                    <h3 className="font-bold text-slate-800 text-lg mb-2">{p.name}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-1">{p.description}</p>
                    
                    {p.variations && (
                      <div className="mb-4 space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400">{t.selectVariation}</label>
                        <div className="flex flex-wrap gap-2">
                          {p.variations.map(v => (
                            <button 
                              key={v.id}
                              onClick={() => addToCart(p, v.id)}
                              className="px-2 py-1 text-xs border border-slate-200 rounded-md hover:border-blue-500 hover:text-blue-500 transition-colors"
                            >
                              {v.name} - {v.discountPrice || v.price} {t.currency}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {!p.variations && (
                      <div className="flex items-center justify-between mt-auto">
                        <div>
                          {p.discountPrice ? (
                            <div className="flex flex-col">
                              <span className="text-lg font-black text-blue-600">{p.discountPrice.toFixed(2)} {t.currency}</span>
                              <span className="text-xs text-slate-400 line-through">{p.price.toFixed(2)} {t.currency}</span>
                            </div>
                          ) : (
                            <span className="text-lg font-black text-slate-800">{p.price.toFixed(2)} {t.currency}</span>
                          )}
                        </div>
                        <button 
                          onClick={() => addToCart(p)}
                          className="bg-slate-900 hover:bg-black text-white p-3 rounded-xl transition-all active:scale-90"
                        >
                          <ShoppingCart size={20} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* History/Logs View */}
          {activeTab === 'history' && (
             <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-800">{t.history}</h2>
                  <button onClick={() => { if(window.confirm('Clear all?')) setLogs([]); }} className="text-rose-600 hover:text-rose-700 font-medium text-sm flex items-center gap-1">
                    <Trash2 size={16} />
                    <span>Clear Logs</span>
                  </button>
                </div>
                <div className="space-y-4">
                   {logs.map(log => (
                      <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                             log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-600' :
                             log.action === 'UPDATE' ? 'bg-blue-100 text-blue-600' :
                             log.action === 'DELETE' ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-500'
                          }`}>
                             {log.action === 'CREATE' ? <Plus size={20} /> : log.action === 'DELETE' ? <Trash2 size={20} /> : <Edit size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{log.details}</p>
                            <p className="text-xs text-slate-400 font-medium">{log.action} • {new Date(log.timestamp).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-slate-300">
                           {isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                        </div>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {/* Stats View */}
          {activeTab === 'stats' && (
             <div className="space-y-8 animate-in slide-in-from-top-4 duration-300">
                <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 h-[500px]">
                   <h2 className="text-xl font-bold mb-8">{t.stats} - {t.category}</h2>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={statsData} layout="vertical" margin={{ left: 40, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                        <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                           {statsData.map((e, i) => <Cell key={i} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                </div>
             </div>
          )}
        </div>
      </main>

      {/* Cart Summary */}
      {cart.length > 0 && (
        <div className={`fixed bottom-8 ${isRtl ? 'left-8' : 'right-8'} z-50 animate-in bounce-in duration-500`}>
          <button 
            onClick={checkoutWhatsApp}
            className="bg-slate-900 text-white p-4 rounded-full shadow-2xl flex items-center space-x-3 space-x-reverse hover:scale-105 transition-transform group"
          >
            <div className="relative">
              <ShoppingCart size={24} />
              <span className="absolute -top-2 -right-2 bg-rose-500 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>
            <div className="flex flex-col items-start pr-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 leading-none">{t.cart}</span>
              <span className="font-black text-lg">
                {cart.reduce((sum, item) => {
                  const varData = item.variations?.find(v => v.id === item.selectedVariationId);
                  const price = varData ? (varData.discountPrice || varData.price) : (item.discountPrice || item.price);
                  return sum + price * item.quantity;
                }, 0).toFixed(2)} {t.currency}
              </span>
            </div>
            <div className="bg-emerald-500 p-2 rounded-lg group-hover:bg-emerald-400 transition-colors">
              <MessageCircle size={20} />
            </div>
          </button>
        </div>
      )}

      {/* Product Modal (Add/Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm bg-black/40">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800">{editingProduct ? t.editProduct : t.addProduct}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <form onSubmit={saveProduct} className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
              <input type="hidden" name="image_base64" id="p_img_base64" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">{t.name}</label>
                  <input required name="name" defaultValue={editingProduct?.name} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">{t.category}</label>
                  <select name="category" defaultValue={editingProduct?.category} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none">
                    {CATEGORIES[language].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                {/* Base price/stock only if no variations */}
                {currentVariations.length === 0 && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">{t.price}</label>
                      <input required type="number" step="0.01" name="price" defaultValue={editingProduct?.price} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-emerald-600 uppercase tracking-wide">{t.discountPrice}</label>
                      <input type="number" step="0.01" name="discountPrice" defaultValue={editingProduct?.discountPrice} className="w-full px-4 py-3 rounded-xl border border-emerald-100 outline-none bg-emerald-50/30" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">{t.stock}</label>
                      <input required type="number" name="stock" defaultValue={editingProduct?.stock} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" />
                    </div>
                  </>
                )}
                
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">{t.image}</label>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'p_img_base64')} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                </div>
              </div>

              {/* Variations Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                    <Layers size={18} className="text-blue-500" />
                    {t.variations}
                  </h3>
                  <button 
                    type="button" 
                    onClick={addVariationToForm}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full transition-colors"
                  >
                    <Plus size={14} />
                    {t.addVariation}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {currentVariations.map((v, idx) => (
                    <div key={v.id} className="grid grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl relative group">
                      <div className="col-span-1">
                        <input 
                          placeholder={t.variationName} 
                          value={v.name} 
                          onChange={(e) => updateVariationInForm(idx, 'name', e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none" 
                        />
                      </div>
                      <div>
                        <input 
                          type="number" 
                          placeholder={t.price} 
                          value={v.price} 
                          onChange={(e) => updateVariationInForm(idx, 'price', Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none" 
                        />
                      </div>
                      <div>
                        <input 
                          type="number" 
                          placeholder={t.stock} 
                          value={v.stock} 
                          onChange={(e) => updateVariationInForm(idx, 'stock', Number(e.target.value))}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none" 
                        />
                      </div>
                      <div className="flex items-center">
                        <input 
                          type="number" 
                          placeholder={t.discountPrice} 
                          value={v.discountPrice || ''} 
                          onChange={(e) => updateVariationInForm(idx, 'discountPrice', e.target.value ? Number(e.target.value) : undefined)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-emerald-100 outline-none bg-white" 
                        />
                        <button 
                          type="button"
                          onClick={() => removeVariationFromForm(idx)}
                          className="ml-2 text-rose-500 hover:bg-rose-100 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-600 uppercase tracking-wide">{t.description}</label>
                <textarea rows={3} name="description" defaultValue={editingProduct?.description} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none resize-none"></textarea>
              </div>

              <div className="flex space-x-4 space-x-reverse pt-4 border-t border-slate-100">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">{t.save}</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all">{t.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
