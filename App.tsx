
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ViewState, 
  Ingredient, 
  Recipe, 
  UserPreferences,
  MealSlot,
  DayOfWeek
} from './types.ts';
import { 
  INITIAL_PREFERENCES, 
  COMMON_STAPLES, 
  MOCK_RECIPES 
} from './constants.tsx';
import { 
  generateRecipesFromPantry 
} from './geminiService.ts';
import TiltedCard from './TiltedCard.tsx';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner'];

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  completed: boolean;
}

const RecipeImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [isLoading, setIsLoading] = useState(true);
  return (
    <div className={`relative bg-slate-100 dark:bg-slate-800 overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-10">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      <img 
        src={src} 
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  );
};

const Sidebar: React.FC<{ currentView: ViewState; onNavigate: (view: ViewState) => void }> = ({ currentView, onNavigate }) => (
  <aside className="hidden lg:flex w-72 shrink-0 flex-col h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-8 z-40 no-print">
    <div className="flex items-center gap-3 mb-12 px-2 cursor-pointer group" onClick={() => onNavigate('landing')}>
      <div className="size-10 flex items-center justify-center bg-primary rounded-xl group-hover:rotate-6 transition-transform shadow-lg shadow-primary/20">
        <span className="material-symbols-outlined !text-[24px] text-white font-black">nutrition</span>
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white font-aesthetic">ChefMistri</h2>
    </div>

    <div className="flex flex-col gap-2">
      {[
        { id: 'pantry', label: 'My Pantry', icon: 'inventory_2' },
        { id: 'recommendations', label: 'Recipe Feed', icon: 'restaurant' },
        { id: 'cookbook', label: 'Meal Planner', icon: 'calendar_today' },
        { id: 'shopping-list', label: 'Grocery List', icon: 'shopping_basket' }
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id as ViewState)}
          className={`flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${
            currentView === item.id 
              ? 'bg-primary/10 text-primary dark:bg-primary/20' 
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
          <span className="text-base">{item.label}</span>
        </button>
      ))}
    </div>
  </aside>
);

const Header: React.FC<{ onNavigate: (view: ViewState) => void; isDarkMode: boolean; toggleDarkMode: () => void }> = ({ onNavigate, isDarkMode, toggleDarkMode }) => (
  <header className="h-20 flex items-center justify-between px-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 w-full shrink-0 z-30 sticky top-0 no-print">
    <div className="flex-1 max-w-md">
       <h2 className="text-xl font-black dark:text-white">Dashboard</h2>
    </div>
    <div className="flex items-center gap-6">
      <button onClick={toggleDarkMode} className="size-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 transition-all active:scale-95 icon-button">
        <span className="material-symbols-outlined !text-[24px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
      </button>
      <button onClick={() => onNavigate('pantry')} className="liquid-glass text-white text-sm font-black px-6 py-2.5 rounded-xl">Log In</button>
    </div>
  </header>
);

