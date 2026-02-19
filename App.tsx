
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'motion/react';
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

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty.toLowerCase()) {
    case 'easy': return 'bg-[#13ec37]/10 text-[#0f9d27] dark:text-[#13ec37] border-[#13ec37]/20';
    case 'med':
    case 'medium': return 'bg-[#f97316]/10 text-[#c2410c] dark:text-[#f97316] border-[#f97316]/20';
    case 'hard': return 'bg-red-500/10 text-red-700 dark:text-red-500 border-red-500/20';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const RecipeImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Check if image is already cached
    const currentImg = imgRef.current as HTMLImageElement;
    if (currentImg?.complete) {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className={`relative bg-slate-100 dark:bg-slate-800 overflow-hidden ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-10">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      )}
      <img 
        ref={imgRef as any}
        src={src} 
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-700 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={() => setIsLoading(false)}
        onError={() => setIsLoading(false)} 
      />
    </div>
  );
};

// ─── CUSTOM CURSOR LOGIC WITH ENHANCED VISIBILITY ───
const Cursor: React.FC<{ currentView: ViewState }> = ({ currentView }) => {
  useEffect(() => {
    const cursor = document.getElementById('cursor');
    const cursorRing = document.getElementById('cursor-ring');
    const cursorLabel = document.getElementById('cursor-label');
    if (!cursor || !cursorRing || !cursorLabel) return;

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;
    let isHovering = false;
    let isDragging = false;
    let startY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX; mouseY = e.clientY;
      cursor.style.left = mouseX + 'px';
      cursor.style.top = mouseY + 'px';
      cursorLabel.style.left = mouseX + 'px';
      cursorLabel.style.top = mouseY + 'px';

      if (isDragging && currentView === 'landing') {
        const diff = startY - e.clientY;
        window.scrollBy({ top: diff * 1.8, behavior: 'auto' });
        startY = e.clientY;
        return;
      }

      const target = e.target as HTMLElement;
      const isClickable = target.closest('button, a, [role="button"], input, select, .cursor-pointer');
      
      if (isClickable) {
        if (!isHovering) {
          isHovering = true;
          cursorRing.style.borderColor = '#C9952A';
          cursorRing.style.backgroundColor = 'rgba(201,149,42,0.12)';
          cursor.style.opacity = '0.3';
          cursorLabel.style.opacity = '0';
        }
      } else {
        if (isHovering) {
          isHovering = false;
          cursorRing.style.borderColor = 'rgba(201,149,42,0.6)';
          cursorRing.style.backgroundColor = 'transparent';
          cursor.style.opacity = '1';
        }
        
        if (currentView === 'landing') {
          cursorLabel.innerText = isDragging ? "DRAGGING" : "GRAB TO SCROLL";
          cursorLabel.style.opacity = isDragging ? "1" : "0.9";
        } else {
          cursorLabel.style.opacity = "0";
        }
      }
      updateTransforms();
    };

    const onMouseDown = (e: MouseEvent) => {
      if (currentView !== 'landing') return;
      const target = e.target as HTMLElement;
      if (target.closest('button, a, [role="button"], input, select')) return;

      isDragging = true;
      startY = e.clientY;
      cursorRing.style.transform = `translate(-50%, -50%) scale(0.7)`;
      cursorLabel.innerText = "DRAGGING";
      cursorLabel.style.opacity = "1";
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      cursorRing.style.transform = `translate(-50%, -50%) scale(1)`;
      cursorLabel.innerText = "GRAB TO SCROLL";
      cursorLabel.style.opacity = "0.9";
    };

    const onScroll = () => {
      if (isDragging) return;
      const scrollY = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = maxScroll > 0 ? (scrollY / maxScroll) * 100 : 0;
      
      if (currentView === 'landing' && !isHovering) {
        if (scrollY < 50) {
          cursorLabel.innerText = "GRAB TO SCROLL";
          cursorLabel.style.opacity = "0.9";
        } else {
          cursorLabel.innerText = `${Math.round(scrollPercent)}%`;
          cursorLabel.style.opacity = scrollPercent > 98 ? "0" : "0.6";
        }
      }
      updateTransforms();
    };

    const updateTransforms = () => {
      const scrollY = window.scrollY;
      const scale = isHovering ? 1.65 : (isDragging ? 0.72 : 1);
      const rotation = scrollY * 0.25;
      cursorRing.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
    };

    let frameId: number;
    const animateRing = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.left = ringX + 'px';
      cursorRing.style.top = ringY + 'px';
      frameId = requestAnimationFrame(animateRing);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('scroll', onScroll);
    animateRing();
    onScroll();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frameId);
    };
  }, [currentView]);

  return null;
};

const Sidebar: React.FC<{ currentView: ViewState; onNavigate: (view: ViewState) => void }> = ({ currentView, onNavigate }) => {
  const menuItems: { id: ViewState; label: string; icon: string }[] = [
    { id: 'pantry', label: 'My Pantry', icon: 'kitchen' },
    { id: 'recommendations', label: 'Chef\'s Feed', icon: 'restaurant_menu' },
    { id: 'cookbook', label: 'Meal Planner', icon: 'calendar_today' },
    { id: 'shopping-list', label: 'Grocery List', icon: 'shopping_cart' },
    { id: 'profile', label: 'My Profile', icon: 'person' },
  ];

  return (
    <aside className="hidden lg:flex w-80 flex-col bg-white dark:bg-[#0f1510] border-r border-slate-100 dark:border-slate-800 h-screen sticky top-0 z-50 shadow-2xl shadow-ink/5">
      <div className="p-12 pb-16">
        <button onClick={() => onNavigate('landing')} className="flex items-center gap-4 group">
          <span className="material-symbols-outlined text-primary text-[36px] group-hover:rotate-12 transition-transform duration-700">nutrition</span>
          <span className="font-display text-[26px] font-black tracking-tight text-ink dark:text-white uppercase">Chef<span className="text-primary">Mistri</span></span>
        </button>
      </div>

      <nav className="flex-1 px-6 space-y-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-5 px-8 py-6 rounded-[2rem] font-black transition-all duration-700 font-aesthetic ${
              currentView === item.id
                ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-[1.05]'
                : 'text-slate-400 dark:text-cream/20 hover:text-ink dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:translate-x-2'
            }`}
          >
            <span className="material-symbols-outlined text-[26px]">{item.icon}</span>
            <span className="text-[13px] tracking-[0.2em] uppercase font-bold">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-10">
        <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-inner group hover:border-primary/20 transition-all duration-700">
          <p className="font-aesthetic text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] mb-6">Master Status</p>
          <div className="flex items-center gap-6">
            <div className="size-14 rounded-[1.25rem] bg-primary text-white flex items-center justify-center font-display text-2xl font-black shadow-[0_10px_25px_-5px_rgba(201,149,42,0.4)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-700">L1</div>
            <div className="flex-1">
              <p className="font-display text-lg font-black text-ink dark:text-white leading-none">Sous Chef</p>
              <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full mt-3 overflow-hidden shadow-inner">
                <div className="w-2/3 h-full bg-primary animate-pulse shadow-[0_0_15px_rgba(201,149,42,0.6)]"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Header: React.FC<{ 
  onNavigate: (view: ViewState) => void; 
  isDarkMode: boolean; 
  toggleDarkMode: () => void 
}> = ({ onNavigate, isDarkMode, toggleDarkMode }) => {
  return (
    <header className="h-24 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-10 lg:px-16 bg-white/80 dark:bg-[#0a0f0b]/90 backdrop-blur-3xl sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-6 lg:hidden">
        <button onClick={() => onNavigate('landing')} className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[34px]">nutrition</span>
        </button>
      </div>
      
      <div className="flex-1 hidden lg:block">
        <div className="font-aesthetic flex items-center gap-5 text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.35em]">
          <span>Gourmet Dashboard</span>
          <span className="size-1 rounded-full bg-primary/40"></span>
          <span className="text-primary italic font-black">AI Orchestrated</span>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <button 
          onClick={toggleDarkMode} 
          className="size-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-cream/40 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 active:scale-90"
        >
          <span className="material-symbols-outlined text-[26px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
        </button>
        <button className="size-12 flex items-center justify-center rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-cream/40 transition-all relative border border-transparent hover:border-slate-200 dark:hover:border-slate-700 active:scale-90">
          <span className="material-symbols-outlined text-[26px]">notifications</span>
          <span className="absolute top-3.5 right-3.5 size-2.5 bg-primary rounded-full border-2 border-white dark:border-[#0a0f0b] animate-bounce"></span>
        </button>
        <div className="h-10 w-[1px] bg-slate-100 dark:bg-slate-800 mx-2 hidden sm:block"></div>
        <button 
          onClick={() => onNavigate('profile')}
          className="flex items-center gap-5 pl-5 pr-3 py-3 rounded-[1.5rem] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-500 group border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        >
          <div className="text-right hidden md:block">
            <p className="font-display text-[15px] font-black text-ink dark:text-white leading-none mb-2">Alex Chef</p>
            <p className="font-aesthetic text-[9px] text-gold-dk dark:text-gold font-black tracking-[0.25em] uppercase leading-none opacity-80">Profile Settings</p>
          </div>
          <div className="size-12 rounded-[1rem] bg-slate-100 dark:bg-slate-800 overflow-hidden border-2 border-transparent group-hover:border-primary transition-all duration-700 shadow-inner group-hover:rotate-3 group-hover:scale-105">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Avatar" />
          </div>
        </button>
      </div>
    </header>
  );
};

const Landing: React.FC<{ onNavigate: (view: ViewState) => void; isDarkMode: boolean; toggleDarkMode: () => void }> = ({ onNavigate, isDarkMode, toggleDarkMode }) => {
  const [page, setPage] = useState(0);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [generatedRecipe, setGeneratedRecipe] = useState<any>(null);
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false);
  const [typewriterText, setTypewriterText] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);

  // Parallax Values
  const { scrollY } = useScroll();
  const smoothScrollY = useSpring(scrollY, { stiffness: 100, damping: 30, mass: 1 });
  
  const heroParallax = useTransform(smoothScrollY, [0, 800], [0, -150]);
  const heroOpacity = useTransform(smoothScrollY, [0, 400], [1, 0.5]);
  const orb1Y = useTransform(smoothScrollY, [0, 2000], [0, 400]);
  const orb2Y = useTransform(smoothScrollY, [0, 2000], [0, -300]);

  const suggestions = [
    "Lemon Herb Salmon with roasted asparagus",
    "Creamy Mushroom Risotto in 30 minutes",
    "Spiced Chickpea & Spinach Curry",
    "Garlic Butter Pasta with cherry tomatoes",
    "Thai Basil Fried Rice",
  ];

  const RECIPES = [
    { title: "Seared Scallops & Saffron Foam", time: "15 MINS", diff: "HARD", img: "https://images.pexels.com/photos/5638527/pexels-photo-5638527.jpeg", popular: true },
    { title: "Wild Mushroom Truffle Risotto", time: "35 MINS", diff: "MEDIUM", img: "https://images.pexels.com/photos/5638732/pexels-photo-5638732.jpeg", popular: true },
    { title: "Honey Glazed Duck Breast", time: "25 MINS", diff: "HARD", img: "https://images.pexels.com/photos/604969/pexels-photo-604969.jpeg", popular: false },
    { title: "Heirloom Tomato & Burrata", time: "10 MINS", diff: "EASY", img: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg", popular: true },
    { title: "Miso Glazed Black Cod", time: "20 MINS", diff: "MEDIUM", img: "https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg", popular: false },
    { title: "Charred Octopus with Romesco", time: "40 MINS", diff: "HARD", img: "https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg", popular: false },
    { title: "Arugula & Fig Salad", time: "15 MINS", diff: "EASY", img: "https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg", popular: false },
    { title: "Braised Wagyu Short Ribs", time: "4 HOURS", diff: "HARD", img: "https://images.pexels.com/photos/769289/pexels-photo-769289.jpeg", popular: true },
    { title: "Pistachio Crusted Salmon", time: "25 MINS", diff: "MEDIUM", img: "https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg", popular: false },
  ];

  const STATS = [
    { val: "10k+", label: "Active Chefs" },
    { val: "50k+", label: "Recipes Generated" },
    { val: "95%", label: "Match Accuracy" },
    { val: "30%", label: "Less Food Waste" },
    { val: "4.9★", label: "App Store Rating" },
    { val: "200+", label: "Cuisines Supported" },
  ];

  const INGREDIENTS = [
    { emoji: "🥚", name: "Eggs" }, { emoji: "🧄", name: "Garlic" }, { emoji: "🧅", name: "Onion" },
    { emoji: "🍅", name: "Tomato" }, { emoji: "🥑", name: "Avocado" }, { emoji: "🍗", name: "Chicken" },
    { emoji: "🌿", name: "Basil" }, { emoji: "🧀", name: "Cheese" }, { emoji: "🍋", name: "Lemon" },
    { emoji: "🥦", name: "Broccoli" }, { emoji: "🌶️", name: "Chilli" }, { emoji: "🍝", name: "Pasta" },
  ];

  const FAKE_RECIPES: any = {
    default: { name: "Chef's Surprise", desc: "A creative fusion dish using what you have.", tags: ["FUSION", "CREATIVE"], steps: ["Prep your ingredients (5 min)", "Sauté aromatics until golden", "Combine and season to taste", "Plate beautifully & serve hot"] },
    eggs_garlic: { name: "Aglio e Uova", desc: "A classic Italian-inspired quick pasta with garlic, eggs and parmesan.", tags: ["ITALIAN", "20 MINS", "EASY"], steps: ["Boil salted water for pasta", "Sauté garlic in olive oil until fragrant", "Whisk eggs with parmesan", "Toss hot pasta with egg mixture off height"] },
    avocado_eggs: { name: "Smashed Avo Toast", desc: "Silky avocado on toasted sourdough crowned with a perfect poached egg.", tags: ["BRUNCH", "10 MINS", "EASY"], steps: ["Toast your bread until golden", "Smash avocado with lemon & salt", "Poach eggs in simmering water 3 min", "Layer avo, egg, chilli flakes"] },
  };

  useEffect(() => {
    document.body.classList.add('landing-active');
    const handleScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    
    setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight) el.classList.add('visible');
        });
    }, 500);

    let sIdx = 0, cIdx = 0, deleting = false;
    let timer: number;
    const type = () => {
      const s = suggestions[sIdx];
      if (!deleting) {
        cIdx++;
        setTypewriterText(s.slice(0, cIdx));
        if (cIdx === s.length) { deleting = true; timer = setTimeout(type, 2200); return; }
        timer = setTimeout(type, 55);
      } else {
        cIdx--;
        setTypewriterText(s.slice(0, cIdx));
        if (cIdx === 0) { deleting = false; sIdx = (sIdx + 1) % suggestions.length; timer = setTimeout(type, 400); return; }
        timer = setTimeout(type, 28);
      }
    };
    timer = setTimeout(type, 1200);

    return () => {
      document.body.classList.remove('landing-active');
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  const handleChipToggle = (name: string) => {
    setSelectedIngredients(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const handleGenerateDemo = () => {
    if (selectedIngredients.size === 0) return;
    setIsGeneratingDemo(true);
    setGeneratedRecipe(null);
    setTimeout(() => {
      const selArr = Array.from(selectedIngredients).map(s => s.toLowerCase());
      let recipe = FAKE_RECIPES.default;
      if (selArr.includes('eggs') && selArr.includes('garlic')) recipe = FAKE_RECIPES.eggs_garlic;
      if (selArr.includes('avocado') && selArr.includes('eggs')) recipe = FAKE_RECIPES.avocado_eggs;
      setGeneratedRecipe(recipe);
      setIsGeneratingDemo(false);
    }, 1200);
  };

  const currentVisibleRecipes = RECIPES.slice(page * 3, (page + 1) * 3);

  return (
    <div className="flex-1 flex flex-col min-h-screen scroll-smooth overflow-x-hidden font-body relative">
      <Cursor currentView="landing" />
      
      {/* Parallax Orbs */}
      <motion.div 
        style={{ y: orb1Y }}
        className="fixed w-[700px] h-[700px] opacity-25 bg-[radial-gradient(circle,rgba(201,149,42,0.18)_0%,transparent_70%)] top-[5%] left-[-15%] pointer-events-none z-0"
      />
      <motion.div 
        style={{ y: orb2Y }}
        className="fixed w-[500px] h-[500px] opacity-15 bg-[radial-gradient(circle,rgba(239,68,68,0.12)_0%,transparent_70%)] top-[50%] right-[-5%] pointer-events-none z-0"
      />

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 h-[68px] z-[100] flex items-center justify-between px-8 lg:px-20 transition-all duration-400 ${isScrolled ? 'bg-cream/85 dark:bg-ink/85 backdrop-blur-3xl border-b border-primary/20 shadow-lg' : 'bg-transparent'}`}>
        <a href="#" className="flex items-center gap-2.5">
          <span className="micon gold-text text-[24px]">nutrition</span>
          <span className="font-display text-[22px] font-black tracking-tight text-ink dark:text-cream">Chef<span className="gold-text">Mistri</span></span>
        </a>
        <div className="hidden lg:flex gap-10">
          {['Features', 'Discover', 'Pricing'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="font-aesthetic text-[12px] font-bold uppercase tracking-[0.2em] text-ink dark:text-cream/40 hover:text-gold transition-colors relative group">
              {item}
              <span className="absolute bottom-[-4px] left-0 w-0 h-[1.5px] bg-gold transition-all group-hover:w-full"></span>
            </a>
          ))}
        </div>
        <div className="flex items-center gap-6">
          <button onClick={toggleDarkMode} className="size-10 flex items-center justify-center rounded-lg hover:bg-gold/10 text-slate-500 dark:text-cream/40 hover:text-gold transition-all">
            <span className="micon text-[20px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
          </button>
          <button onClick={() => onNavigate('pantry')} className="font-aesthetic text-[12px] font-black uppercase tracking-widest text-slate-500 dark:text-cream/40 hover:text-ink dark:hover:text-cream transition-colors">Log In</button>
          <button onClick={() => onNavigate('pantry')} className="cta-btn !py-2.5 !px-6 !text-[11px] shadow-lg">Sign Up Free</button>
        </div>
      </nav>

      {/* Hero Section with Parallax */}
      <section id="hero" className="min-h-screen max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-2 items-center gap-16 px-8 lg:px-20 pt-32 pb-20 relative z-10">
        <motion.div style={{ y: heroParallax, opacity: heroOpacity }} className="flex flex-col gap-8 text-left">
          <div className="pill fade-up inline-flex w-fit shadow-sm"><span className="micon !text-[13px] text-gold-dk dark:text-gold">auto_awesome</span> AI-Gourmet Engine 2.0</div>
          <div className="fade-up [animation-delay:0.15s]">
            <h1 className="font-display font-black text-[3.8rem] lg:text-[6.4rem] leading-[0.98] tracking-tighter text-ink dark:text-white drop-shadow-sm">
              Cook<br />
              <em className="gold-text italic">Smarter,</em><br />
              Not Harder.
            </h1>
          </div>
          <p className="hero-sub fade-up [animation-delay:0.28s] text-[18px] leading-relaxed text-slate-700 dark:text-cream/40 font-semibold max-w-[480px]">
            Turn your random ingredients into gourmet masterpieces. Manage your pantry, plan your week, and never ask <em className="text-ink dark:text-cream/75 italic">"what's for dinner?"</em> again.
          </p>
          <div className="fade-up [animation-delay:0.38s] text-[16px] text-slate-500 dark:text-cream/40 font-bold">
            Today's AI suggestion: <strong className="text-gold-dk dark:text-gold-lt">{typewriterText}</strong><span className="typing-cursor inline-block w-[2px] h-[1.1em] bg-gold ml-1.5 align-middle animate-[blink_0.9s_step-end_infinite]"></span>
          </div>
          <div className="flex gap-5 fade-up [animation-delay:0.5s]">
            <button onClick={() => onNavigate('pantry')} className="cta-btn !px-10 !py-5">Start Cooking Now</button>
            <button className="font-aesthetic flex items-center gap-3 px-8 py-5 border border-slate-300 dark:border-cream/10 rounded-xl text-[13px] font-black uppercase tracking-widest text-slate-500 dark:text-cream/40 hover:text-ink dark:hover:text-white hover:border-gold transition-all bg-white/50 dark:bg-transparent shadow-sm">
              <span className="micon text-[20px]">play_circle</span> Watch Demo
            </button>
          </div>
          <div className="flex items-center gap-4 fade-up [animation-delay:0.62s]">
            <div className="flex -space-x-2.5">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="size-9 rounded-full bg-white dark:bg-ink-elevated border-2 border-cream dark:border-ink flex items-center justify-center text-[15px] shadow-md">🧑‍🍳</div>
              ))}
            </div>
            <span className="font-aesthetic text-[11px] font-black uppercase tracking-[0.1em] text-slate-400 dark:text-cream/35">Joined by <span className="text-gold-dk dark:text-gold font-black">10,000+</span> chefs this month</span>
          </div>
        </motion.div>

        <motion.div 
          style={{ y: heroParallax }}
          className="fade-up [animation-delay:0.25s] relative group flex justify-center lg:justify-end"
        >
           <TiltedCard 
             imageSrc="https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg" 
             containerHeight="500px" 
             containerWidth="100%"
             imageHeight="480px"
             imageWidth="480px"
             rotateAmplitude={12} 
             captionText="Mediterranean Bowl - 15 mins"
             showTooltip={true}
           />
        </motion.div>
      </section>

      {/* Ticker Element - POSITIONED AFTER HERO SECTION - FIXED VISIBILITY */}
      <section id="stats" className="border-y border-primary/10 bg-white/60 dark:bg-primary/5 overflow-hidden relative z-50 shadow-sm">
        <div className="flex w-max whitespace-nowrap py-9 animate-[marquee_50s_linear_infinite] hover:[animation-play-state:paused]">
          {/* Exactly two sets for perfect seamless -50% looping */}
          {[...STATS, ...STATS].map((stat, i) => (
            <div key={i} className="flex items-center gap-12 px-14 shrink-0">
              <div className="text-left flex flex-col justify-center">
                <div className="font-display text-[34px] font-black gold-text leading-none">{stat.val}</div>
                <div className="font-aesthetic text-[11px] font-black tracking-[0.3em] uppercase text-slate-500 dark:text-cream/40 mt-2 whitespace-nowrap">
                  {stat.label}
                </div>
              </div>
              <div className="size-1.5 rounded-full bg-gold/30 mx-2"></div>
            </div>
          ))}
        </div>
      </section>

      {/* Ingredient Playground */}
      <section id="ingredient-section" className="bg-white/40 dark:bg-ink-surface border-y border-primary/20 py-24 px-8 lg:px-20 relative overflow-hidden">
        <motion.div 
          style={{ y: orb2Y }}
          className="absolute -right-20 top-20 text-[200px] opacity-[0.04] select-none pointer-events-none font-display italic text-primary"
        >
          Fresh
        </motion.div>

        <div className="max-w-[1000px] mx-auto relative z-10">
          <div className="reveal text-center mb-14">
            <div className="pill mb-5 shadow-sm"><span className="micon !text-[12px] text-gold-dk dark:text-gold">flare</span> Live AI Demo</div>
            <h2 className="font-display text-[3.2rem] font-black text-ink dark:text-white leading-tight">What's in your fridge?</h2>
            <p className="font-body text-[16px] text-slate-600 dark:text-cream/40 mt-4 font-bold">Pick ingredients below and watch the AI conjure a recipe in real time.</p>
          </div>

          <div className="reveal [animation-delay:0.2s] grid grid-cols-1 lg:grid-cols-[1.1fr_auto_0.9fr] gap-12 items-start">
            <div className="bg-white dark:bg-ink-elevated border border-primary/15 rounded-3xl p-10 min-h-[320px] shadow-xl shadow-gold/5">
              <div className="font-aesthetic text-[11px] font-black tracking-[0.3em] uppercase text-gold-dk dark:text-gold mb-8 flex items-center gap-2.5">
                <span className="micon text-[16px]">grocery</span> Available Ingredients
              </div>
              <div className="flex flex-wrap gap-3">
                {INGREDIENTS.map(ing => (
                  <button 
                    key={ing.name}
                    onClick={() => handleChipToggle(ing.name)}
                    className={`font-body px-5 py-3 rounded-full text-[14px] font-black border transition-all duration-300 ${selectedIngredients.has(ing.name) ? 'bg-gold text-white border-gold shadow-lg -translate-y-1' : 'bg-slate-50 dark:bg-ink-surface border-slate-200 dark:border-cream/5 text-slate-800 dark:text-cream hover:border-gold hover:bg-white hover:-translate-y-0.5'}`}
                  >
                    <span className="mr-2 text-[16px]">{ing.emoji}</span> {ing.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 pt-4 lg:pt-28">
              <button 
                onClick={handleGenerateDemo}
                className={`size-18 rounded-full bg-gradient-to-br from-gold to-gold-dk text-white flex items-center justify-center transition-all duration-500 relative group shadow-2xl ${selectedIngredients.size === 0 ? 'opacity-20 cursor-not-allowed grayscale scale-90' : 'hover:scale-110 active:scale-95'}`}
              >
                <span className="micon text-[32px]">auto_awesome</span>
                {selectedIngredients.size > 0 && <span className="absolute inset-[-12px] border border-gold/40 rounded-full animate-[pulse_2s_ease-in-out_infinite]"></span>}
              </button>
              <div className="font-aesthetic text-[10px] font-black tracking-[0.3em] uppercase text-gold-dk dark:text-gold">Generate</div>
            </div>

            <div className={`bg-white dark:bg-ink-elevated border rounded-[2rem] p-10 min-h-[320px] transition-all duration-500 shadow-xl ${generatedRecipe ? 'border-gold shadow-[0_30px_60px_rgba(201,149,42,0.18)]' : 'border-primary/10 shadow-gold/5'}`}>
              {!generatedRecipe && !isGeneratingDemo && (
                <div className="flex flex-col items-center justify-center h-full text-slate-200 dark:text-cream/10 gap-5">
                  <span className="micon text-[54px] opacity-40">restaurant_menu</span>
                  <p className="font-body text-[14px] text-center text-slate-400 dark:text-cream/40 font-black tracking-wide">Select items & hit generate<br />to see magic happen</p>
                </div>
              )}
              {isGeneratingDemo && (
                <div className="space-y-5 pt-6">
                  {[100, 85, 75, 60].map(w => (
                    <div key={w} className="h-6 rounded-2xl bg-gradient-to-r from-slate-50 dark:from-ink-surface via-slate-100 dark:via-ink-elevated to-slate-50 dark:to-ink-surface animate-[shimmer_1.5s_infinite] bg-[length:400px_100%] shadow-inner" style={{ width: `${w}%` }}></div>
                  ))}
                </div>
              )}
              {generatedRecipe && !isGeneratingDemo && (
                <div className="animate-[fade-up_0.6s_ease-out_both]">
                  <div className="font-aesthetic text-[10px] font-black tracking-[0.3em] uppercase text-gold-dk dark:text-gold mb-4 opacity-80">Tailored Creation:</div>
                  <h3 className="font-display text-[28px] font-black text-ink dark:text-white mb-3 leading-tight">{generatedRecipe.name}</h3>
                  <p className="font-body text-[15px] leading-relaxed text-slate-600 dark:text-cream/40 mb-6 italic font-bold">{generatedRecipe.desc}</p>
                  <div className="flex flex-wrap gap-2.5 mb-8">
                    {generatedRecipe.tags.map((t: string) => <span key={t} className="font-aesthetic px-3.5 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-gold-dk dark:text-gold text-[10px] font-black tracking-widest uppercase">{t}</span>)}
                  </div>
                  <ul className="space-y-4 mb-10">
                    {generatedRecipe.steps.slice(0, 3).map((s: string, i: number) => (
                      <li key={i} className="font-body flex gap-4 items-start text-[14px] text-slate-700 dark:text-cream/60 leading-relaxed font-bold">
                        <span className="size-6 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center text-gold-dk dark:text-gold text-[11px] font-black shrink-0 mt-0.5 shadow-sm">{i+1}</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => onNavigate('pantry')} className="cta-btn !py-4 !text-[12px] w-full shadow-xl">Unlock Full Recipe →</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-8 lg:px-20 max-w-[1320px] mx-auto relative z-10">
        <div className="text-center mb-20 reveal">
          <div className="pill mb-6 shadow-sm"><span className="micon !text-[12px] text-gold-dk dark:text-gold">dashboard</span> Platform</div>
          <h2 className="font-display text-[3.2rem] lg:text-[4.6rem] font-black text-ink dark:text-white leading-[1.05] tracking-tight">Everything you need to<br /><em className="gold-text italic">master your kitchen.</em></h2>
          <p className="font-body text-[17px] text-slate-500 dark:text-cream/40 max-w-[460px] mx-auto mt-6 leading-relaxed font-bold">Powerful tools built for the modern home cook.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px] border border-primary/20 rounded-[2.5rem] overflow-hidden reveal [animation-delay:0.1s] shadow-2xl shadow-gold/5 bg-slate-100 dark:bg-primary/20">
          {[
            { id: '01', tag: 'Organise', title: 'Smart Pantry', desc: 'Real-time inventory management. Know what you have, track expiry dates, and eliminate waste.', icon: 'inventory_2', color: '#B45309' },
            { id: '02', tag: 'Create', title: 'AI Recipes', desc: 'The "What can I cook?" engine generates recipes tailored to your current stock and dietary needs.', icon: 'flare', color: '#B91C1C' },
            { id: '03', tag: 'Shop', title: 'Auto-Grocery', desc: 'Missing an ingredient? Add it to your smart list with one tap. Integrates with top delivery apps.', icon: 'shopping_basket', color: '#1D4ED8' }
          ].map((feat) => (
            <div 
              key={feat.id}
              className="bg-white dark:bg-ink-surface p-14 hover:bg-slate-50 dark:hover:bg-ink-elevated transition-all duration-700 relative group"
            >
              <div className="size-18 rounded-[1.25rem] flex items-center justify-center text-white mb-10 shadow-lg relative" style={{ backgroundColor: `${feat.color}15`, border: `1px solid ${feat.color}30` }}>
                <span className="micon text-[34px]" style={{ color: feat.color }}>{feat.icon}</span>
                <span className="font-aesthetic absolute -top-3 -right-3 size-7 rounded-full bg-white dark:bg-ink border border-primary/20 text-slate-400 dark:text-cream/40 text-[11px] font-black flex items-center justify-center shadow-md">{feat.id}</span>
              </div>
              <div className="font-aesthetic text-[11px] font-black tracking-[0.3em] uppercase text-slate-300 dark:text-cream/20 mb-4">{feat.tag}</div>
              <h3 className="font-display text-[32px] font-black text-ink dark:text-white mb-5 leading-tight group-hover:translate-x-1 transition-transform duration-500">{feat.title}</h3>
              <p className="font-body text-[16px] text-slate-600 dark:text-cream/40 leading-relaxed font-bold mb-10">{feat.desc}</p>
              <div className="h-0.5 w-14 rounded-full group-hover:w-28 transition-all duration-700 shadow-sm" style={{ background: `linear-gradient(90deg, ${feat.color}, transparent)` }}></div>
            </div>
          ))}
        </div>
      </section>

      {/* Seasonal Picks (Discover) */}
      <section id="recipes" className="py-24 px-8 lg:px-20 max-w-[1320px] mx-auto relative z-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-10 reveal">
          <div>
            <div className="pill mb-5 shadow-sm"><span className="micon !text-[12px] text-gold-dk dark:text-gold">trending_up</span> Trending Now</div>
            <h2 className="font-display text-[3rem] lg:text-[4rem] font-black text-ink dark:text-white tracking-tight">Seasonal <em className="gold-text italic">Picks</em></h2>
            <p className="font-body text-[16px] text-slate-500 dark:text-cream/40 mt-4 font-black tracking-wide uppercase text-[12px]">AI Hand-curated · Page {page + 1} of 3</p>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex gap-2.5">
              {[0, 1, 2].map(i => <button key={i} onClick={() => setPage(i)} className={`h-2 rounded-full transition-all duration-500 ${i === page ? 'w-12 bg-gold shadow-lg shadow-gold/30' : 'w-2 bg-slate-300 dark:bg-cream/10 hover:bg-gold/40'}`}></button>)}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setPage(p => (p - 1 + 3) % 3)} className="size-14 rounded-[1.25rem] border border-slate-200 dark:border-primary/20 bg-white dark:bg-ink-surface hover:border-gold transition-all flex items-center justify-center text-ink dark:text-white shadow-md active:scale-90"><span className="micon text-[28px]">chevron_left</span></button>
              <button onClick={() => setPage(p => (p + 1) % 3)} className="size-14 rounded-[1.25rem] border border-slate-200 dark:border-primary/20 bg-white dark:bg-ink-surface hover:border-gold transition-all flex items-center justify-center text-ink dark:text-white shadow-md active:scale-90"><span className="micon text-[28px]">chevron_right</span></button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div 
            key={page} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-10"
          >
            {currentVisibleRecipes.map((recipe, i) => (
              <motion.div 
                key={recipe.title} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                onClick={() => onNavigate('pantry')}
                className="bg-white dark:bg-ink-surface border border-slate-100 dark:border-primary/10 rounded-[3rem] overflow-hidden transition-all duration-700 hover:-translate-y-4 hover:shadow-[0_40px_80px_rgba(10,8,6,0.12)] dark:hover:shadow-[0_50px_100px_rgba(0,0,0,0.7)] group cursor-pointer"
              >
                <div className="h-[260px] overflow-hidden relative">
                  <RecipeImage src={recipe.img} alt={recipe.title} className="w-full h-full" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  {recipe.popular && (
                    <div className="font-aesthetic absolute top-6 right-6 flex items-center gap-2 bg-white/90 dark:bg-gold/90 backdrop-blur-lg rounded-full px-5 py-2.5 shadow-2xl border border-gold/20">
                      <span className="micon !text-[15px] text-gold-dk dark:text-ink">local_fire_department</span>
                      <span className="text-[11px] font-black uppercase tracking-[0.15em] text-gold-dk dark:text-ink">Popular</span>
                    </div>
                  )}
                </div>
                <div className="p-10">
                  <h3 className="font-display text-[28px] font-black text-ink dark:text-white mb-5 leading-tight group-hover:text-gold transition-colors duration-300">{recipe.title}</h3>
                  <div className="flex items-center justify-between">
                    <div className="font-aesthetic flex items-center gap-5 text-[11px] font-black tracking-[0.15em] text-slate-400 dark:text-cream/40 uppercase">
                      <div className="flex items-center gap-2"><span className="micon !text-[18px] text-gold/70">schedule</span> {recipe.time}</div>
                      <div className="flex items-center gap-2" style={{ color: recipe.diff === 'EASY' ? '#16a34a' : recipe.diff === 'MEDIUM' ? '#d97706' : '#dc2626' }}>
                        <span className="micon !text-[18px]">signal_cellular_alt</span> {recipe.diff}
                      </div>
                    </div>
                    <div className="size-11 rounded-full bg-gold/10 border border-primary/20 flex items-center justify-center transition-all duration-500 group-hover:bg-gold group-hover:text-white active:scale-90 hover:rotate-[-45deg]">
                      <span className="micon !text-[20px]">arrow_forward</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Footer CTA with Background Drift */}
      <section id="cta" className="py-40 px-8 lg:px-20 text-center relative overflow-hidden bg-white dark:bg-ink border-t border-slate-100 dark:border-primary/10">
        <motion.div 
          style={{ y: orb1Y }}
          className="orb absolute w-[1000px] h-[700px] bg-[radial-gradient(circle,rgba(201,149,42,0.15)_0%,transparent_70%)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
        />
        <div className="reveal relative z-10 space-y-12">
          <div className="pill shadow-sm"><span className="micon !text-[12px] text-gold-dk dark:text-gold">rocket_launch</span> Get Started</div>
          <h2 className="font-display text-[3rem] lg:text-[6.4rem] font-black leading-[0.95] tracking-tighter text-ink dark:text-white max-w-[900px] mx-auto drop-shadow-sm">Ready to transform<br /><em className="gold-text italic">your cooking?</em></h2>
          <p className="font-body text-[19px] text-slate-700 dark:text-cream/50 max-w-[480px] mx-auto leading-relaxed font-bold">Join thousands of home chefs turning everyday ingredients into extraordinary meals.</p>
          <button onClick={() => onNavigate('pantry')} className="cta-btn !py-7 !px-20 !text-[16px] shadow-2xl -translate-y-2 hover:-translate-y-3">Join the Kitchen →</button>
          <p className="font-aesthetic text-[11px] text-slate-400 dark:text-cream/30 tracking-[0.4em] uppercase font-black">No credit card required · Free forever for individuals</p>
        </div>
      </section>

      <footer className="border-t border-slate-100 dark:border-primary/10 py-12 px-8 lg:px-20 flex flex-col md:flex-row items-center justify-between gap-8 bg-slate-50 dark:bg-ink reveal relative z-10">
        <div className="flex items-center gap-4">
          <span className="micon gold-text text-[28px]">nutrition</span>
          <span className="font-display text-[24px] text-ink dark:text-cream/50 font-black tracking-tight">ChefMistri</span>
        </div>
        <p className="font-aesthetic text-[11px] text-slate-400 dark:text-cream/30 tracking-[0.25em] uppercase font-black">© 2025 ChefMistri · AI-crafted excellence for modern kitchens</p>
      </footer>
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
  
  const plannerScrollRef = useRef<HTMLDivElement>(null);
  const dragInfo = useRef({ isDragging: false, startX: 0, scrollLeft: 0 });

  const [groceryList, setGroceryList] = useState<ShoppingItem[]>([
    { id: '1', name: 'Fresh Basil', category: 'Produce', completed: false },
    { id: '2', name: 'Almond Milk', category: 'Dairy', completed: true },
  ]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
    document.documentElement.classList.toggle('light');
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

  const handleDragStart = (e: React.MouseEvent) => {
    if (!plannerScrollRef.current) return;
    dragInfo.current = {
      isDragging: true,
      startX: e.pageX - plannerScrollRef.current.offsetLeft,
      scrollLeft: plannerScrollRef.current.scrollLeft,
    };
    plannerScrollRef.current.style.cursor = 'grabbing';
    plannerScrollRef.current.style.userSelect = 'none';
  };

  const handleDragEnd = () => {
    if (!plannerScrollRef.current) return;
    dragInfo.current = { isDragging: false, startX: 0, scrollLeft: 0 };
    plannerScrollRef.current.style.cursor = 'grab';
    plannerScrollRef.current.style.removeProperty('user-select');
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!dragInfo.current.isDragging || !plannerScrollRef.current) return;
    
    requestAnimationFrame(() => {
      if (!dragInfo.current.isDragging || !plannerScrollRef.current) return;
      const x = e.pageX - plannerScrollRef.current.offsetLeft;
      const walk = (x - dragInfo.current.startX) * 2; 
      plannerScrollRef.current.scrollLeft = dragInfo.current.scrollLeft - walk;
    });
  };

  const renderContent = () => {
    switch (view) {
      case 'landing': return <Landing onNavigate={setView} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />;
      
      case 'pantry': return (
        <div className="p-8 lg:p-14 flex flex-col lg:flex-row gap-14 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex-1 space-y-12">
            <div className="space-y-4">
              <h2 className="font-display text-[4rem] font-black text-ink dark:text-white tracking-tighter leading-none">Welcome Back!</h2>
              <p className="font-body text-[18px] text-slate-600 dark:text-cream/50 font-bold">Your kitchen is ready for something new.</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-5 rounded-[3.5rem] shadow-2xl flex items-center border border-slate-100 dark:border-slate-800 group focus-within:border-primary/50 transition-all duration-500">
               <input className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-black px-8 text-ink dark:text-white placeholder:text-slate-300 dark:placeholder:text-cream/10" placeholder="Add ingredient..." value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddIngredient(inputValue)} />
               <button onClick={() => handleAddIngredient(inputValue)} className="cta-btn !py-5 !px-12 !rounded-[2.5rem] shadow-primary/20">Add to Pantry</button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {COMMON_STAPLES.slice(0, 4).map(staple => (
                <button key={staple.name} onClick={() => handleAddIngredient(staple.name)} className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 flex flex-col items-center gap-5 border border-slate-100 dark:border-slate-800 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group shadow-sm">
                  <span className="material-symbols-outlined !text-[42px] group-hover:scale-110 transition-transform duration-500" style={{color: staple.color}}>{staple.icon}</span>
                  <span className="font-aesthetic text-[12px] font-black uppercase tracking-[0.2em] text-ink dark:text-white">{staple.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-[460px] bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col scale-[1.02]">
            <div className="p-12 pb-8 flex justify-between items-center">
               <h3 className="font-display text-3xl font-black text-ink dark:text-white tracking-tight">My Pantry</h3>
               <button onClick={() => setPantry([])} className="size-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-red-500 transition-all duration-300 shadow-sm"><span className="material-symbols-outlined text-[22px]">delete</span></button>
            </div>
            <div className="flex-1 p-12 overflow-y-auto max-h-[480px] no-scrollbar">
              <div className="space-y-5">
                {pantry.length === 0 ? (
                  <div className="h-56 flex flex-col items-center justify-center text-slate-200 dark:text-slate-800 gap-4 opacity-70">
                    <span className="material-symbols-outlined text-[64px]">kitchen</span>
                    <p className="font-aesthetic text-[10px] font-black uppercase tracking-[0.3em]">Kitchen is empty</p>
                  </div>
                ) : pantry.map(item => (
                  <div key={item.id} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] flex justify-between items-center group shadow-sm border border-slate-100 dark:border-slate-800 hover:border-primary/30 transition-all duration-500 hover:translate-x-1">
                    <span className="font-body text-[16px] font-black text-ink dark:text-white tracking-wide">{item.name}</span>
                    <button onClick={() => setPantry(pantry.filter(p => p.id !== item.id))} className="text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[20px]">close</span></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-12 pt-0">
               <button onClick={generateAndSetRecipes} disabled={pantry.length === 0} className="w-full py-7 bg-gradient-to-br from-gold to-gold-dk text-white rounded-[2.5rem] font-aesthetic text-[14px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-3 disabled:opacity-20 shadow-2xl shadow-gold/30 hover:scale-[1.02] transition-all duration-500">
                 <span className="material-symbols-outlined text-[22px]">flare</span> What can I cook?
               </button>
               {errorMsg && <p className="mt-6 text-center text-red-500 font-black text-xs animate-pulse tracking-widest uppercase">{errorMsg}</p>}
            </div>
          </div>
        </div>
      );

      case 'recommendations': return (
        <div className="p-14 max-w-7xl mx-auto w-full animate-in fade-in duration-1000">
           <div className="space-y-4 mb-16">
              <h2 className="font-display text-[4.5rem] font-black text-ink dark:text-white tracking-tighter leading-none">Chef's Feed</h2>
              <p className="font-body text-[19px] text-slate-600 dark:text-cream/50 font-bold italic">Hand-picked by AI for your palate.</p>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pb-32">
             {recommendations.map((recipe, i) => (
               <div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setView('recipe-details'); }} className="cursor-pointer group bg-white dark:bg-slate-900 rounded-[3.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-xl shadow-ink/5 hover:shadow-[0_60px_120px_-20px_rgba(10,8,6,0.12)] dark:hover:shadow-[0_60px_120px_-20px_rgba(0,0,0,0.8)] transition-all duration-700 hover:-translate-y-3" style={{ animationDelay: `${i * 100}ms` }}>
                 <RecipeImage src={recipe.image} alt={recipe.title} className="aspect-[4/3] group-hover:scale-105 transition-transform duration-1000" />
                 <div className="p-10">
                   <div className="flex justify-between mb-6">
                     <span className={`font-aesthetic text-[10px] font-black px-4 py-1.5 rounded-full border uppercase tracking-[0.2em] shadow-sm ${getDifficultyColor(recipe.difficulty)}`}>
                       {recipe.difficulty}
                     </span>
                     <span className="font-aesthetic text-[10px] font-black text-gold-dk dark:text-gold uppercase tracking-[0.2em] bg-gold/5 px-3 py-1.5 rounded-full">{recipe.matchPercentage}% match</span>
                   </div>
                   <h3 className="font-display text-[28px] font-black text-ink dark:text-white group-hover:text-primary transition-colors duration-500 leading-tight mb-4">{recipe.title}</h3>
                   <p className="font-body mt-4 text-slate-600 dark:text-slate-400 line-clamp-2 font-bold leading-relaxed italic">{recipe.description}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      );

      case 'cookbook': return (
        <div className="p-14 max-w-7xl mx-auto w-full animate-in fade-in duration-1000">
          <div className="flex flex-col lg:flex-row justify-between lg:items-end mb-16 gap-8">
            <div className="space-y-4">
              <h2 className="font-display text-[4.5rem] font-black text-ink dark:text-white tracking-tighter leading-none">Weekly Planner</h2>
              <p className="font-body text-[19px] text-slate-600 dark:text-cream/50 font-bold">Curate your gastronomic week.</p>
            </div>
            <button className="font-aesthetic px-10 py-5 bg-primary text-white rounded-[1.25rem] font-black text-[12px] uppercase tracking-[0.3em] flex items-center gap-3 hover:bg-gold-dk transition-all shadow-xl shadow-primary/20">
              <span className="material-symbols-outlined text-[20px]">auto_awesome</span> Smart Populate
            </button>
          </div>
          
          <div 
            ref={plannerScrollRef}
            onMouseDown={handleDragStart}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onMouseMove={handleDragMove}
            className="flex gap-10 overflow-x-auto pb-12 no-scrollbar px-2 -mx-2 cursor-grab active:cursor-grabbing"
          >
            {DAYS.map(day => (
              <div key={day} className="min-w-[340px] flex flex-col gap-8">
                <div className="flex items-center justify-between px-4">
                   <h3 className="font-display text-3xl font-black text-ink dark:text-white">{day}</h3>
                   <span className="font-aesthetic text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">3 Slots</span>
                </div>
                <div className="space-y-8">
                  {SLOTS.map(slot => (
                    <div key={slot} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl shadow-ink/5 hover:shadow-2xl hover:border-primary/20 transition-all duration-500 group min-h-[180px] flex flex-col justify-center relative hover:-translate-y-1">
                      <span className="absolute top-8 left-10 font-aesthetic text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.35em]">{slot}</span>
                      <div className="flex flex-col items-center justify-center gap-4 text-slate-300 dark:text-slate-700 group-hover:text-primary transition-all duration-500 cursor-pointer pt-4">
                        <div className="size-14 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-all duration-500 shadow-sm group-hover:shadow-md group-hover:rotate-6">
                          <span className="material-symbols-outlined text-[28px]">add</span>
                        </div>
                        <p className="font-aesthetic text-[11px] font-black uppercase tracking-widest">Plan {slot}</p>
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
        <div className="p-14 max-w-4xl mx-auto w-full animate-in fade-in duration-1000">
          <div className="flex justify-between items-end mb-16">
            <div className="space-y-4">
              <h2 className="font-display text-[4.5rem] font-black text-ink dark:text-white tracking-tighter leading-none">Grocery List</h2>
              <p className="font-body text-[19px] text-slate-600 dark:text-cream/50 font-bold">{groceryList.filter(i => !i.completed).length} essential items remaining.</p>
            </div>
            <button onClick={() => setGroceryList([])} className="font-aesthetic text-red-600 dark:text-red-500 font-black text-[11px] uppercase tracking-[0.25em] flex items-center gap-3 hover:opacity-70 transition-all px-6 py-3 bg-red-50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-transparent">
              <span className="material-symbols-outlined text-[18px]">clear_all</span> Clear All
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 mb-16 flex items-center group transition-all duration-500 focus-within:border-primary/50">
            <input 
              className="flex-1 bg-transparent border-none focus:ring-0 text-xl font-black px-10 text-ink dark:text-white placeholder:text-slate-200 dark:placeholder:text-cream/10" 
              placeholder="What else do you need?" 
              onKeyDown={e => {
                if(e.key === 'Enter') {
                  addGroceryItem(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
            />
            <button className="cta-btn !rounded-[2.5rem] !py-5 shadow-lg">Add Item</button>
          </div>

          <div className="space-y-16">
            {['Produce', 'Dairy', 'Meat', 'General'].map(cat => {
              const items = groceryList.filter(i => i.category === cat || (!i.category && cat === 'General'));
              if (items.length === 0) return null;
              return (
                <div key={cat} className="animate-in fade-in slide-in-from-left-4 duration-700">
                  <h4 className="font-aesthetic text-[11px] font-black text-gold-dk dark:text-gold uppercase tracking-[0.4em] mb-10 ml-6 opacity-70 border-l-2 border-gold/40 pl-5">{cat}</h4>
                  <div className="space-y-5">
                    {items.map(item => (
                      <div 
                        key={item.id} 
                        onClick={() => setGroceryList(groceryList.map(i => i.id === item.id ? {...i, completed: !i.completed} : i))}
                        className={`p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-center gap-6 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:translate-x-2 shadow-xl shadow-ink/5 ${item.completed ? 'opacity-30 grayscale' : ''}`}
                      >
                        <div className={`size-10 rounded-[1.25rem] border-2 flex items-center justify-center transition-all duration-500 ${item.completed ? 'bg-primary border-primary text-white scale-110 shadow-lg' : 'border-slate-200 dark:border-slate-800'}`}>
                          {item.completed && <span className="material-symbols-outlined text-[20px] font-black">check</span>}
                        </div>
                        <span className={`font-body text-[20px] font-black text-ink dark:text-white tracking-wide transition-all duration-500 ${item.completed ? 'line-through opacity-50' : ''}`}>{item.name}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setGroceryList(groceryList.filter(i => i.id !== item.id)); }}
                          className="ml-auto text-slate-300 dark:text-slate-800 hover:text-red-500 transition-all duration-300 active:scale-90"
                        >
                          <span className="material-symbols-outlined text-[24px]">delete</span>
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
          <div className="p-14 max-w-6xl mx-auto w-full space-y-20 pb-40 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <button onClick={() => setView('recommendations')} className="font-aesthetic flex items-center gap-4 font-black text-slate-400 hover:text-primary transition-all uppercase tracking-[0.4em] text-[11px] group bg-white dark:bg-slate-900/50 w-fit px-6 py-3 rounded-2xl border border-slate-100 dark:border-primary/20 shadow-xl shadow-ink/5">
              <span className="material-symbols-outlined group-hover:-translate-x-2 transition-transform duration-500">arrow_back</span> Back to feed
            </button>

            <div className="space-y-10">
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-6">
                   <span className={`font-aesthetic px-6 py-2 rounded-2xl border font-black uppercase tracking-[0.3em] text-[11px] shadow-md ${getDifficultyColor(selectedRecipe.difficulty)}`}>
                    {selectedRecipe.difficulty} Level
                  </span>
                  <span className="font-aesthetic text-[11px] font-black text-gold-dk dark:text-gold uppercase tracking-[0.35em] bg-gold/10 px-5 py-2 rounded-full border border-gold/20 shadow-md">{selectedRecipe.matchPercentage}% match</span>
                </div>
                <h1 className="font-display text-[5.5rem] lg:text-[7.5rem] font-black text-ink dark:text-white tracking-tighter leading-[0.9] flex-1 break-words drop-shadow-sm">{selectedRecipe.title}</h1>
              </div>
              
              <div className="flex flex-wrap items-center gap-10 pt-4">
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-8 py-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-ink/5 group">
                  <span className="material-symbols-outlined text-primary text-[28px] group-hover:scale-110 transition-transform duration-500">local_fire_department</span>
                  <span className="font-display text-2xl font-black text-ink dark:text-white">{selectedRecipe.calories}</span>
                </div>
                <div className="font-aesthetic flex items-center gap-10 text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">
                  <span className="flex items-center gap-3"><span className="material-symbols-outlined !text-[20px] text-primary/70">restaurant</span> {selectedRecipe.servings} Servings</span>
                  <span className="flex items-center gap-3"><span className="material-symbols-outlined !text-[20px] text-primary/70">timer</span> {selectedRecipe.prepTime} Prep</span>
                  <span className="flex items-center gap-3"><span className="material-symbols-outlined !text-[20px] text-primary/70">oven_gen</span> {selectedRecipe.cookTime} Cook</span>
                </div>
              </div>
            </div>

            <RecipeImage src={selectedRecipe.image} alt={selectedRecipe.title} className="w-full h-[650px] rounded-[5rem] shadow-[0_80px_160px_-40px_rgba(10,8,6,0.18)] dark:shadow-[0_80px_160px_-40px_rgba(0,0,0,0.9)] border-4 border-white dark:border-slate-900" />

            <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-24 items-start">
              <div className="bg-white dark:bg-slate-900 p-16 lg:p-20 rounded-[5rem] border border-slate-100 dark:border-slate-800 shadow-2xl space-y-16 lg:-mt-32 relative z-20 shadow-gold/5">
                <h3 className="font-display text-[3.5rem] font-black text-ink dark:text-white tracking-tight text-center lg:text-left">Ingredients</h3>
                <div className="space-y-8">
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex justify-between items-center text-xl font-black text-ink dark:text-white group border-b border-slate-100 dark:border-slate-800/50 pb-6 transition-all duration-500 hover:translate-x-1 hover:border-gold/30">
                      <span className="font-body text-slate-800 dark:text-slate-100 leading-tight flex-1 font-bold tracking-wide">{ing.name}</span>
                      <span className="font-display text-2xl text-primary font-black ml-8 shrink-0">{ing.amount}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-16 mt-16 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="font-aesthetic text-[10px] font-black text-gold-dk dark:text-gold uppercase tracking-[0.5em] mb-12 text-center opacity-70">Nutrition Breakdown</h4>
                  <div className="grid grid-cols-3 gap-8">
                    {[
                      { label: 'Protein', val: selectedRecipe.nutrition.protein, color: 'text-[#0f9d27] dark:text-[#13ec37]' },
                      { label: 'Carbs', val: selectedRecipe.nutrition.carbs, color: 'text-[#c2410c] dark:text-[#f97316]' },
                      { label: 'Fats', val: selectedRecipe.nutrition.fats, color: 'text-blue-700 dark:text-blue-400' }
                    ].map(nut => (
                      <div key={nut.label} className="text-center space-y-4 p-6 rounded-[2.5rem] bg-slate-50 dark:bg-slate-800/50 shadow-inner border border-transparent hover:border-primary/10 transition-all duration-500 group">
                        <p className="font-aesthetic text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">{nut.label}</p>
                        <p className={`font-display text-2xl font-black ${nut.color} group-hover:scale-110 transition-transform duration-500`}>{nut.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-16">
                <h3 className="font-display text-[3.5rem] font-black text-ink dark:text-white tracking-tight text-center lg:text-left">Instructions</h3>
                <div className="space-y-14">
                  {selectedRecipe.steps.map((step, i) => (
                    <div key={i} className="flex gap-10 group animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${i * 150}ms` }}>
                      <div className="size-14 rounded-[1.5rem] bg-primary/10 text-primary flex items-center justify-center font-display text-2xl font-black shrink-0 shadow-md border border-primary/20 transition-all duration-700 group-hover:scale-110 group-hover:bg-primary group-hover:text-white group-hover:rotate-6">
                        {i + 1}
                      </div>
                      <p className="font-body text-[19px] font-bold text-slate-700 dark:text-slate-300 leading-[1.8] pt-1 transition-colors duration-500 group-hover:text-ink dark:group-hover:text-white">
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      default: return <div className="p-20 text-center font-display text-2xl font-black text-slate-400">Section under construction</div>;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row transition-colors duration-700 relative bg-cream dark:bg-ink text-ink dark:text-cream`}>
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30 dark:opacity-50">
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
        <div className="fixed inset-0 z-[200] bg-ink/65 dark:bg-slate-900/60 backdrop-blur-3xl flex items-center justify-center p-6">
          <div className="bg-white dark:bg-slate-900 p-20 rounded-[5rem] flex flex-col items-center gap-12 text-center shadow-[0_100px_200px_-50px_rgba(0,0,0,0.5)] border border-primary/20 scale-105">
            <div className="size-32 border-[8px] border-primary/10 border-t-primary rounded-full animate-spin shadow-2xl shadow-primary/30" />
            <div className="space-y-4">
              <h4 className="font-display font-black text-[3.5rem] text-ink dark:text-white tracking-tight leading-none">Analyzing Flavors...</h4>
              <p className="font-aesthetic text-gold-dk dark:text-gold font-black uppercase tracking-[0.5em] text-[11px] animate-pulse">Curating gourmet excellence</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
