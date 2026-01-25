import React, { useState, useEffect, useMemo } from 'react';
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

const UNIT_OPTIONS = ['pcs', 'g', 'kg', 'ml', 'l', 'cup', 'tbsp', 'tsp', 'oz', 'lb'];

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
  <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 p-6 z-40 transition-colors">
    <div className="flex items-center gap-2 mb-10 px-2 cursor-pointer group" onClick={() => onNavigate('pantry')}>
      <div className="size-8 flex items-center justify-center bg-primary rounded-lg group-hover:rotate-12 transition-transform">
        <span className="material-symbols-outlined !text-[20px] text-white font-black">nutrition</span>
      </div>
      <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">ChefMistri</h2>
    </div>

    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 mb-2">Main Menu</p>
      {[
        { id: 'pantry', label: 'My Pantry', icon: 'inventory_2' },
        { id: 'recommendations', label: 'Recipe Feed', icon: 'restaurant' },
        { id: 'cookbook', label: 'Planner', icon: 'calendar_today' },
        { id: 'shopping-list', label: 'Groceries', icon: 'shopping_basket' }
      ].map((item) => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id as ViewState)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
            currentView === item.id 
              ? 'bg-primary/10 text-primary dark:bg-primary/20' 
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined">{item.icon}</span>
          <span className="text-sm">{item.label}</span>
        </button>
      ))}
    </div>

    <div className="mt-auto">
      <div className="bg-primary/5 dark:bg-primary/10 rounded-3xl p-5 border border-primary/10">
        <h4 className="font-black text-slate-900 dark:text-white text-sm mb-1">Upgrade to Pro</h4>
        <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed mb-4 font-medium">Get personalized AI meal plans and nutritional analysis.</p>
        <button className="w-full py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-hover transition-all active:scale-95 shadow-sm">
          Go Pro
        </button>
      </div>
    </div>
  </aside>
);

const Header: React.FC<{ 
  onNavigate: (view: ViewState) => void; 
  onSearch: (val: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}> = ({ onNavigate, onSearch, isDarkMode, toggleDarkMode }) => (
  <header className="h-20 flex items-center justify-between px-10 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800 w-full shrink-0 z-30 transition-colors">
    <div className="flex-1 max-w-md">
      <div className="relative group">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-[20px] group-focus-within:text-primary transition-colors">search</span>
        <input 
          type="text" 
          placeholder="Search recipes..." 
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('recommendations')}
          className="w-full pl-12 pr-4 py-2.5 bg-slate-50/50 dark:bg-slate-800 border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-primary/20 dark:text-white transition-all"
        />
      </div>
    </div>
    <div className="flex items-center gap-6">
      <button 
        onClick={toggleDarkMode}
        className="size-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      >
        <span className="material-symbols-outlined text-[20px]">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
      </button>
      <button className="text-sm font-bold text-slate-900 dark:text-slate-300 hover:text-primary transition-colors">Log In</button>
      <button 
        onClick={() => onNavigate('pantry')}
        className="bg-primary text-white text-sm font-black px-8 py-3 rounded-full hover:bg-primary-hover transition-all shadow-sm active:scale-95"
      >
        Get Started
      </button>
    </div>
  </header>
);