const Landing: React.FC<{ onNavigate: (view: ViewState) => void; isDarkMode: boolean; toggleDarkMode: () => void }> = ({ onNavigate, isDarkMode, toggleDarkMode }) => {
  const [currentPage, setCurrentPage] = useState(0); // 0, 1, 2
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  
  const trendingRecipes = [
    { title: "Mediterranean Quinoa Bowl", time: "15 MINS", difficulty: "EASY", img: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg", popular: true },
    { title: "Zesty Lemon Salmon", time: "25 MINS", difficulty: "MEDIUM", img: "https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg", popular: false },
    { title: "Avocado Toast with Egg", time: "10 MINS", difficulty: "EASY", img: "https://images.pexels.com/photos/566566/pexels-photo-566566.jpeg", popular: false },
    { title: "Spicy Garlic Shrimp", time: "20 MINS", difficulty: "MEDIUM", img: "https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg", popular: true },
    { title: "Mushroom Risotto", time: "40 MINS", difficulty: "HARD", img: "https://images.pexels.com/photos/5638732/pexels-photo-5638732.jpeg", popular: false },
    { title: "Thai Green Curry", time: "30 MINS", difficulty: "MEDIUM", img: "https://images.pexels.com/photos/674483/pexels-photo-674483.jpeg", popular: false },
    { title: "Berry Smoothie Bowl", time: "5 MINS", difficulty: "EASY", img: "https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg", popular: true },
    { title: "Classic Beef Tacos", time: "25 MINS", difficulty: "EASY", img: "https://images.pexels.com/photos/4958730/pexels-photo-4958730.jpeg", popular: false },
    { title: "Caprese Salad", time: "10 MINS", difficulty: "EASY", img: "https://images.pexels.com/photos/5695914/pexels-photo-5695914.jpeg", popular: false },
  ];

  const handleNext = () => setCurrentPage((prev) => (prev + 1) % 3);
  const handlePrev = () => setCurrentPage((prev) => (prev - 1 + 3) % 3);

  const visibleSet = trendingRecipes.slice(currentPage * 3, (currentPage + 1) * 3);

  return (
    <div className="flex-1 flex flex-col min-h-screen no-scrollbar scroll-smooth overflow-x-hidden">
      {/* Navigation */}
      <header className="flex items-center justify-between px-8 lg:px-12 py-6 sticky top-0 bg-mint-base/80 dark:bg-slate-950/80 backdrop-blur-md z-[100]">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('landing')}>
          <div className="size-10 flex items-center justify-center bg-primary rounded-xl group-hover:rotate-6 transition-transform shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined !text-[24px] text-white font-black">nutrition</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter font-aesthetic">ChefMistri</h1>
        </div>
        <div className="hidden lg:flex items-center gap-10">
          <a href="#features" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Features</a>
          <a href="#stats" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Impact</a>
          <a href="#" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleDarkMode} className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-500 transition-all active:scale-95 shadow-sm border border-slate-100 dark:border-slate-800">
            <span className="material-symbols-outlined !text-[22px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button onClick={() => onNavigate('pantry')} className="hidden sm:block px-6 py-2.5 text-sm font-black text-slate-900 dark:text-white hover:opacity-70 transition-all">Log In</button>
          <button onClick={() => onNavigate('pantry')} className="px-8 py-3 liquid-glass text-white text-[13px] font-black uppercase tracking-wider rounded-xl font-aesthetic">Sign Up Free</button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-8 lg:px-12 pt-16 lg:pt-32 pb-24 lg:pb-48 flex flex-col items-center z-10 text-center">
        <div className="max-w-4xl space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-black text-[10px] uppercase tracking-widest animate-bounce">
            <span className="material-symbols-outlined !text-[14px]">auto_awesome</span> Now with AI-Gourmet engine 2.0
          </div>
          <h2 className="text-6xl lg:text-9xl font-black mb-6 tracking-tighter leading-[0.95] font-aesthetic text-gradient-mix">
            Cook Smarter,<br />Not Harder
          </h2>
          <p className="text-xl lg:text-2xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto font-aesthetic">
            Turn your random ingredients into gourmet masterpieces. Manage your pantry, plan your week, and never ask "what's for dinner" again.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-6 mt-12">
          <button onClick={() => onNavigate('pantry')} className="px-12 py-6 liquid-glass text-white text-xl font-bold rounded-2xl active:scale-95 shadow-2xl">
            Start Cooking Now
          </button>
          <button className="px-12 py-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xl font-bold rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all">
            Watch Demo
          </button>
        </div>
        
        {/* Tilted Card Hero Image */}
        <div className="w-full max-w-6xl relative mt-32 lg:mt-48 group">
           <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full scale-75 group-hover:scale-100 transition-transform duration-1000"></div>
           <TiltedCard 
             imageSrc="https://images.pexels.com/photos/12362926/pexels-photo-12362926.jpeg" 
             containerHeight="650px" 
             rotateAmplitude={8} 
             captionText="AI-Powered Culinary Excellence"
             showTooltip={true}
           />
        </div>
      </section>

      {/* Stats Bar */}
      <section id="stats" className="py-24 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-y border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-12 grid grid-cols-2 lg:grid-cols-4 gap-12">
          {[
            { val: '10k+', label: 'Active Chefs' },
            { val: '50k+', label: 'Recipes Generated' },
            { val: '95%', label: 'Match Accuracy' },
            { val: '30%', label: 'Less Food Waste' }
          ].map((stat, i) => (
            <div key={i} className="text-center space-y-2">
              <h4 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{stat.val}</h4>
              <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 lg:py-48 px-8 lg:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-24 space-y-4">
          <h3 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">Everything you need<br />to master your kitchen.</h3>
          <p className="text-slate-500 font-medium text-lg">Powerful tools designed for the modern home cook.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { icon: 'inventory_2', title: 'Smart Pantry', desc: 'Real-time inventory management. Know what you have, before it expires.', color: 'bg-primary' },
            { icon: 'flare', title: 'AI Recipes', desc: 'The "What can I cook?" engine creates recipes tailored to your current stock.', color: 'bg-orange-500' },
            { icon: 'shopping_basket', title: 'Auto-Grocery', desc: 'Missing an ingredient? Add it to your smart list with one single tap.', color: 'bg-blue-500' }
          ].map((feat, i) => (
            <div key={i} className="group p-12 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all hover:-translate-y-2">
              <div className={`size-16 ${feat.color} rounded-2xl flex items-center justify-center text-white mb-8 group-hover:rotate-6 transition-transform shadow-lg`}>
                <span className="material-symbols-outlined !text-[32px]">{feat.icon}</span>
              </div>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-4">{feat.title}</h4>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Recipes Section - ENHANCED EXPANDING CARDS */}
      <section className="py-32 w-full px-4 lg:px-12 mx-auto overflow-hidden">
        <div className="max-w-[1600px] mx-auto flex justify-between items-end mb-16 px-4">
          <div className="space-y-2">
            <h2 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight">Trending Recipes</h2>
            <p className="text-slate-500 font-medium text-lg">Hand-picked by our AI based on seasonal trends. (Page {currentPage + 1}/3)</p>
          </div>
          <div className="flex gap-4">
            <button onClick={handlePrev} className="size-14 rounded-full bg-[#f97316]/20 text-[#f97316] flex items-center justify-center hover:bg-[#f97316]/30 transition-all active:scale-95">
              <span className="material-symbols-outlined !text-[28px]">chevron_left</span>
            </button>
            <button onClick={handleNext} className="size-14 rounded-full bg-[#f97316] text-white flex items-center justify-center hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-[#f97316]/20">
              <span className="material-symbols-outlined !text-[28px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div key={currentPage} className="flex flex-col lg:flex-row gap-6 min-h-[680px] w-full max-w-[1700px] mx-auto animate-in fade-in slide-in-from-right-8 duration-700 justify-center items-stretch">
          {visibleSet.map((recipe, idx) => {
            const isHovered = hoveredIdx === idx;
            const isAnyHovered = hoveredIdx !== null;
            
            // Layout Logic:
            // When one card is hovered, it expands to flex-8 (~80% of width).
            // Others shrink to flex-1 (~10% each).
            // Total units = 8 + 1 + 1 = 10.
            const flexStyle = isAnyHovered ? (isHovered ? 'lg:flex-[8]' : 'lg:flex-[1]') : 'lg:flex-1';
            
            return (
              <div 
                key={idx} 
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`relative group overflow-hidden rounded-[4rem] bg-slate-100 shadow-2xl cursor-pointer transition-all duration-300 ease-in-out min-h-[400px]
                  ${flexStyle}
                  ${isAnyHovered && !isHovered ? 'opacity-60 scale-[0.95]' : 'opacity-100 scale-100'}
                `}
              >
                <img 
                  src={recipe.img} 
                  alt={recipe.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent"></div>
                
                {recipe.popular && (
                  <div className={`absolute top-10 left-10 transition-all duration-300 ${isAnyHovered && !isHovered ? 'opacity-0' : 'opacity-100'}`}>
                    <span className="px-6 py-2 bg-[#13ec37] text-white font-black text-[11px] rounded-full uppercase tracking-[0.2em] shadow-xl">Popular</span>
                  </div>
                )}
                
                <div className="absolute bottom-12 left-12 right-12 transition-all duration-300">
                  <h3 className={`font-black text-white mb-8 leading-[1.1] tracking-tighter transition-all duration-300 overflow-hidden
                    ${isHovered ? 'text-4xl lg:text-7xl whitespace-normal' : 'text-2xl lg:text-3xl whitespace-nowrap overflow-ellipsis'}
                  `}>
                    {recipe.title}
                  </h3>
                  <div className={`flex items-center gap-8 text-white font-black uppercase tracking-[0.15em] text-[12px] transition-all duration-300
                    ${isAnyHovered && !isHovered ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}
                  `}>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="material-symbols-outlined !text-[20px] text-white/60">schedule</span> {recipe.time}
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="material-symbols-outlined !text-[20px] text-white/60">signal_cellular_alt</span> {recipe.difficulty}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-32 px-12 text-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute -top-1/2 -left-1/4 w-full h-full bg-primary rounded-full blur-[180px]"></div>
        </div>
        <div className="relative z-10 max-w-3xl mx-auto space-y-12">
          <h2 className="text-5xl lg:text-7xl font-black tracking-tighter leading-tight">Ready to transform your cooking?</h2>
          <button onClick={() => onNavigate('pantry')} className="px-14 py-6 liquid-glass text-white text-2xl font-bold rounded-3xl active:scale-95">
            Join the Kitchen
          </button>
          <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">No credit card required • Free forever for individuals</p>
        </div>
      </section>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [pantry, setPantry] = useState<Ingredient[]>([]);
  const [recommendations, setRecommendations] = useState<Recipe[]>(MOCK_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [groceryList, setGroceryList] = useState<ShoppingItem[]>([
    { id: '1', name: 'Fresh Basil', category: 'Produce', completed: false },
    { id: '2', name: 'Almond Milk', category: 'Dairy', completed: true },
  ]);
  const [mealPlan, setMealPlan] = useState<Record<string, Record<string, Recipe | null>>>({});

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleAddIngredient = (name: string) => {
    if (!name.trim()) return;
    const newItem: Ingredient = { 
      id: Date.now().toString(), 
      name: name.trim(), 
      quantity: 1, 
      unit: 'pcs', 
      category: 'Pantry' 
    };
    setPantry(prev => [...prev, newItem]);
    setInputValue('');
  };

  const generateAndSetRecipes = async () => {
    if (pantry.length === 0) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const recs = await generateRecipesFromPantry(pantry.map(p => p.name), INITIAL_PREFERENCES);
      setRecommendations(recs);
      setView('recommendations');
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate recipes. Check your connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  const addGroceryItem = (name: string) => {
    if (!name.trim()) return;
    setGroceryList([...groceryList, { id: Date.now().toString(), name, category: 'General', completed: false }]);
  };

  const renderContent = () => {
    switch (view) {
      case 'landing': return <Landing onNavigate={setView} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      
      case 'pantry': return (
        <div className="p-8 lg:p-12 flex flex-col lg:flex-row gap-12 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex-1 space-y-8">
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Welcome Back!</h2>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[3rem] shadow-2xl flex items-center border border-slate-100 dark:border-slate-800">
               <input className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-bold px-6 dark:text-white" placeholder="Add ingredient..." value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddIngredient(inputValue)} />
               <button onClick={() => handleAddIngredient(inputValue)} className="bg-primary text-white font-black px-10 py-5 rounded-[2rem] hover:bg-primary-hover transition-all active:scale-95">Add to Pantry</button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {COMMON_STAPLES.slice(0, 4).map(staple => (
                <button key={staple.name} onClick={() => handleAddIngredient(staple.name)} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 flex flex-col items-center gap-4 border border-slate-50 dark:border-slate-800 hover:shadow-xl transition-all group">
                  <span className="material-symbols-outlined !text-[32px] group-hover:scale-110 transition-transform" style={{color: staple.color}}>{staple.icon}</span>
                  <span className="font-black dark:text-white">{staple.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-[420px] bg-white dark:bg-slate-900 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="p-10 pb-6 flex justify-between">
               <h3 className="text-2xl font-black dark:text-white">My Pantry</h3>
               <button onClick={() => setPantry([])} className="size-10 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500"><span className="material-symbols-outlined">delete</span></button>
            </div>
            <div className="flex-1 p-10 overflow-y-auto max-h-[400px] no-scrollbar">
              <div className="space-y-4">
                {pantry.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-slate-300 gap-2">
                    <span className="material-symbols-outlined text-5xl">kitchen</span>
                    <p className="font-bold">Your pantry is empty</p>
                  </div>
                ) : pantry.map(item => (
                  <div key={item.id} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl flex justify-between items-center group">
                    <span className="font-black dark:text-white">{item.name}</span>
                    <button onClick={() => setPantry(pantry.filter(p => p.id !== item.id))} className="text-slate-300 hover:text-red-500"><span className="material-symbols-outlined">close</span></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-10 pt-0">
               <button onClick={generateAndSetRecipes} disabled={pantry.length === 0} className="w-full py-6 liquid-glass text-white rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 disabled:opacity-50">
                 <span className="material-symbols-outlined">flare</span> What can I cook?
               </button>
               {errorMsg && <p className="mt-4 text-center text-red-500 font-bold text-sm animate-pulse">{errorMsg}</p>}
            </div>
          </div>
        </div>
      );

      case 'recommendations': return (
        <div className="p-12 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
           <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-12 tracking-tight">Chef's Feed</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 pb-24">
             {recommendations.map(recipe => (
               <div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setView('recipe-details'); }} className="cursor-pointer group bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden border border-slate-100 dark:border-slate-800 hover:shadow-2xl transition-all active:scale-[0.98]">
                 <RecipeImage src={recipe.image} alt={recipe.title} className="aspect-video" />
                 <div className="p-8">
                   <div className="flex justify-between mb-4">
                     <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">{recipe.difficulty}</span>
                     <span className="text-xs font-black text-slate-400">{recipe.matchPercentage}% match</span>
                   </div>
                   <h3 className="text-2xl font-black dark:text-white group-hover:text-primary transition-colors leading-tight">{recipe.title}</h3>
                   <p className="mt-3 text-slate-400 line-clamp-2">{recipe.description}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      );

      case 'cookbook': return (
        <div className="p-12 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Weekly Meal Planner</h2>
              <p className="text-slate-500 font-bold">Plan your delicious week ahead</p>
            </div>
            <button className="px-6 py-3 bg-primary/10 text-primary rounded-xl font-black flex items-center gap-2 hover:bg-primary/20 transition-all">
              <span className="material-symbols-outlined">auto_awesome</span> Smart Populate
            </button>
          </div>
          
          <div className="flex gap-8 overflow-x-auto pb-8 no-scrollbar">
            {DAYS.map(day => (
              <div key={day} className="min-w-[320px] flex flex-col gap-6">
                <div className="flex items-center justify-between px-4">
                   <h3 className="text-xl font-black dark:text-white">{day}</h3>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">3 Meals</span>
                </div>
                <div className="space-y-6">
                  {SLOTS.map(slot => (
                    <div key={slot} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group min-h-[160px] flex flex-col justify-center relative">
                      <span className="absolute top-6 left-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">{slot}</span>
                      <div className="flex flex-col items-center justify-center gap-3 text-slate-300 group-hover:text-primary transition-colors cursor-pointer">
                        <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <span className="material-symbols-outlined">add</span>
                        </div>
                        <p className="text-sm font-black">Plan {slot}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );

      case 'shopping-list': return (
        <div className="p-12 max-w-4xl mx-auto w-full animate-in fade-in duration-500">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Grocery List</h2>
              <p className="text-slate-500 font-bold">{groceryList.filter(i => !i.completed).length} items remaining</p>
            </div>
            <button onClick={() => setGroceryList([])} className="text-red-500 font-black text-sm flex items-center gap-2 hover:opacity-70 transition-all">
              <span className="material-symbols-outlined">clear_all</span> Clear All
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 mb-12 flex items-center">
            <input 
              className="flex-1 bg-transparent border-none focus:ring-0 text-lg font-bold px-6 dark:text-white" 
              placeholder="What else do you need?" 
              onKeyDown={e => {
                if(e.key === 'Enter') {
                  addGroceryItem(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <button className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black px-8 py-4 rounded-[1.8rem] transition-all active:scale-95">Add</button>
          </div>

          <div className="space-y-12">
            {['Produce', 'Dairy', 'Meat', 'General'].map(cat => {
              const items = groceryList.filter(i => i.category === cat || (!i.category && cat === 'General'));
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 ml-4">{cat}</h4>
                  <div className="space-y-3">
                    {items.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => setGroceryList(groceryList.map(i => i.id === item.id ? {...i, completed: !i.completed} : i))}
                        className={`p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-50 dark:border-slate-800 flex items-center gap-5 cursor-pointer transition-all hover:translate-x-1 ${item.completed ? 'opacity-40 grayscale' : ''}`}
                      >
                        <div className={`size-8 rounded-xl border-2 flex items-center justify-center transition-all ${item.completed ? 'bg-primary border-primary text-white' : 'border-slate-100 dark:border-slate-700'}`}>
                          {item.completed && <span className="material-symbols-outlined text-[18px] font-bold">check</span>}
                        </div>
                        <span className={`text-xl font-bold dark:text-white ${item.completed ? 'line-through' : ''}`}>{item.name}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setGroceryList(groceryList.filter(i => i.id !== item.id)); }}
                          className="ml-auto text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

      case 'recipe-details':
        if (!selectedRecipe) return null;
        return (
          <div className="p-12 max-w-5xl mx-auto w-full space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <button onClick={() => setView('recommendations')} className="flex items-center gap-2 font-black text-slate-300 hover:text-primary transition-all uppercase tracking-widest text-sm"><span className="material-symbols-outlined">arrow_back</span> Back to feed</button>
            <h1 className="text-6xl font-black dark:text-white tracking-tighter leading-tight">{selectedRecipe.title}</h1>
            <RecipeImage src={selectedRecipe.image} alt={selectedRecipe.title} className="w-full h-[500px] rounded-[4rem] shadow-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div className="bg-white dark:bg-slate-900 p-12 rounded-[4rem] border border-slate-100 dark:border-slate-800">
                  <h3 className="text-3xl font-black mb-8 dark:text-white">Ingredients</h3>
                  <div className="space-y-6">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between text-xl font-bold dark:text-white">
                        <span>{ing.name}</span>
                        <span className="text-primary">{ing.amount}</span>
                      </div>
                    ))}
                  </div>
               </div>
               <div className="space-y-8">
                 <h3 className="text-3xl font-black dark:text-white">Instructions</h3>
                 <div className="space-y-8">
                    {selectedRecipe.steps.map((step, i) => (
                      <div key={i} className="flex gap-6">
                        <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shrink-0">{i+1}</div>
                        <p className="text-xl font-medium text-slate-600 dark:text-slate-300 leading-relaxed">{step}</p>
                      </div>
                    ))}
                 </div>
               </div>
            </div>
          </div>
        );
      default: return <div className="p-20 text-center font-black text-slate-400">Section under construction</div>;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row transition-colors relative ${isDarkMode ? 'bg-[#0a0f0b]' : 'bg-[#F9FCFA]'}`}>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-50">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/15 rounded-full blur-[140px] animate-blob"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] bg-yellow-500/10 rounded-full blur-[160px] animate-blob [animation-delay:4s]"></div>
      </div>

      {view === 'landing' ? renderContent() : (
        <>
          <Sidebar currentView={view} onNavigate={setView} />
          <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
            <Header onNavigate={setView} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
            <main className="flex-1 overflow-y-auto no-scrollbar relative z-10">
              {renderContent()}
            </main>
          </div>
        </>
      )}

      {isGenerating && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 p-16 rounded-[4rem] flex flex-col items-center gap-10 text-center shadow-2xl">
            <div className="size-24 border-[6px] border-primary/10 border-t-primary rounded-full animate-spin" />
            <div className="space-y-2">
              <h4 className="font-black text-4xl text-slate-900 dark:text-white tracking-tight">Analyzing Flavors...</h4>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Curating 3 gourmet options from your pantry</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
