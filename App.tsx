
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ViewState, 
  Ingredient, 
  Recipe, 
  UserPreferences,
  MealSlot,
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

const UNIT_OPTIONS = ['pcs', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  completed: boolean;
  amount?: string;
}

const TRENDING_SETS = [
  {
    large: { title: "Mediterranean Quinoa Bowl", time: "15 mins", diff: "Easy", img: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=1200" },
    small1: { title: "Zesty Lemon Salmon", time: "25 mins", diff: "Medium", img: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=800" },
    small2: { title: "Avocado Toast with Egg", time: "10 mins", diff: "Easy", img: "https://images.unsplash.com/photo-1525351484163-7529414344d8?q=80&w=800" }
  },
  {
    large: { title: "Spicy Ahi Tuna Poke", time: "20 mins", diff: "Medium", img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1200" },
    small1: { title: "Garlic Butter Shrimp", time: "15 mins", diff: "Easy", img: "https://images.unsplash.com/photo-1559737558-2f5a35f4523b?q=80&w=800" },
    small2: { title: "Wild Mushroom Risotto", time: "35 mins", diff: "Hard", img: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?q=80&w=800" }
  },
  {
    large: { title: "Garden Fresh Pesto Pasta", time: "25 mins", diff: "Easy", img: "https://images.unsplash.com/photo-1473093226795-af9932fe5855?q=80&w=1200" },
    small1: { title: "Honey Glazed Carrots", time: "20 mins", diff: "Easy", img: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=800" },
    small2: { title: "Steak and Asparagus", time: "30 mins", diff: "Medium", img: "https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=800" }
  }
];

const RecipeImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fallback = `https://image.pollinations.ai/prompt/delicious%20${encodeURIComponent(alt)}%20plated%20food?width=800&height=800&model=flux&seed=${alt.length}`;

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [src]);

  return (
    <div className={`relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-10">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      <img 
        src={hasError || !src ? fallback : src} 
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          if (!hasError) {
             setHasError(true);
             setIsLoading(false);
          }
        }}
      />
    </div>
  );
};

const Sidebar: React.FC<{ currentView: ViewState; onNavigate: (view: ViewState) => void }> = ({ currentView, onNavigate }) => (
  <aside className="hidden lg:flex w-72 shrink-0 flex-col h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-8 z-40 transition-colors no-print">
    <div className="flex items-center gap-3 mb-12 px-2 cursor-pointer group" onClick={() => onNavigate('landing')}>
      <div className="size-10 flex items-center justify-center bg-primary rounded-2xl group-hover:rotate-6 transition-transform shadow-lg shadow-primary/20">
        <span className="material-symbols-outlined !text-[24px] text-white font-black">nutrition</span>
      </div>
      <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white font-aesthetic">ChefMistri</h2>
    </div>

    <div className="flex flex-col gap-2">
      <p className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-4 mb-3">Explore</p>
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
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
          <span className="text-base">{item.label}</span>
        </button>
      ))}
    </div>

    <div className="mt-auto">
      <div className="bg-primary/5 dark:bg-primary/10 rounded-[2.5rem] p-6 border border-primary/10">
        <h4 className="font-black text-slate-900 dark:text-white text-base mb-1">Go Premium</h4>
        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-5 font-medium">Unlock AI nutrition tracking and smart meal scaling.</p>
        <button className="w-full py-3 bg-primary text-white text-sm font-black rounded-2xl hover:bg-primary-hover transition-all active:scale-95 shadow-lg shadow-primary/20">
          Upgrade Now
        </button>
      </div>
    </div>
  </aside>
);

const BottomNav: React.FC<{ currentView: ViewState; onNavigate: (view: ViewState) => void }> = ({ currentView, onNavigate }) => (
  <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 px-2 py-3 pb-8 lg:pb-3 z-50 flex justify-around items-center no-print">
    {[
      { id: 'pantry', label: 'Pantry', icon: 'inventory_2' },
      { id: 'recommendations', label: 'Feed', icon: 'restaurant' },
      { id: 'cookbook', label: 'Planner', icon: 'calendar_today' },
      { id: 'shopping-list', label: 'List', icon: 'shopping_basket' }
    ].map((item) => (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id as ViewState)}
        className={`flex flex-col items-center gap-1.5 px-4 py-1.5 rounded-2xl transition-all relative ${
          currentView === item.id ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        {currentView === item.id && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></span>
        )}
        <span className={`material-symbols-outlined text-[24px] ${currentView === item.id ? 'fill-1' : ''}`}>{item.icon}</span>
        <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
      </button>
    ))}
  </nav>
);

const Header: React.FC<{ 
  onNavigate: (view: ViewState) => void; 
  onSearch: (val: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}> = ({ onNavigate, onSearch, isDarkMode, toggleDarkMode }) => (
  <header className="h-16 md:h-20 lg:h-24 flex items-center justify-between px-4 md:px-8 lg:px-12 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-50 dark:border-slate-800 w-full shrink-0 z-30 transition-colors no-print sticky top-0">
    <div className="flex-1 flex items-center gap-4 max-w-[240px] md:max-w-md">
      <div className="lg:hidden flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
        <div className="size-9 flex items-center justify-center bg-primary rounded-xl shadow-md shadow-primary/20">
          <span className="material-symbols-outlined !text-[18px] text-white font-black">nutrition</span>
        </div>
      </div>
      <div className="relative group flex-1">
        <span className="material-symbols-outlined absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[20px] group-focus-within:text-primary transition-colors">search</span>
        <input 
          type="text" 
          placeholder="Search recipes..." 
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('recommendations')}
          className="w-full pl-10 md:pl-12 pr-4 py-2.5 bg-slate-100/50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 dark:text-white transition-all placeholder:text-slate-400"
        />
      </div>
    </div>

    <div className="flex items-center gap-3 md:gap-6">
      <button 
        onClick={toggleDarkMode}
        className="size-10 md:size-12 flex items-center justify-center rounded-2xl bg-slate-100/50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 icon-button"
      >
        <span className="material-symbols-outlined text-[20px] md:text-[24px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
      </button>
      <div className="hidden sm:flex items-center gap-3">
        <button className="text-sm font-black text-slate-900 dark:text-slate-300 hover:text-primary transition-colors px-4">Log In</button>
        <button 
          onClick={() => onNavigate('pantry')}
          className="bg-primary text-white text-sm font-black px-8 py-3 rounded-2xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 active:scale-95"
        >
          Sign Up
        </button>
      </div>
    </div>
  </header>
);

const Landing: React.FC<{ 
  onNavigate: (view: ViewState) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}> = ({ onNavigate, isDarkMode, toggleDarkMode }) => {
  const [trendingIndex, setTrendingIndex] = useState(0);

  const nextTrending = () => setTrendingIndex((prev) => (prev + 1) % TRENDING_SETS.length);
  const prevTrending = () => setTrendingIndex((prev) => (prev - 1 + TRENDING_SETS.length) % TRENDING_SETS.length);

  const currentSet = TRENDING_SETS[trendingIndex];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white dark:bg-slate-950 overflow-y-auto no-scrollbar scroll-smooth">
      {/* Landing Header */}
      <header className="flex items-center justify-between px-4 sm:px-12 py-6 sticky top-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-[60]">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('landing')}>
          <div className="size-10 flex items-center justify-center bg-primary rounded-xl group-hover:rotate-6 transition-transform shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined !text-[24px] text-white font-black">nutrition</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter font-aesthetic">ChefMistri</h1>
        </div>
        
        <nav className="hidden lg:flex items-center gap-12 font-aesthetic">
          {['Features', 'Recipes', 'Pricing'].map(link => (
            <button key={link} className="text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-600 dark:text-slate-400 hover:text-primary transition-all duration-300">{link}</button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button onClick={toggleDarkMode} className="size-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 transition-all active:scale-95 icon-button yellow-glow-button">
            <span className="material-symbols-outlined !text-[24px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button onClick={() => onNavigate('pantry')} className="hidden sm:block text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300 hover:text-primary transition-colors px-4 font-aesthetic">Login</button>
          <button onClick={() => onNavigate('pantry')} className="px-8 py-3 bg-primary text-white text-[13px] font-black uppercase tracking-wider rounded-xl hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 active:scale-95 font-aesthetic">Sign Up</button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-12 pt-16 pb-12 lg:pb-32 flex flex-col items-center">
        <div className="mb-8">
           <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20 font-aesthetic">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              The future of kitchens
           </span>
        </div>
        
        <div className="text-center max-w-4xl mb-12">
          <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter leading-[1.05] font-aesthetic">
             Cook Smarter, <br/>
             <span className="text-primary">Not Harder</span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto font-aesthetic">
            Turn your pantry into delicious meals with AI-powered recipe discovery and precision kitchen management.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-16 sm:mb-24 font-aesthetic z-20 relative">
          <button onClick={() => onNavigate('pantry')} className="w-full sm:w-auto px-10 py-5 bg-primary text-white text-lg font-bold rounded-2xl hover:bg-primary-hover transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-95 group">
            Get Started Free
            <span className="material-symbols-outlined !text-[20px] transition-transform group-hover:translate-x-1">arrow_forward</span>
          </button>
          <button className="w-full sm:w-auto px-10 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-100 dark:border-slate-800 text-lg font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 group">
            <span className="material-symbols-outlined !text-[28px] text-slate-400 group-hover:text-primary transition-colors">play_circle</span>
            Watch Demo
          </button>
        </div>

        {/* Hero Card Container - Fixed to prevent collapse */}
        <div className="w-full max-w-6xl relative group mt-0 lg:-mt-20 px-4 z-10 min-h-[300px] md:min-h-[500px]">
           <div className="absolute inset-0 bg-primary/10 blur-[120px] rounded-full scale-75 translate-y-20 opacity-40"></div>
           <TiltedCard
              imageSrc="https://images.unsplash.com/photo-1626700051175-6818013e1d4f?q=80&w=1200"
              altText="Gourmet Takeout Feast"
              captionText="The Ultimate Platter"
              containerHeight="100%"
              containerWidth="100%"
              imageHeight="600px" // Explicit height to prevent collapse
              imageWidth="100%"
              rotateAmplitude={6}
              scaleOnHover={1.02}
              showMobileWarning={false}
              showTooltip={false}
              displayOverlayContent
              overlayContent={
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-[3rem] pointer-events-none"></div>
              }
           />
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 sm:px-12 pt-24 pb-32 lg:py-32 max-w-7xl mx-auto w-full">
        <div className="text-center mb-24">
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 font-aesthetic">Effortless Kitchen Management</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto font-aesthetic">Our smart tools help you save time, reduce food waste, and make grocery shopping a breeze.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {[
            { title: 'Pantry Tracking', icon: 'inventory_2', color: 'text-emerald-500 bg-emerald-50', desc: 'Never let ingredients go to waste. Track what you have in real-time with smart notifications and expiration alerts.' },
            { title: 'Smart Meal Planning', icon: 'calendar_month', color: 'text-primary bg-primary/5', desc: 'Personalized weekly menus generated by AI based on your taste profile, dietary goals, and current inventory.' },
            { title: 'Automated Lists', icon: 'shopping_cart', color: 'text-sky-500 bg-sky-50', desc: 'Shop faster with intelligent lists synced automatically from your meal plan and current pantry needs.' }
          ].map((feature, i) => (
            <div key={i} className="bg-white dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-50 dark:border-slate-800 transition-all hover:shadow-2xl hover:-translate-y-2 group">
              <div className={`size-16 rounded-2xl flex items-center justify-center mb-8 ${feature.color} group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined !text-[36px]">{feature.icon}</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight font-aesthetic">{feature.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-aesthetic">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Recipes */}
      <section className="px-4 sm:px-12 py-32 bg-slate-50/30 dark:bg-slate-900/10">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex items-end justify-between mb-16">
            <div>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 font-aesthetic">Trending Recipes</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg font-aesthetic">Hand-picked by our AI based on seasonal trends.</p>
            </div>
            <div className="flex gap-4">
              <button onClick={prevTrending} className="size-12 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-90 bg-white dark:bg-slate-950">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button onClick={nextTrending} className="size-12 rounded-full border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-primary transition-all active:scale-90 bg-white dark:bg-slate-950">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <TiltedCard
                key={`large-${trendingIndex}`}
                imageSrc={currentSet.large.img}
                altText={currentSet.large.title}
                captionText={currentSet.large.title}
                containerHeight="600px"
                containerWidth="100%"
                imageHeight="600px"
                imageWidth="100%"
                rotateAmplitude={8}
                scaleOnHover={1.02}
                showMobileWarning={false}
                showTooltip={false}
                displayOverlayContent
                overlayContent={
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-12 rounded-[3rem]">
                    <div className="absolute top-8 left-8">
                       <span className="px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-lg font-aesthetic">Popular</span>
                    </div>
                    <h3 className="text-4xl font-black text-white mb-4 tracking-tight font-aesthetic">{currentSet.large.title}</h3>
                    <div className="flex items-center gap-6 text-white/70 text-sm font-bold uppercase tracking-widest font-aesthetic">
                      <span className="flex items-center gap-2"><span className="material-symbols-outlined !text-[20px]">timer</span> {currentSet.large.time}</span>
                      <span className="flex items-center gap-2"><span className="material-symbols-outlined !text-[20px]">bar_chart</span> {currentSet.large.diff}</span>
                    </div>
                  </div>
                }
              />
            </div>

            <div className="flex flex-col gap-8">
              <TiltedCard
                key={`small1-${trendingIndex}`}
                imageSrc={currentSet.small1.img}
                altText={currentSet.small1.title}
                captionText={currentSet.small1.title}
                containerHeight="284px"
                containerWidth="100%"
                imageHeight="284px"
                imageWidth="100%"
                rotateAmplitude={12}
                scaleOnHover={1.05}
                showMobileWarning={false}
                showTooltip={false}
                displayOverlayContent
                overlayContent={
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-8 rounded-[2.5rem]">
                    <h4 className="text-xl font-black text-white mb-2 tracking-tight font-aesthetic">{currentSet.small1.title}</h4>
                    <div className="flex items-center gap-4 text-white/60 text-[10px] font-black uppercase tracking-widest font-aesthetic">
                      <span className="flex items-center gap-1.5"><span className="material-symbols-outlined !text-[16px]">timer</span> {currentSet.small1.time}</span>
                      <span className="flex items-center gap-1.5"><span className="material-symbols-outlined !text-[16px]">bar_chart</span> {currentSet.small1.diff}</span>
                    </div>
                  </div>
                }
              />
              <TiltedCard
                key={`small2-${trendingIndex}`}
                imageSrc={currentSet.small2.img}
                altText={currentSet.small2.title}
                captionText={currentSet.small2.title}
                containerHeight="284px"
                containerWidth="100%"
                imageHeight="284px"
                imageWidth="100%"
                rotateAmplitude={12}
                scaleOnHover={1.05}
                showMobileWarning={false}
                showTooltip={false}
                displayOverlayContent
                overlayContent={
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-8 rounded-[2.5rem]">
                    <h4 className="text-xl font-black text-white mb-2 tracking-tight font-aesthetic">{currentSet.small2.title}</h4>
                    <div className="flex items-center gap-4 text-white/60 text-[10px] font-black uppercase tracking-widest font-aesthetic">
                      <span className="flex items-center gap-1.5"><span className="material-symbols-outlined !text-[16px]">timer</span> {currentSet.small2.time}</span>
                      <span className="flex items-center gap-1.5"><span className="material-symbols-outlined !text-[16px]">bar_chart</span> {currentSet.small2.diff}</span>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 sm:px-12 py-24 bg-white dark:bg-slate-950 border-t border-slate-50 dark:border-slate-900">
        <div className="max-w-7xl mx-auto w-full flex flex-col items-center">
          <div className="flex items-center gap-3 mb-16 group cursor-pointer" onClick={() => onNavigate('landing')}>
            <div className="size-12 flex items-center justify-center bg-primary rounded-2xl shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined !text-[28px] text-white font-black">nutrition</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-aesthetic">ChefMistri</h2>
          </div>

          <div className="flex flex-wrap justify-center gap-12 mb-16">
            {['ABOUT US', 'CONTACT', 'PRIVACY POLICY', 'TERMS OF SERVICE'].map(link => (
              <button key={link} className="text-[11px] font-black text-slate-400 hover:text-primary transition-colors tracking-[0.2em] font-aesthetic">{link}</button>
            ))}
          </div>

          <div className="flex gap-4 mb-16">
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="size-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-primary transition-all">
                <iconify-icon icon="ri:twitter-x-fill" width="18"></iconify-icon>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="size-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-primary transition-all">
                <iconify-icon icon="ri:youtube-fill" width="20"></iconify-icon>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="size-10 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-primary transition-all">
                <iconify-icon icon="ri:meta-fill" width="20"></iconify-icon>
              </a>
          </div>

          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] text-center font-aesthetic">© 2026 CHEFMISTRI INC. ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [pantry, setPantry] = useState<Ingredient[]>([]);
  const [recommendations, setRecommendations] = useState<Recipe[]>(MOCK_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [preferences] = useState<UserPreferences>(INITIAL_PREFERENCES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputQuantity, setInputQuantity] = useState<string>('1');
  const [inputUnit, setInputUnit] = useState<string>('pcs');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAllStaples, setShowAllStaples] = useState(false);

  const [weeks, setWeeks] = useState<number[]>([0]);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const horizontalScrollRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([
    { id: '1', name: 'Roma Tomatoes', category: 'Produce', completed: false, amount: '4 large' },
    { id: '2', name: 'Red Bell Peppers', category: 'Produce', completed: true, amount: '3' },
    { id: '3', name: 'Greek Yogurt', category: 'Dairy & Eggs', completed: false, amount: '500g' },
    { id: '4', name: 'Chicken Breast', category: 'Meat', completed: false, amount: '1kg' },
    { id: '5', name: 'Basmati Rice', category: 'Pantry', completed: false, amount: '2kg' },
    { id: '6', name: 'Organic Honey', category: 'Pantry', completed: true, amount: '1 jar' }
  ]);
  const [groceryInput, setGroceryInput] = useState('');

  const [mealPlan, setMealPlan] = useState<Record<string, Record<MealSlot, { title: string; calories?: string; image?: string } | null>>>({
    'MON 23': { Breakfast: null, Lunch: MOCK_RECIPES[0], Dinner: MOCK_RECIPES[1] }
  });

  const SAVED_RECIPES_MOCK: Recipe[] = useMemo(() => [
    { ...MOCK_RECIPES[0], id: 's1', title: 'Avocado Toast', cookTime: '15 mins', calories: '320 kcal' },
    { ...MOCK_RECIPES[1], id: 's2', title: 'Lentil Burger', cookTime: '25 mins', calories: '410 kcal' },
    { ...MOCK_RECIPES[0], id: 's3', title: 'Pesto Pasta', cookTime: '20 mins', calories: '480 kcal' },
    { ...MOCK_RECIPES[1], id: 's4', title: 'Tuna Poke Bowl', cookTime: '15 mins', calories: '380 kcal' },
    { ...MOCK_RECIPES[0], id: 's5', title: 'Veggie Ramen', cookTime: '30 mins', calories: '420 kcal' }
  ], []);

  const filteredRecommendations = useMemo(() => {
    if (!searchQuery) return recommendations;
    return recommendations.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, recommendations]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const addMealToPlan = (day: string, slot: MealSlot, specificRecipe?: Recipe) => {
    const mealToAdd = specificRecipe || SAVED_RECIPES_MOCK[Math.floor(Math.random() * SAVED_RECIPES_MOCK.length)];
    setMealPlan(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [slot]: { title: mealToAdd.title, calories: mealToAdd.calories, image: mealToAdd.image }
      }
    }));
  };

  const clearDayPlan = (day: string) => {
    setMealPlan(prev => ({
      ...prev,
      [day]: { Breakfast: null, Lunch: null, Dinner: null }
    }));
  };

  const shuffleDayPlan = (day: string, mode: 'balanced' | 'high-protein' | 'light' = 'balanced') => {
    const filtered = mode === 'high-protein' 
      ? SAVED_RECIPES_MOCK.filter(r => parseInt(r.calories || '0') > 400)
      : mode === 'light' 
        ? SAVED_RECIPES_MOCK.filter(r => parseInt(r.calories || '0') < 400)
        : SAVED_RECIPES_MOCK;

    const source = filtered.length > 0 ? filtered : SAVED_RECIPES_MOCK;

    setMealPlan(prev => ({
      ...prev,
      [day]: {
        Breakfast: { title: source[Math.floor(Math.random() * source.length)].title, calories: '350 kcal' },
        Lunch: { title: source[Math.floor(Math.random() * source.length)].title, calories: '520 kcal' },
        Dinner: { title: source[Math.floor(Math.random() * source.length)].title, calories: '480 kcal' }
      }
    }));
  };

  const getDaysForWeek = (weekOffset: number) => {
    const days = [];
    const baseDate = new Date();
    const day = baseDate.getDay();
    const diff = baseDate.getDate() - day + (day === 0 ? -6 : 1) + (weekOffset * 7);
    const monday = new Date(baseDate.setDate(diff));

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const num = d.getDate();
      days.push(`${label} ${num}`);
    }
    return days;
  };

  useEffect(() => {
    if (view !== 'cookbook') return;
    const options = { threshold: 0.1 };
    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target === topSentinelRef.current) {
            setWeeks(prev => [Math.min(...prev) - 1, ...prev]);
          } else if (entry.target === bottomSentinelRef.current) {
            setWeeks(prev => [...prev, Math.max(...prev) + 1]);
          }
        }
      });
    };
    const observer = new IntersectionObserver(handleObserver, options);
    if (topSentinelRef.current) observer.observe(topSentinelRef.current);
    if (bottomSentinelRef.current) observer.observe(bottomSentinelRef.current);
    return () => observer.disconnect();
  }, [view]);

  const handleScrollWeek = (week: number, direction: 'left' | 'right') => {
    const container = horizontalScrollRefs.current[week];
    if (container) {
      const scrollAmount = 340 + 32;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleAddIngredient = (name: string, qty?: number | string, unit?: string) => {
    const finalName = name.trim();
    if (!finalName) return;
    const exists = pantry.find(p => p.name.toLowerCase() === finalName.toLowerCase());
    if (exists) return;
    const quantityValue = Number(qty ?? inputQuantity) || 1;
    const newItem: Ingredient = { 
      id: Date.now().toString(), 
      name: finalName, 
      quantity: quantityValue, 
      unit: unit ?? inputUnit, 
      category: 'Pantry' 
    };
    setPantry(prev => [...prev, newItem]);
    setInputValue('');
    setInputQuantity('1');
    setInputUnit('pcs');
  };

  const handleAddGrocery = () => {
    if (!groceryInput.trim()) return;
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: groceryInput.trim(),
      category: 'Others',
      completed: false,
    };
    setShoppingList(prev => [newItem, ...prev]);
    setGroceryInput('');
  };

  const toggleGrocery = (id: string) => {
    setShoppingList(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteGrocery = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const clearCompletedGroceries = () => {
    setShoppingList(prev => prev.filter(item => !item.completed));
  };

  const generateAndSetRecipes = async () => {
    if (pantry.length === 0) return;
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const recs = await generateRecipesFromPantry(pantry.map(p => p.name), preferences);
      setRecommendations(recs);
      setView('recommendations');
    } catch (err: any) {
      setErrorMsg(err.message || "Gemini API error. Please verify your environment keys.");
      setView('recommendations');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'landing':
        return <Landing onNavigate={setView} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      case 'pantry':
        return (
          <div className="flex flex-col lg:flex-row flex-1 p-4 md:p-8 lg:p-12 gap-8 md:gap-12">
            <div className="flex-1 flex flex-col gap-8 md:gap-12">
              <div className="flex flex-col gap-4">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">Welcome Back!</h2>
                <p className="text-slate-500 font-bold">Add ingredients to your pantry to get started.</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/50 dark:shadow-none p-3 md:p-4 flex flex-col md:flex-row items-center border border-slate-100 dark:border-slate-800 transition-colors focus-within:ring-4 focus-within:ring-primary/10">
                <div className="flex-[2] flex items-center">
                  <div className="pl-4 md:pl-6 text-slate-300">
                    <span className="material-symbols-outlined !text-[24px]">add_circle</span>
                  </div>
                  <input 
                    className="flex-1 border-none focus:ring-0 text-lg md:text-xl font-black px-4 md:px-6 text-slate-900 dark:text-white dark:bg-transparent placeholder:text-slate-300" 
                    placeholder="Search or add..." 
                    value={inputValue} 
                    onChange={(e) => setInputValue(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient(inputValue)} 
                  />
                </div>
                
                <div className="hidden md:block h-10 w-px bg-slate-100 dark:bg-slate-800 mx-4" />

                <div className="flex w-full md:w-auto items-center justify-between md:justify-start px-4 py-4 md:py-0 border-t md:border-t-0 border-slate-50 dark:border-slate-800 gap-4 md:gap-8">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">Quantity</span>
                    <input 
                      type="number"
                      className="w-12 md:w-16 border-none focus:ring-0 text-lg md:text-xl font-black text-primary bg-transparent text-center p-0"
                      value={inputQuantity}
                      onChange={(e) => setInputQuantity(e.target.value)}
                    />
                  </div>

                  <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 hidden md:block" />

                  <div className="relative">
                    <div className="h-9 px-3 flex items-center gap-1 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group/unit transition-all hover:border-primary/20">
                      <select 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        value={inputUnit}
                        onChange={(e) => setInputUnit(e.target.value)}
                      >
                        {UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                      </select>
                      <div className="flex items-center gap-1 pointer-events-none">
                        <span className="text-sm md:text-base font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest leading-[1.25]">
                          {inputUnit}
                        </span>
                        <span className="material-symbols-outlined !text-[18px] text-slate-400 group-hover/unit:text-primary transition-colors translate-y-[1px]">expand_more</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleAddIngredient(inputValue)} 
                  className="w-full md:w-auto bg-primary text-white font-black px-8 md:px-14 py-4 md:py-6 rounded-[1.8rem] md:rounded-[2rem] flex items-center justify-center gap-3 hover:bg-primary-hover transition-all active:scale-95 shadow-xl shadow-primary/30 shrink-0 md:ml-4"
                >
                  <span className="material-symbols-outlined text-[20px] md:text-[24px]">auto_awesome</span>
                  <span className="text-base md:text-lg">Add to Pantry</span>
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Quick Add Staples</h3>
                  <button 
                    type="button"
                    onClick={() => setShowAllStaples(!showAllStaples)}
                    className="text-primary font-black text-sm hover:underline cursor-pointer transition-colors"
                  >
                    {showAllStaples ? 'Show Less' : 'See All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
                  {(showAllStaples ? COMMON_STAPLES : COMMON_STAPLES.slice(0, 4)).map((staple) => (
                    <button key={staple.name} onClick={() => handleAddIngredient(staple.name, 1, 'pcs')} className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 flex flex-col items-center gap-4 md:gap-6 border border-slate-50 dark:border-slate-800 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-primary/5 transition-all group active:scale-95">
                      <div className="size-12 md:size-16 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12" style={{ backgroundColor: `${staple.color === 'orange' ? '#ff9800' : staple.color === 'blue' ? '#2196f3' : staple.color === 'red' ? '#f44336' : staple.color === 'yellow' ? '#ffeb3b' : staple.color === 'purple' ? '#9c27b0' : '#9e9e9e'}15` }}>
                        <span className="material-symbols-outlined text-[24px] md:text-[32px]" style={{color: staple.color}}>{staple.icon}</span>
                      </div>
                      <span className="font-black text-sm md:text-base text-slate-900 dark:text-white">{staple.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[420px] shrink-0 mb-24 lg:mb-0">
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col h-full min-h-[500px] overflow-hidden transition-colors">
                <div className="p-8 md:p-10 pb-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">My Pantry</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="size-2 bg-primary rounded-full animate-pulse"></span>
                      <p className="text-slate-400 dark:text-slate-500 text-[11px] font-black uppercase tracking-[0.2em]">{pantry.length} Active Items</p>
                    </div>
                  </div>
                  <button onClick={() => setPantry([])} className="size-10 md:size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90 icon-button">
                    <span className="material-symbols-outlined text-[20px] md:text-[24px]">delete</span>
                  </button>
                </div>

                <div className="p-8 md:p-10 flex-1 overflow-y-auto custom-scrollbar">
                  <div className="flex flex-col gap-4">
                    {pantry.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 md:p-5 bg-slate-50 dark:bg-slate-800/50 rounded-3xl group border border-transparent hover:border-primary/10 transition-all">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-4">
                            <div className="size-8 md:size-10 rounded-xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm">
                              <span className="material-symbols-outlined text-[18px] md:text-[22px] text-slate-400">inventory_2</span>
                            </div>
                            <span className="font-black text-base md:text-lg text-slate-800 dark:text-slate-200">{item.name}</span>
                          </div>
                          <div className="ml-12 md:ml-14 mt-1.5 flex items-center gap-2">
                            <span className="text-[10px] md:text-[11px] font-black text-primary uppercase tracking-[0.1em]">{item.quantity} {item.unit}</span>
                            <span className="text-[10px] text-slate-300 font-bold">• Fresh</span>
                          </div>
                        </div>
                        <button onClick={() => setPantry(pantry.filter(p => p.id !== item.id))} className="text-slate-300 hover:text-red-500 transition-all p-2 rounded-xl hover:bg-white active:scale-90 icon-button">
                          <span className="material-symbols-outlined text-[20px] md:text-[24px]">close</span>
                        </button>
                      </div>
                    ))}
                    {pantry.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 opacity-20 dark:invert">
                        <span className="material-symbols-outlined text-[64px] md:text-[80px] mb-6">shopping_basket</span>
                        <p className="font-black italic text-lg md:text-xl text-center">Pantry is empty.<br/><span className="text-sm font-bold opacity-60">Add some flavor!</span></p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-8 md:p-10 bg-slate-50/50 dark:bg-slate-800/10 border-t border-slate-50 dark:border-slate-800">
                  <button 
                    disabled={pantry.length === 0} 
                    onClick={generateAndSetRecipes} 
                    className="w-full py-5 md:py-6 bg-primary text-white rounded-[1.8rem] md:rounded-[2.2rem] font-black text-lg md:text-xl shadow-2xl shadow-primary/30 disabled:opacity-50 hover:bg-primary-hover transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    <span className="material-symbols-outlined font-black text-[24px] md:text-[28px]">flare</span>
                    What can I cook?
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'cookbook':
        return (
          <div className="flex flex-col flex-1 h-screen overflow-y-auto overflow-x-hidden no-scrollbar pb-32">
            <div className="p-4 md:p-8 lg:p-12 flex flex-col gap-10 md:gap-14">
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 max-w-[1084px] mx-auto w-full">
                <div>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-4 animate-bounce">
                    <span className="material-symbols-outlined text-[14px]">bolt</span>
                    Daily Insight: Plan high protein lunches for active days
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter leading-none">Meal Planner</h1>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-base md:text-xl max-w-2xl">Visualizing your kitchen workflow. Tap slots to assign or use shuffle modes for quick ideas.</p>
                </div>
                
                <div className="flex flex-wrap gap-4 no-print">
                  <button 
                    onClick={() => setView('recommendations')}
                    className="flex-1 sm:flex-none px-8 py-4 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 hover:bg-slate-50 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[20px]">explore</span>
                    Browse Feed
                  </button>
                  <button 
                    onClick={() => setView('shopping-list')}
                    className="flex-1 sm:flex-none px-10 py-5 bg-primary text-white rounded-[1.5rem] font-black text-base shadow-2xl shadow-primary/25 hover:bg-primary-hover transition-all active:scale-95 flex items-center justify-center gap-4"
                  >
                    <span className="material-symbols-outlined text-[24px]">shopping_cart_checkout</span>
                    Export Groceries
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-16">
                <div ref={topSentinelRef} className="h-1 opacity-0" />
                
                {weeks.sort((a,b) => a - b).map((weekOffset) => {
                  const weekDays = getDaysForWeek(weekOffset);
                  return (
                    <div key={weekOffset} className="relative group max-w-[1084px] mx-auto w-full">
                      <div className="flex items-center justify-between mb-8 px-4">
                        <h2 className="text-xl font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                          {weekOffset === 0 ? "Current Week" : weekOffset === 1 ? "Next Week" : weekOffset === -1 ? "Last Week" : `Week Offset: ${weekOffset}`}
                        </h2>
                      </div>

                      <button 
                        onClick={() => handleScrollWeek(weekOffset, 'left')}
                        className="absolute left-[-16px] top-[50%] -translate-y-[50%] size-11 rounded-full bg-slate-900/80 dark:bg-white/80 backdrop-blur-md text-white dark:text-slate-900 flex items-center justify-center z-20 shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90 planner-arrow left icon-button"
                      >
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <button 
                        onClick={() => handleScrollWeek(weekOffset, 'right')}
                        className="absolute right-[-16px] top-[50%] -translate-y-[50%] size-11 rounded-full bg-slate-900/80 dark:bg-white/80 backdrop-blur-md text-white dark:text-slate-900 flex items-center justify-center z-20 shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90 planner-arrow right icon-button"
                      >
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>

                      <div 
                        ref={el => { horizontalScrollRefs.current[weekOffset] = el; }}
                        className="flex-1 overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth snap-x snap-mandatory flex gap-8 px-4 min-h-[750px] md:min-h-[1050px]"
                      >
                        {weekDays.map((dayKey) => {
                          const dayMeals = mealPlan[dayKey] || { Breakfast: null, Lunch: null, Dinner: null };
                          const totalCals: number = Object.values(dayMeals).reduce((acc: number, m) => {
                            const meal = m as { calories?: string } | null;
                            return acc + (meal?.calories ? parseInt(meal.calories) : 0);
                          }, 0) as number;
                          
                          const isToday = dayKey.includes(new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()) && weekOffset === 0;
                          const macroType = totalCals > 1500 ? 'Active Day' : totalCals > 1000 ? 'Balanced' : 'Light';

                          return (
                            <div key={dayKey} className={`w-[340px] shrink-0 snap-start flex flex-col h-full bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[4rem] md:rounded-[5rem] border-2 transition-all ${isToday ? 'border-primary shadow-2xl shadow-primary/5' : 'border-slate-50 dark:border-slate-800 shadow-sm'}`}>
                              <div className="flex items-start justify-between mb-12 border-b border-slate-50 dark:border-slate-800 pb-8">
                                <div>
                                  <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] mb-1 block">{dayKey.split(' ')[0]}</span>
                                  <div className="flex items-center gap-3">
                                    <h3 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white leading-none tracking-tighter">{dayKey.split(' ')[1]}</h3>
                                    {isToday && <span className="bg-primary/20 text-primary text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Today</span>}
                                  </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                  <div className="flex gap-2 no-print">
                                    <button onClick={() => shuffleDayPlan(dayKey, 'balanced')} className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-primary transition-all icon-button" title="Shuffle Balanced">
                                      <span className="material-symbols-outlined text-[18px]">shuffle</span>
                                    </button>
                                    <button onClick={() => clearDayPlan(dayKey)} className="size-9 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all icon-button" title="Reset Day">
                                      <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                                    </button>
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-[12px] font-black uppercase tracking-widest block ${(totalCals as number) > 0 ? 'text-primary' : 'text-slate-300'}`}>
                                      {totalCals || '0'} kcal
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{macroType}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex-1 flex flex-col gap-8">
                                {(['Breakfast', 'Lunch', 'Dinner'] as MealSlot[]).map((slot) => {
                                  const meal = dayMeals[slot];
                                  return (
                                    <div key={slot} className="flex-1 flex flex-col group/slot">
                                      <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] mb-3 px-1">{slot}</span>
                                      {meal ? (
                                        <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-7 md:p-8 relative overflow-hidden flex items-center gap-6 group hover:shadow-xl hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-primary/20 transition-all active:scale-[0.98]">
                                          {meal.image && (
                                            <RecipeImage src={meal.image} alt={meal.title} className="size-16 md:size-24 rounded-2xl shrink-0" />
                                          )}
                                          <div className="flex-1">
                                            <h4 className="font-black text-slate-900 dark:text-white text-base md:text-xl leading-tight mb-2 pr-6 line-clamp-1">{meal.title}</h4>
                                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800 uppercase tracking-widest">{meal.calories}</span>
                                          </div>
                                          <button 
                                            onClick={() => setMealPlan(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], [slot]: null } }))}
                                            className="absolute top-5 right-5 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 p-1 no-print icon-button"
                                          >
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                          </button>
                                        </div>
                                      ) : (
                                        <button 
                                          onClick={() => addMealToPlan(dayKey, slot)}
                                          className="flex-1 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 group hover:border-primary/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all active:scale-[0.98] py-10 relative no-print overflow-hidden"
                                        >
                                          <div className="flex items-center gap-3">
                                             <span className="material-symbols-outlined text-[24px] text-slate-200 group-hover:text-primary transition-colors">add_circle</span>
                                             <span className="text-[12px] font-black text-slate-300 group-hover:text-primary transition-colors uppercase tracking-widest">Add {slot}</span>
                                          </div>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div ref={bottomSentinelRef} className="h-20 flex items-center justify-center opacity-30 italic font-black text-slate-400">
                  Crafting the future...
                </div>
              </div>

              <div className="max-w-[1084px] mx-auto w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[2.5rem] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl transition-all">
                 <div className="flex flex-col gap-3">
                    <h3 className="text-2xl md:text-4xl font-black tracking-tighter leading-none">Balanced Week Ahead</h3>
                    <p className="text-slate-400 dark:text-slate-500 font-bold text-sm md:text-lg max-w-lg">Your current plan maintains a healthy balance between complex carbs and proteins. Your pantry is 85% ready.</p>
                 </div>
                 <div className="flex gap-6 md:gap-10 shrink-0">
                    <div className="flex flex-col items-center">
                       <span className="text-primary text-3xl md:text-5xl font-black tracking-tighter">18</span>
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Meals Planned</span>
                    </div>
                    <div className="h-12 md:h-16 w-px bg-white/10 dark:bg-slate-200"></div>
                    <div className="flex flex-col items-center">
                       <span className="text-sky-400 text-3xl md:text-5xl font-black tracking-tighter">92%</span>
                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Fiber Target</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        );

      case 'shopping-list':
        const categories = Array.from(new Set(shoppingList.map(item => item.category))) as string[];
        const categoryIcons: Record<string, string> = {
          'Produce': 'eco',
          'Dairy & Eggs': 'egg',
          'Meat': 'kebab_dining',
          'Pantry': 'inventory',
          'Others': 'more_horiz'
        };

        return (
          <section className="p-4 md:p-8 lg:p-12 w-full animate-in fade-in slide-in-from-bottom-6 duration-500 overflow-y-auto max-w-6xl mx-auto mb-24 md:mb-0">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 md:mb-16 gap-8 no-print">
              <div>
                <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter">Grocery List</h1>
                <p className="text-slate-400 font-bold text-base md:text-xl">Everything you need for a delicious week.</p>
              </div>
              <div className="flex gap-3 md:gap-4">
                <button 
                  onClick={clearCompletedGroceries}
                  className="flex-1 sm:flex-none px-6 md:px-8 py-4 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl md:rounded-[1.8rem] font-black border border-slate-100 dark:border-slate-700 text-xs md:text-sm transition-all flex items-center justify-center gap-3 hover:bg-slate-50 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px] md:text-[24px]">delete_sweep</span> 
                  Clear Done
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-none px-6 md:px-8 py-4 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-2xl md:rounded-[1.8rem] font-black text-xs md:text-sm transition-all flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 shadow-xl"
                >
                  <span className="material-symbols-outlined text-[20px] md:text-[24px]">print</span> 
                  Print List
                </button>
              </div>
            </div>

            <div className="mb-12 md:mb-16 no-print">
              <div className="bg-white dark:bg-slate-900 p-2 md:p-3 rounded-[1.8rem] md:rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex items-center transition-all focus-within:ring-8 focus-within:ring-primary/5">
                <span className="material-symbols-outlined ml-4 md:ml-8 text-slate-300 !text-[24px] md:!text-[32px]">shopping_cart</span>
                <input 
                  type="text" 
                  value={groceryInput}
                  onChange={(e) => setGroceryInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddGrocery()}
                  placeholder="What else do you need?" 
                  className="flex-1 bg-transparent border-none focus:ring-0 text-lg md:text-2xl font-black px-4 md:px-6 dark:text-white placeholder:text-slate-200"
                />
                <button 
                  onClick={handleAddGrocery}
                  className="bg-primary text-white font-black px-6 md:px-12 py-4 md:py-6 rounded-[1.4rem] md:rounded-[2rem] hover:bg-primary-hover transition-all active:scale-95 text-sm md:text-xl shadow-lg shadow-primary/20"
                >
                  Add Item
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 pb-16">
              {categories.map((cat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] border border-slate-100 dark:border-slate-800 transition-all hover:shadow-2xl hover:shadow-slate-100 dark:hover:shadow-none">
                  <div className="flex items-center gap-4 md:gap-6 mb-8 md:mb-12 border-b border-slate-50 dark:border-slate-800 pb-6 md:pb-8">
                    <div className="size-12 md:size-16 rounded-[1.5rem] bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined font-black text-[28px] md:text-[36px]">{categoryIcons[cat] || 'category'}</span>
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">{cat}</h3>
                      <p className="text-slate-400 font-bold text-xs md:text-sm uppercase tracking-widest">{shoppingList.filter(item => item.category === cat).length} Products</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 md:gap-4">
                    {shoppingList.filter(item => item.category === cat).map((item) => (
                      <div 
                        key={item.id} 
                        className={`flex items-center gap-4 md:gap-6 p-4 md:p-6 rounded-[1.8rem] md:rounded-[2rem] transition-all cursor-pointer select-none group/item border border-transparent ${
                          item.completed 
                            ? 'bg-slate-50/50 dark:bg-slate-800/30 grayscale opacity-60' 
                            : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 hover:border-primary/20 hover:shadow-lg'
                        }`}
                        onClick={() => toggleGrocery(item.id)}
                      >
                        <div className="relative size-7 md:size-9 shrink-0">
                          <div className={`size-full rounded-xl md:rounded-2xl border-2 md:border-[3px] transition-all flex items-center justify-center ${
                            item.completed 
                              ? 'bg-primary border-primary' 
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                          }`}>
                            <span className={`material-symbols-outlined text-white text-sm md:text-xl font-black transition-all duration-300 ${
                              item.completed ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                            }`}>check</span>
                          </div>
                        </div>

                        <div className="flex flex-col flex-1">
                          <span className={`text-lg md:text-2xl font-black transition-all leading-tight ${
                            item.completed 
                              ? 'text-slate-400 line-through' 
                              : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {item.name}
                          </span>
                          {item.amount && (
                            <span className={`text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em] mt-0.5 ${
                              item.completed ? 'text-slate-300' : 'text-primary'
                            }`}>
                              {item.amount}
                            </span>
                          )}
                        </div>

                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteGrocery(item.id); }}
                          className="size-10 md:size-12 rounded-2xl flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 md:opacity-0 group-hover/item:opacity-100 transition-all no-print active:scale-90 icon-button"
                        >
                          <span className="material-symbols-outlined text-[20px] md:text-[24px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {shoppingList.length === 0 && (
                <div className="col-span-full py-32 md:py-48 flex flex-col items-center opacity-30 text-center animate-pulse">
                  <span className="material-symbols-outlined text-[80px] md:text-[120px] mb-8">shopping_bag</span>
                  <h3 className="text-3xl md:text-4xl font-black tracking-tight">Your basket is waiting</h3>
                  <p className="font-bold text-lg mt-2">Add items to get cooking!</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'recommendations':
        return (
          <section className="p-4 md:p-8 lg:p-12 w-full animate-in fade-in slide-in-from-bottom-8 duration-500 overflow-y-auto mb-24 md:mb-0">
            <div className="mb-10 md:mb-16">
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter">Chef's Feed</h1>
              <p className="text-slate-500 dark:text-slate-400 font-bold text-base md:text-xl">Crafted based on your current pantry.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-12 pb-16">
              {filteredRecommendations.map(recipe => (
                <div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setView('recipe-details'); }} className="cursor-pointer group bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-sm hover:shadow-2xl dark:hover:shadow-primary/5 transition-all border border-slate-100 dark:border-slate-800 flex flex-col active:scale-[0.98]">
                  <RecipeImage src={recipe.image} alt={recipe.title} className="aspect-[4/3] group-hover:scale-105 transition-transform duration-700" />
                  <div className="p-8 md:p-10">
                    <div className="flex items-center justify-between mb-5 md:mb-6">
                      <span className="px-3 md:px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] md:text-[11px] font-black uppercase rounded-full tracking-widest">{recipe.difficulty}</span>
                      <div className="flex items-center gap-1.5 text-primary">
                        <span className="material-symbols-outlined text-[16px] md:text-[20px] fill-1">star</span>
                        <span className="text-sm md:text-base font-black">{recipe.matchPercentage}% match</span>
                      </div>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-3 md:mb-4 group-hover:text-primary transition-colors leading-tight tracking-tight">{recipe.title}</h3>
                    <p className="text-slate-400 dark:text-slate-500 font-bold text-sm md:text-base leading-relaxed mb-6 md:mb-8 line-clamp-2">{recipe.description}</p>
                    <div className="flex items-center gap-6 md:gap-10 text-[11px] md:text-[13px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">
                      <div className="flex items-center gap-2 md:gap-3"><span className="material-symbols-outlined text-[20px] md:text-[24px]">timer</span>{recipe.cookTime}</div>
                      <div className="flex items-center gap-2 md:gap-3"><span className="material-symbols-outlined text-[20px] md:text-[24px]">group</span>{recipe.servings} Serves</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'recipe-details':
        if (!selectedRecipe) return null;
        return (
          <main className="w-full max-w-5xl mx-auto p-4 md:p-8 lg:p-12 animate-in fade-in duration-500 overflow-y-auto mb-24 md:mb-0">
            <button onClick={() => setView('recommendations')} className="flex items-center gap-3 font-black text-slate-300 hover:text-primary transition-all mb-8 md:mb-14 text-base md:text-lg group">
              <span className="material-symbols-outlined text-[20px] md:text-[24px] group-hover:-translate-x-2 transition-transform">arrow_back</span> 
              Back to feed
            </button>
            
            <div className="flex flex-col gap-10 md:gap-16 pb-16 md:pb-32">
              {/* Header Info */}
              <div className="flex flex-col gap-6">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tighter">{selectedRecipe.title}</h1>
                <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-2">
                  <div className="flex items-center gap-2 md:gap-2.5 px-4 md:px-6 py-2 md:py-3 bg-primary/10 text-primary font-black text-xs md:text-base rounded-full border border-primary/20">
                    <span className="material-symbols-outlined text-[18px] md:text-[24px]">local_fire_department</span>
                    {selectedRecipe.calories}
                  </div>
                  <div className="flex items-center gap-2 md:gap-2.5 px-4 md:px-6 py-2 md:py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black text-xs md:text-base rounded-full">
                    <span className="material-symbols-outlined text-[18px] md:text-[24px]">schedule</span>
                    {selectedRecipe.cookTime}
                  </div>
                  <div className="flex items-center gap-2 md:gap-2.5 px-4 md:px-6 py-2 md:py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black text-xs md:text-base rounded-full">
                    <span className="material-symbols-outlined text-[18px] md:text-[24px]">group</span>
                    {selectedRecipe.servings} Servings
                  </div>
                </div>
                <p className="text-lg md:text-2xl font-bold text-slate-400 dark:text-slate-500 leading-relaxed max-w-4xl mt-4">{selectedRecipe.description}</p>
              </div>

              {/* Image and Ingredients Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-14 items-start">
                <div className="w-full h-[300px] md:h-[500px] lg:h-[600px]">
                  <RecipeImage src={selectedRecipe.image} alt={selectedRecipe.title} className="w-full h-full rounded-[3rem] md:rounded-[4rem] shadow-2xl shadow-slate-200/50 dark:shadow-none object-cover border-4 border-white dark:border-slate-800" />
                </div>
                
                <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] md:rounded-[4rem] border border-slate-50 dark:border-slate-800 shadow-sm transition-all hover:border-primary/20">
                  <h3 className="text-3xl md:text-4xl font-black mb-10 text-slate-900 dark:text-white tracking-tight">Ingredients</h3>
                  <div className="flex flex-col gap-6 md:gap-8">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center group/ing">
                        <span className="text-lg md:text-xl font-black text-slate-900 dark:text-white group-hover/ing:text-primary transition-colors">{ing.name}</span>
                        <div className="flex items-center gap-4 flex-1 px-4">
                           <div className="h-px w-full bg-slate-100 dark:bg-slate-800 group-hover/ing:bg-primary/20 transition-all"></div>
                        </div>
                        <span className="text-primary text-lg md:text-xl font-black shrink-0">{ing.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dietary Analysis */}
              <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3rem] border border-slate-50 dark:border-slate-800">
                 <div className="flex items-center gap-4 mb-10">
                    <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                       <span className="material-symbols-outlined">bar_chart</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">Dietary Analysis</h3>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                    {[
                      { label: 'Protein', value: selectedRecipe.nutrition.protein, color: 'bg-primary' },
                      { label: 'Carbohydrates', value: selectedRecipe.nutrition.carbs, color: 'bg-blue-500' },
                      { label: 'Healthy Fats', value: selectedRecipe.nutrition.fats, color: 'bg-orange-500' }
                    ].map((macro) => (
                      <div key={macro.label} className="flex flex-col gap-4">
                        <div>
                           <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{macro.label}</span>
                           <h4 className="text-4xl font-black text-slate-900 dark:text-white mt-1">{macro.value}</h4>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                           <div className={`h-full ${macro.color} rounded-full`} style={{ width: '70%' }}></div>
                        </div>
                      </div>
                    ))}
                 </div>
              </div>

              {/* Cooking Methodology */}
              <div className="bg-slate-900 dark:bg-[#0d140e] p-10 md:p-16 lg:p-20 rounded-[4rem] text-white">
                 <h3 className="text-3xl md:text-5xl font-black mb-14 tracking-tight">Cooking Methodology</h3>
                 <div className="flex flex-col gap-12 relative">
                    <div className="absolute left-6 top-10 bottom-10 w-px bg-white/10 hidden md:block"></div>
                    {selectedRecipe.steps.map((step, i) => (
                      <div key={i} className="flex gap-8 md:gap-12 relative z-10 group">
                        <div className="size-12 md:size-14 rounded-2xl bg-white/10 group-hover:bg-primary/20 group-hover:text-primary transition-all flex items-center justify-center font-black text-xl shrink-0">
                          {i + 1}
                        </div>
                        <p className="text-xl md:text-2xl font-bold text-slate-300 group-hover:text-white transition-colors leading-relaxed pt-2 md:pt-3">
                          {step}
                        </p>
                      </div>
                    ))}
                 </div>
                 <div className="mt-20 pt-10 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                       <span className="material-symbols-outlined text-primary">verified</span>
                       <span className="text-sm font-black uppercase tracking-widest text-slate-500">Chef Verified Steps</span>
                    </div>
                    <button className="text-primary font-black uppercase tracking-widest text-sm hover:underline">Download Guide</button>
                 </div>
              </div>
            </div>
          </main>
        );
      default:
        return <div className="p-20 text-center font-black text-slate-200 text-3xl">Coming Soon</div>;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row transition-colors ${isDarkMode ? 'bg-[#0a0f0b]' : 'bg-[#F9FCFA]'}`}>
      {view === 'landing' ? renderContent() : (
        <>
          <Sidebar currentView={view} onNavigate={setView} />
          <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
            <Header onNavigate={setView} onSearch={setSearchQuery} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
            <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden no-scrollbar">
              {renderContent()}
            </main>
            <BottomNav currentView={view} onNavigate={setView} />
          </div>
        </>
      )}
      {isGenerating && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-2xl flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 p-12 md:p-24 rounded-[4rem] flex flex-col items-center gap-10 md:gap-16 text-center max-w-lg">
            <div className="relative size-24 md:size-40">
              <div className="absolute inset-0 border-[6px] border-primary/10 rounded-full" />
              <div className="absolute inset-0 border-[6px] border-t-primary rounded-full animate-spin" />
            </div>
            <h4 className="font-black text-3xl md:text-5xl text-slate-900 dark:text-white">Thinking...</h4>
          </div>
        </div>
      )}
    </div>
  );
}