export default function App() {
  const [view, setView] = useState<ViewState>('pantry');
  const [pantry, setPantry] = useState<Ingredient[]>([]);
  const [recommendations, setRecommendations] = useState<Recipe[]>(MOCK_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [preferences] = useState<UserPreferences>(INITIAL_PREFERENCES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputQuantity, setInputQuantity] = useState<number>(1);
  const [inputUnit, setInputUnit] = useState<string>('pcs');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [mealPlan, setMealPlan] = useState<any>({
    'MON 23': { Breakfast: null, Lunch: MOCK_RECIPES[0], Dinner: MOCK_RECIPES[1] },
    'TUE 24': { Breakfast: { title: 'Greek Yogurt Bowl', calories: '320 kcal' }, Lunch: null, Dinner: { title: 'Chicken Stir-fry', calories: '480 kcal' } },
    'WED 25': { Breakfast: null, Lunch: { title: 'Turkey Club Sandwich', calories: '510 kcal' }, Dinner: null },
    'THU 26': { Breakfast: null, Lunch: null, Dinner: null },
  });

  const SAVED_RECIPES_MOCK: Recipe[] = useMemo(() => [
    { ...MOCK_RECIPES[0], id: 's1', title: 'Avocado Toast', cookTime: '15 mins', calories: '320 kcal' },
    { ...MOCK_RECIPES[1], id: 's2', title: 'Lentil Burger', cookTime: '25 mins', calories: '410 kcal' },
    { ...MOCK_RECIPES[0], id: 's3', title: 'Pesto Pasta', cookTime: '20 mins', calories: '480 kcal' },
    { ...MOCK_RECIPES[1], id: 's4', title: 'Tuna Poke Bowl', cookTime: '15 mins', calories: '380 kcal' },
    { ...MOCK_RECIPES[0], id: 's5', title: 'Veggie Ramen', cookTime: '30 mins', calories: '420 kcal' },
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
        [slot]: { title: mealToAdd.title, calories: mealToAdd.calories }
      }
    }));
  };

  const handleAddIngredient = (name: string, qty?: number, unit?: string) => {
    const finalName = name.trim();
    if (!finalName) return;
    
    const exists = pantry.find(p => p.name.toLowerCase() === finalName.toLowerCase());
    if (exists) return;
    
    const newItem: Ingredient = { 
      id: Date.now().toString(), 
      name: finalName, 
      quantity: qty ?? inputQuantity, 
      unit: unit ?? inputUnit, 
      category: 'Pantry' 
    };
    
    setPantry(prev => [...prev, newItem]);
    setInputValue('');
    setInputQuantity(1);
    setInputUnit('pcs');
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
      case 'pantry':
        return (
          <div className="flex flex-1 p-10 gap-10">
            <div className="flex-1 flex flex-col gap-10">
              {/* Refined Multi-part Input Bar */}
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none p-2 flex items-center border border-slate-100 dark:border-slate-800 transition-colors focus-within:ring-2 focus-within:ring-primary/20">
                <div className="pl-6 text-slate-300">
                  <span className="material-symbols-outlined">search</span>
                </div>
                
                {/* Ingredient Name */}
                <input 
                  className="flex-[2] border-none focus:ring-0 text-lg font-bold px-4 text-slate-900 dark:text-white dark:bg-transparent placeholder:text-slate-300 placeholder:font-medium" 
                  placeholder="Ingredient name..." 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient(inputValue)} 
                />
                
                <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-2" />

                {/* Quantity */}
                <div className="flex items-center px-4 gap-2">
                  <span className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Qty</span>
                  <input 
                    type="number"
                    min="1"
                    className="w-16 border-none focus:ring-0 text-lg font-black text-primary bg-transparent text-center p-0"
                    value={inputQuantity}
                    onChange={(e) => setInputQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-2" />

                {/* Units Dropdown */}
                <div className="relative px-4">
                  <select 
                    className="border-none focus:ring-0 bg-transparent text-sm font-black text-slate-600 dark:text-slate-300 appearance-none pr-8 cursor-pointer uppercase tracking-widest"
                    value={inputUnit}
                    onChange={(e) => setInputUnit(e.target.value)}
                  >
                    {UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-sm">expand_more</span>
                </div>

                <button 
                  onClick={() => handleAddIngredient(inputValue)} 
                  className="bg-primary text-white font-black px-10 py-4 rounded-[1.8rem] flex items-center gap-2 hover:bg-primary-hover transition-all active:scale-95 shadow-lg shadow-primary/20 shrink-0 ml-2"
                >
                  <span className="material-symbols-outlined">add</span>
                  Add
                </button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between"><h3 className="text-2xl font-black text-slate-900 dark:text-white">Quick Add</h3><span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">Most common items</span></div>
                <div className="grid grid-cols-4 gap-6">
                  {COMMON_STAPLES.map((staple) => (
                    <button key={staple.name} onClick={() => handleAddIngredient(staple.name, 1, 'pcs')} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 flex flex-col items-center gap-4 border border-slate-50 dark:border-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-primary/5 transition-all group">
                      <div className="size-16 rounded-full flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${staple.color === 'orange' ? '#ff9800' : staple.color === 'blue' ? '#2196f3' : staple.color === 'red' ? '#f44336' : staple.color === 'yellow' ? '#ffeb3b' : staple.color === 'purple' ? '#9c27b0' : '#9e9e9e'}15` }}>
                        <span className="material-symbols-outlined text-3xl" style={{color: staple.color}}>{staple.icon}</span>
                      </div>
                      <span className="font-black text-slate-900 dark:text-slate-200">{staple.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-[380px] shrink-0">
              <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl shadow-slate-200/80 dark:shadow-none border border-slate-50 dark:border-slate-800 flex flex-col h-full overflow-hidden transition-colors">
                <div className="p-8 pb-4 flex items-center justify-between">
                  <div><h3 className="text-2xl font-black text-slate-900 dark:text-white">My Pantry</h3><p className="text-slate-400 dark:text-slate-500 text-xs font-bold mt-1 uppercase tracking-widest">{pantry.length} ingredients added</p></div>
                  <button onClick={() => setPantry([])} className="size-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><span className="material-symbols-outlined">delete</span></button>
                </div>
                <div className="p-8 flex-1 overflow-y-auto">
                  <div className="flex flex-col gap-3">
                    {pantry.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl group animate-in slide-in-from-right-2">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm"><span className="material-symbols-outlined text-[18px] text-slate-400">restaurant</span></div>
                            <span className="font-black text-slate-800 dark:text-slate-200">{item.name}</span>
                          </div>
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest ml-11 mt-1">{item.quantity} {item.unit}</span>
                        </div>
                        <button onClick={() => setPantry(pantry.filter(p => p.id !== item.id))} className="text-slate-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-lg">close</span></button>
                      </div>
                    ))}
                    {pantry.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-20 opacity-20 dark:invert">
                        <span className="material-symbols-outlined text-6xl mb-4">kitchen</span>
                        <p className="font-black italic text-center">Add ingredients to start</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-8">
                  <button disabled={pantry.length === 0} onClick={generateAndSetRecipes} className="w-full py-5 bg-primary text-white rounded-[1.8rem] font-black text-lg shadow-xl shadow-primary/20 disabled:opacity-50 hover:bg-primary-hover transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined font-bold">auto_awesome</span>Generate Recipes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'cookbook':
        return (
          <div className="flex flex-1 p-10 h-full overflow-hidden">
            <div className="flex-1 flex flex-col gap-8 h-full">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-1">Weekly Planner</h1>
                  <p className="text-slate-400 dark:text-slate-500 font-bold">Plan your nutrition for the week</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-full border border-slate-100 dark:border-slate-800 transition-colors">
                    <button className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Previous</button>
                    <div className="px-6 py-2 text-sm font-black text-slate-900 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700">Oct 23 – Oct 29</div>
                    <button className="px-6 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">Next</button>
                  </div>
                  
                  <button 
                    onClick={() => setView('shopping-list')}
                    className="px-8 py-3.5 bg-primary text-white rounded-full font-black text-sm shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px] font-bold">auto_fix_high</span>
                    Generate Grocery List
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto pb-4 scroll-smooth">
                <div className="flex gap-6 min-w-max h-full pb-8">
                  {Object.keys(mealPlan).map((dayKey) => (
                    <div key={dayKey} className="w-80 flex flex-col gap-6">
                      <div className="flex flex-col items-center gap-1 mb-2">
                        <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{dayKey.split(' ')[0]}</span>
                        <span className="text-3xl font-black text-slate-900 dark:text-white">{dayKey.split(' ')[1]}</span>
                        <div className={`w-12 h-1 rounded-full mt-2 ${dayKey === 'MON 23' ? 'bg-primary' : 'bg-transparent'}`} />
                      </div>
                      
                      {(['Breakfast', 'Lunch', 'Dinner'] as MealSlot[]).map((slot) => {
                        const meal = mealPlan[dayKey][slot];
                        return (
                          <div key={slot} className="flex flex-col gap-3 flex-1 min-h-[160px]">
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">{slot}</span>
                            {meal ? (
                              <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-sm hover:shadow-md dark:hover:border-primary/30 transition-all group relative overflow-hidden flex flex-col justify-center">
                                <h4 className="font-black text-slate-900 dark:text-white text-lg leading-tight mb-2 pr-4">{meal.title}</h4>
                                <div className="inline-flex px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full w-fit">
                                  {meal.calories || '450 kcal'}
                                </div>
                                <button 
                                  onClick={() => setMealPlan(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], [slot]: null } }))}
                                  className="absolute top-6 right-6 text-slate-200 group-hover:text-red-400 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">close</span>
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => addMealToPlan(dayKey, slot)}
                                className="flex-1 bg-slate-50/30 dark:bg-slate-800/20 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] flex items-center justify-center group hover:bg-white dark:hover:bg-slate-800 hover:border-primary/20 transition-all"
                              >
                                <div className="size-12 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm text-slate-300 group-hover:text-primary transition-colors">
                                  <span className="material-symbols-outlined">add</span>
                                </div>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'shopping-list':
        return (
          <section className="p-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">Grocery List</h1>
                <p className="text-slate-400 dark:text-slate-500 font-bold">Everything you need for this week's meals</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">print</span> Print
                </button>
                <button className="px-6 py-3 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95">
                  Share List
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
              {[
                { category: 'Produce', items: ['Tomatoes', 'Bell Peppers', 'Onion', 'Garlic', 'Spinach'] },
                { category: 'Dairy & Eggs', items: ['Eggs', 'Greek Yogurt', 'Milk', 'Cheese'] },
                { category: 'Pantry', items: ['Rice', 'Chicken Breast', 'Olive Oil', 'Salt & Pepper'] },
                { category: 'Others', items: ['Lentils', 'Tuna', 'Bread'] }
              ].map((cat, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 transition-colors shadow-sm">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 border-b border-slate-50 dark:border-slate-800 pb-4">{cat.category}</h3>
                  <div className="flex flex-col gap-4">
                    {cat.items.map((item, idx) => (
                      <label key={idx} className="flex items-center gap-4 cursor-pointer group">
                        <div className="relative size-6 shrink-0">
                          <input type="checkbox" className="peer absolute opacity-0 cursor-pointer" />
                          <div className="size-full rounded-lg border-2 border-slate-100 dark:border-slate-800 peer-checked:bg-primary peer-checked:border-primary transition-all" />
                          <span className="material-symbols-outlined text-white absolute inset-0 text-sm flex items-center justify-center font-black opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 font-bold group-hover:text-primary transition-colors">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'recommendations':
        return (
          <section className="p-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-y-auto">
            <div className="mb-10">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">Recipe Ideas</h1>
              <p className="text-slate-500 dark:text-slate-400 font-bold">Tailored suggestions based on your pantry</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-20">
              {filteredRecommendations.map(recipe => (
                <div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setView('recipe-details'); }} className="cursor-pointer group bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl dark:hover:shadow-primary/5 transition-all border border-slate-100 dark:border-slate-800 flex flex-col">
                  <RecipeImage src={recipe.image} alt={recipe.title} className="aspect-[4/3]" />
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase rounded tracking-widest">{recipe.difficulty}</span>
                      <div className="flex items-center gap-1 text-primary">
                        <span className="material-symbols-outlined text-sm font-bold">star</span>
                        <span className="text-sm font-black">{recipe.matchPercentage}% match</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors">{recipe.title}</h3>
                    <p className="text-slate-400 dark:text-slate-500 font-bold text-sm leading-relaxed mb-6 line-clamp-2">{recipe.description}</p>
                    <div className="flex items-center gap-6 text-xs font-black text-slate-300 dark:text-slate-600">
                      <div className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">schedule</span>{recipe.cookTime}</div>
                      <div className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">restaurant</span>{recipe.servings} servings</div>
                    </div>
                  </div>
                </div>
              ))}
              {filteredRecommendations.length === 0 && (
                <div className="col-span-full text-center py-40">
                  <p className="text-slate-400 font-black text-2xl italic">No recipes found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'recipe-details':
        if (!selectedRecipe) return null;
        return (
          <main className="w-full max-w-6xl mx-auto p-10 animate-in fade-in duration-500 overflow-y-auto">
            <button onClick={() => setView('recommendations')} className="flex items-center gap-2 font-black text-slate-300 hover:text-primary transition-colors mb-10">
              <span className="material-symbols-outlined">arrow_back</span> Back to Recipes
            </button>
            
            <div className="flex flex-col gap-12 pb-24">
              {/* Title and Intro */}
              <div className="flex flex-col gap-4">
                <h1 className="text-6xl font-black text-slate-900 dark:text-white leading-tight">{selectedRecipe.title}</h1>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-primary/10 text-primary font-black text-sm rounded-2xl">
                    <span className="material-symbols-outlined text-lg">local_fire_department</span>
                    {selectedRecipe.calories}
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black text-sm rounded-2xl">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                    {selectedRecipe.cookTime}
                  </div>
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black text-sm rounded-2xl">
                    <span className="material-symbols-outlined text-lg">restaurant</span>
                    {selectedRecipe.servings} servings
                  </div>
                </div>
                <p className="text-xl font-bold text-slate-400 dark:text-slate-500 leading-relaxed max-w-3xl mt-4">{selectedRecipe.description}</p>
              </div>

              {/* Main Visuals Row: Image Left, Ingredients Right */}
              <div className="flex flex-col lg:flex-row gap-10 items-stretch">
                <div className="lg:w-3/5 w-full h-[500px]">
                  <RecipeImage src={selectedRecipe.image} alt={selectedRecipe.title} className="w-full h-full rounded-[4rem] shadow-2xl shadow-slate-200/50 dark:shadow-none object-cover" />
                </div>
                
                <div className="lg:w-2/5 w-full bg-slate-50 dark:bg-slate-900 p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 transition-colors shadow-sm">
                  <h3 className="text-3xl font-black mb-10 text-slate-900 dark:text-white tracking-tight">Ingredients</h3>
                  <div className="flex flex-col gap-8">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center group">
                        <span className="text-xl font-black text-slate-900 dark:text-slate-200 group-hover:text-primary transition-colors">{ing.name}</span>
                        <span className="text-primary text-xl font-black">{ing.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nutrition Facts Bar */}
              <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <h3 className="text-2xl font-black mb-8 text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  Nutrition Facts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protein</span>
                    <div className="text-4xl font-black text-slate-900 dark:text-white">{selectedRecipe.nutrition.protein}</div>
                    <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{width: '70%'}}></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carbohydrates</span>
                    <div className="text-4xl font-black text-slate-900 dark:text-white">{selectedRecipe.nutrition.carbs}</div>
                    <div className="w-full h-1.5 bg-blue-500/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{width: '60%'}}></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fats</span>
                    <div className="text-4xl font-black text-slate-900 dark:text-white">{selectedRecipe.nutrition.fats}</div>
                    <div className="w-full h-1.5 bg-orange-500/10 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500" style={{width: '45%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructions Section below the main row */}
              {selectedRecipe.steps && (
                <div className="bg-white dark:bg-slate-900 p-16 rounded-[4rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                  <h3 className="text-3xl font-black mb-10 text-slate-900 dark:text-white">Instructions</h3>
                  <div className="flex flex-col gap-10">
                    {selectedRecipe.steps.map((step, i) => (
                      <div key={i} className="flex gap-8 items-start">
                        <span className="size-12 shrink-0 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black text-xl">{i + 1}</span>
                        <p className="text-slate-600 dark:text-slate-400 font-bold text-xl leading-relaxed pt-1">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </main>
        );

      default:
        return <div className="p-20 text-center font-bold text-slate-300">Coming Soon</div>;
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors ${isDarkMode ? 'bg-[#0a0f0b]' : 'bg-[#F9FCFA]'}`}>
      <Sidebar currentView={view} onNavigate={setView} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header 
          onNavigate={setView} 
          onSearch={setSearchQuery} 
          isDarkMode={isDarkMode} 
          toggleDarkMode={toggleDarkMode} 
        />
        <main className="flex-1 flex flex-col overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      
      {isGenerating && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 p-16 rounded-[4rem] shadow-2xl flex flex-col items-center gap-10 text-center max-w-md border border-slate-100 dark:border-slate-800">
            <div className="size-24 border-[8px] border-primary/20 border-t-primary rounded-full animate-spin" />
            <div><h4 className="font-black text-3xl text-slate-900 dark:text-white mb-3">Chef AI is Cooking...</h4><p className="text-slate-400 dark:text-slate-500 font-bold text-lg">Dreaming up gourmet recipes and high-res photos just for you.</p></div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] bg-[#e63946] text-white px-10 py-6 rounded-3xl font-bold shadow-2xl flex items-center gap-6 max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-300">
          <div className="bg-white/20 p-3 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-white text-[28px]">error_outline</span></div>
          <div className="flex-1"><p className="text-sm opacity-90 font-black mb-0.5">Configuration Alert:</p><p className="text-sm leading-tight">{errorMsg}</p></div>
          <button onClick={() => setErrorMsg(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><span className="material-symbols-outlined text-2xl">close</span></button>
        </div>
      )}
    </div>
  );
}