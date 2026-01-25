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

interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  completed: boolean;
  amount?: string;
}

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
    <div className="flex items-center gap-3 mb-12 px-2 cursor-pointer group" onClick={() => onNavigate('pantry')}>
      <div className="size-10 flex items-center justify-center bg-primary rounded-2xl group-hover:rotate-6 transition-transform shadow-lg shadow-primary/20">
        <span className="material-symbols-outlined !text-[24px] text-white font-black">nutrition</span>
      </div>
      <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">ChefMistri</h2>
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
      <div className="lg:hidden flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('pantry')}>
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
        className="size-10 md:size-12 flex items-center justify-center rounded-2xl bg-slate-100/50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95"
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

  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([
    { id: '1', name: 'Roma Tomatoes', category: 'Produce', completed: false, amount: '4 large' },
    { id: '2', name: 'Red Bell Peppers', category: 'Produce', completed: true, amount: '3' },
    { id: '3', name: 'Greek Yogurt', category: 'Dairy & Eggs', completed: false, amount: '500g' },
    { id: '4', name: 'Chicken Breast', category: 'Meat', completed: false, amount: '1kg' },
    { id: '5', name: 'Basmati Rice', category: 'Pantry', completed: false, amount: '2kg' },
    { id: '6', name: 'Organic Honey', category: 'Pantry', completed: true, amount: '1 jar' },
  ]);
  const [groceryInput, setGroceryInput] = useState('');

  const [mealPlan, setMealPlan] = useState<Record<string, Record<MealSlot, { title: string; calories?: string } | null>>>({
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
      case 'pantry':
        return (
          <div className="flex flex-col lg:flex-row flex-1 p-4 md:p-8 lg:p-12 gap-8 md:gap-12">
            <div className="flex-1 flex flex-col gap-8 md:gap-12">
              <div className="flex flex-col gap-4">
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">Welcome Back!</h2>
                <p className="text-slate-500 font-bold">Add ingredients to your pantry to get started.</p>
              </div>

              {/* Main Input Component */}
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/50 dark:shadow-none p-3 md:p-4 flex flex-col md:flex-row items-center border border-slate-100 dark:border-slate-800 transition-colors focus-within:ring-4 focus-within:ring-primary/10">
                <div className="flex w-full items-center">
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

                <div className="flex w-full md:w-auto items-center justify-between md:justify-start px-4 py-4 md:py-0 border-t md:border-t-0 border-slate-50 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Quantity</span>
                    <input 
                      type="number"
                      min="1"
                      className="w-14 md:w-20 border-none focus:ring-0 text-lg md:text-xl font-black text-primary bg-transparent text-center p-0"
                      value={inputQuantity}
                      onChange={(e) => setInputQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  <div className="h-8 w-px bg-slate-100 dark:bg-slate-800 mx-6" />

                  <div className="relative">
                    <select 
                      className="border-none focus:ring-0 bg-transparent text-sm md:text-base font-black text-slate-600 dark:text-slate-300 appearance-none pr-8 cursor-pointer uppercase tracking-widest"
                      value={inputUnit}
                      onChange={(e) => setInputUnit(e.target.value)}
                    >
                      {UNIT_OPTIONS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 text-lg">unfold_more</span>
                  </div>
                </div>

                <button 
                  onClick={() => handleAddIngredient(inputValue)} 
                  className="w-full md:w-auto bg-primary text-white font-black px-8 md:px-14 py-4 md:py-6 rounded-[1.8rem] md:rounded-[2rem] flex items-center justify-center gap-3 hover:bg-primary-hover transition-all active:scale-95 shadow-xl shadow-primary/30 shrink-0"
                >
                  <span className="material-symbols-outlined text-[20px] md:text-[24px]">auto_awesome</span>
                  <span className="text-base md:text-lg">Add to Pantry</span>
                </button>
              </div>

              {/* Quick Add Section */}
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Quick Add Staples</h3>
                  <button className="text-primary font-black text-sm hover:underline">See All</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
                  {COMMON_STAPLES.map((staple) => (
                    <button key={staple.name} onClick={() => handleAddIngredient(staple.name, 1, 'pcs')} className="bg-white dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 flex flex-col items-center gap-4 md:gap-6 border border-slate-50 dark:border-slate-800 hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-primary/5 transition-all group active:scale-95">
                      <div className="size-12 md:size-16 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12" style={{ backgroundColor: `${staple.color === 'orange' ? '#ff9800' : staple.color === 'blue' ? '#2196f3' : staple.color === 'red' ? '#f44336' : staple.color === 'yellow' ? '#ffeb3b' : staple.color === 'purple' ? '#9c27b0' : '#9e9e9e'}15` }}>
                        <span className="material-symbols-outlined text-[24px] md:text-[32px]" style={{color: staple.color}}>{staple.icon}</span>
                      </div>
                      <span className="font-black text-sm md:text-base text-slate-900 dark:text-slate-200">{staple.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pantry List - Responsive Panel */}
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
                  <button onClick={() => setPantry([])} className="size-10 md:size-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-90">
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
                        <button onClick={() => setPantry(pantry.filter(p => p.id !== item.id))} className="text-slate-300 hover:text-red-500 transition-all p-2 rounded-xl hover:bg-white active:scale-90">
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
          <div className="flex flex-col flex-1 p-4 md:p-8 lg:p-12 h-full overflow-hidden mb-24 md:mb-0">
            <div className="flex flex-col gap-8 md:gap-12 h-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                  <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Weekly Planner</h1>
                  <p className="text-slate-400 font-bold text-base md:text-lg">Design your perfect culinary week.</p>
                </div>
                
                <button 
                  onClick={() => setView('shopping-list')}
                  className="w-full sm:w-auto px-8 py-4 bg-primary text-white rounded-full font-black text-base shadow-2xl shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95 flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined text-[24px] font-black">checklist</span>
                  Generate Groceries
                </button>
              </div>

              <div className="flex-1 overflow-x-auto pb-6 snap-x snap-mandatory no-scrollbar">
                <div className="flex gap-6 md:gap-10 min-w-max h-full pb-6">
                  {Object.keys(mealPlan).map((dayKey) => (
                    <div key={dayKey} className="w-[280px] md:w-[380px] flex flex-col gap-6 md:gap-8 snap-center">
                      <div className="flex flex-col items-center gap-2 mb-2">
                        <span className="text-[11px] md:text-[13px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">{dayKey.split(' ')[0]}</span>
                        <div className="flex items-center gap-3">
                           <span className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white">{dayKey.split(' ')[1]}</span>
                           <span className="w-2 h-2 bg-primary rounded-full mt-2"></span>
                        </div>
                      </div>
                      
                      {(['Breakfast', 'Lunch', 'Dinner'] as MealSlot[]).map((slot) => {
                        const meal = mealPlan[dayKey][slot];
                        return (
                          <div key={slot} className="flex flex-col gap-3 flex-1 min-h-[160px] md:min-h-[200px]">
                            <span className="text-[10px] md:text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] px-2">{slot}</span>
                            {meal ? (
                              <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-10 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all group relative overflow-hidden flex flex-col justify-center active:scale-[0.98]">
                                <h4 className="font-black text-slate-900 dark:text-white text-lg md:text-xl leading-tight mb-3 pr-6">{meal.title}</h4>
                                <div className="inline-flex px-4 py-1.5 bg-primary/10 text-primary text-[10px] md:text-[11px] font-black rounded-full w-fit uppercase tracking-widest">
                                  {meal.calories || '450 kcal'}
                                </div>
                                <button 
                                  onClick={() => setMealPlan(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], [slot]: null } }))}
                                  className="absolute top-6 md:top-8 right-6 md:right-8 text-slate-200 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-50"
                                >
                                  <span className="material-symbols-outlined text-[18px] md:text-[22px]">close</span>
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => addMealToPlan(dayKey, slot)}
                                className="flex-1 bg-slate-50/20 dark:bg-slate-800/10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] md:rounded-[3rem] flex items-center justify-center group hover:bg-white dark:hover:bg-slate-800 hover:border-primary/30 transition-all active:scale-[0.98]"
                              >
                                <div className="size-12 md:size-16 rounded-3xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-md text-slate-300 group-hover:text-primary transition-all group-hover:rotate-90">
                                  <span className="material-symbols-outlined text-[24px] md:text-[32px]">add</span>
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
                          className="size-10 md:size-12 rounded-2xl flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 md:opacity-0 group-hover/item:opacity-100 transition-all no-print active:scale-90"
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
              {filteredRecommendations.length === 0 && (
                <div className="col-span-full text-center py-32 md:py-60">
                  <span className="material-symbols-outlined text-[64px] md:text-[80px] text-slate-100 mb-6">search_off</span>
                  <p className="text-slate-400 font-black text-2xl md:text-4xl italic tracking-tighter">No recipes found for "{searchQuery}"</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'recipe-details':
        if (!selectedRecipe) return null;
        return (
          <main className="w-full max-w-7xl mx-auto p-4 md:p-8 lg:p-12 animate-in fade-in duration-500 overflow-y-auto mb-24 md:mb-0">
            <button onClick={() => setView('recommendations')} className="flex items-center gap-3 font-black text-slate-300 hover:text-primary transition-all mb-8 md:mb-14 text-base md:text-lg group">
              <span className="material-symbols-outlined text-[20px] md:text-[24px] group-hover:-translate-x-2 transition-transform">arrow_back</span> 
              Back to feed
            </button>
            
            <div className="flex flex-col gap-10 md:gap-20 pb-16 md:pb-32">
              <div className="flex flex-col gap-6">
                <h1 className="text-4xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tighter">{selectedRecipe.title}</h1>
                <div className="flex flex-wrap items-center gap-3 md:gap-5 mt-4">
                  <div className="flex items-center gap-2 md:gap-3 px-5 md:px-8 py-3 md:py-4 bg-primary/10 text-primary font-black text-xs md:text-lg rounded-[1.5rem] md:rounded-[2rem] shadow-sm">
                    <span className="material-symbols-outlined text-[20px] md:text-[28px]">local_fire_department</span>
                    {selectedRecipe.calories}
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 px-5 md:px-8 py-3 md:py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black text-xs md:text-lg rounded-[1.5rem] md:rounded-[2rem]">
                    <span className="material-symbols-outlined text-[20px] md:text-[28px]">schedule</span>
                    {selectedRecipe.cookTime}
                  </div>
                  <div className="flex items-center gap-2 md:gap-3 px-5 md:px-8 py-3 md:py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 font-black text-xs md:text-lg rounded-[1.5rem] md:rounded-[2rem]">
                    <span className="material-symbols-outlined text-[20px] md:text-[28px]">group</span>
                    {selectedRecipe.servings} Servings
                  </div>
                </div>
                <p className="text-lg md:text-2xl lg:text-3xl font-bold text-slate-400 dark:text-slate-500 leading-relaxed max-w-4xl mt-6 md:mt-8">{selectedRecipe.description}</p>
              </div>

              <div className="flex flex-col xl:flex-row gap-10 md:gap-20 items-stretch">
                <div className="xl:w-3/5 w-full h-[320px] md:h-[600px] lg:h-[700px]">
                  <RecipeImage src={selectedRecipe.image} alt={selectedRecipe.title} className="w-full h-full rounded-[3rem] md:rounded-[5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none object-cover" />
                </div>
                
                <div className="xl:w-2/5 w-full bg-slate-50 dark:bg-slate-900 p-10 md:p-16 rounded-[3rem] md:rounded-[5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:border-primary/20">
                  <h3 className="text-3xl md:text-4xl lg:text-5xl font-black mb-10 md:mb-16 text-slate-900 dark:text-white tracking-tight">Ingredients</h3>
                  <div className="flex flex-col gap-6 md:gap-12">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center group/ing">
                        <span className="text-lg md:text-2xl font-black text-slate-900 dark:text-slate-200 group-hover/ing:text-primary transition-colors">{ing.name}</span>
                        <div className="flex items-center gap-4">
                           <div className="h-px w-8 md:w-16 bg-slate-200 dark:bg-slate-800 group-hover/ing:w-24 transition-all"></div>
                           <span className="text-primary text-lg md:text-2xl font-black">{ing.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nutrition Section */}
              <div className="bg-white dark:bg-slate-900 p-10 md:p-16 lg:p-24 rounded-[3rem] md:rounded-[6rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                <h3 className="text-2xl md:text-4xl font-black mb-10 md:mb-16 text-slate-900 dark:text-white tracking-tight flex items-center gap-5">
                  <span className="material-symbols-outlined text-primary text-[32px] md:text-[48px]">analytics</span>
                  Dietary Analysis
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 md:gap-20">
                  <div className="flex flex-col gap-3 md:gap-4">
                    <span className="text-[11px] md:text-[13px] font-black text-slate-400 uppercase tracking-[0.3em]">Protein</span>
                    <div className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedRecipe.nutrition.protein}</div>
                    <div className="w-full h-2.5 md:h-4 bg-primary/10 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{width: '75%'}}></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 md:gap-4">
                    <span className="text-[11px] md:text-[13px] font-black text-slate-400 uppercase tracking-[0.3em]">Carbohydrates</span>
                    <div className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedRecipe.nutrition.carbs}</div>
                    <div className="w-full h-2.5 md:h-4 bg-blue-500/10 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{width: '60%'}}></div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 md:gap-4">
                    <span className="text-[11px] md:text-[13px] font-black text-slate-400 uppercase tracking-[0.3em]">Healthy Fats</span>
                    <div className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter">{selectedRecipe.nutrition.fats}</div>
                    <div className="w-full h-2.5 md:h-4 bg-orange-500/10 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500" style={{width: '40%'}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Steps Section */}
              <div className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-10 md:p-20 lg:p-32 rounded-[3.5rem] md:rounded-[7rem] shadow-2xl transition-all">
                <h3 className="text-3xl md:text-5xl lg:text-6xl font-black mb-12 md:mb-24 tracking-tighter">Cooking Methodology</h3>
                <div className="flex flex-col gap-10 md:gap-20">
                  {selectedRecipe.steps.map((step, i) => (
                    <div key={i} className="flex gap-8 md:gap-16 items-start group">
                      <div className="flex flex-col items-center gap-4">
                        <span className="size-12 md:size-20 shrink-0 bg-white/10 dark:bg-slate-900/10 text-primary rounded-[1.5rem] md:rounded-[2.5rem] flex items-center justify-center font-black text-xl md:text-4xl group-hover:scale-110 transition-transform">{i + 1}</span>
                        {i < selectedRecipe.steps.length - 1 && (
                          <div className="w-px h-16 md:h-32 bg-white/10 dark:bg-slate-900/10"></div>
                        )}
                      </div>
                      <p className="text-lg md:text-3xl lg:text-4xl font-black md:font-bold leading-[1.4] pt-1 md:pt-4 text-slate-100 dark:text-slate-800 opacity-90 group-hover:opacity-100 transition-opacity">{step}</p>
                    </div>
                  ))}
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
      <Sidebar currentView={view} onNavigate={setView} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <Header 
          onNavigate={setView} 
          onSearch={setSearchQuery} 
          isDarkMode={isDarkMode} 
          toggleDarkMode={toggleDarkMode} 
        />
        <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
          {renderContent()}
        </main>
        <BottomNav currentView={view} onNavigate={setView} />
      </div>
      
      {/* Refined Generator Loading Screen */}
      {isGenerating && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-2xl flex items-center justify-center animate-in fade-in zoom-in duration-500 p-6">
          <div className="bg-white dark:bg-slate-900 p-12 md:p-24 rounded-[4rem] md:rounded-[6rem] shadow-[0_0_100px_rgba(19,236,55,0.15)] flex flex-col items-center gap-10 md:gap-16 text-center max-w-lg border border-white/20">
            <div className="relative size-24 md:size-40">
              <div className="absolute inset-0 border-[6px] md:border-[10px] border-primary/10 rounded-full" />
              <div className="absolute inset-0 border-[6px] md:border-[10px] border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-4 md:inset-8 bg-primary/5 rounded-full flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined !text-[32px] md:!text-[48px] text-primary">restaurant</span>
              </div>
            </div>
            <div>
              <h4 className="font-black text-3xl md:text-5xl text-slate-900 dark:text-white mb-4 tracking-tighter">Chef Mistri is Thinking</h4>
              <p className="text-slate-400 dark:text-slate-500 font-bold text-base md:text-xl leading-relaxed">Analyzing your unique flavors to build the perfect gourmet recipes...</p>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-28 md:bottom-12 left-1/2 -translate-x-1/2 z-[300] bg-[#e63946] text-white px-8 md:px-12 py-5 md:py-8 rounded-[2.5rem] md:rounded-[3rem] font-black shadow-2xl flex items-center gap-6 md:gap-10 w-[94%] md:max-w-3xl animate-in slide-in-from-bottom-12 duration-500 ring-8 ring-[#e63946]/10">
          <div className="hidden sm:flex bg-white/20 p-4 rounded-3xl items-center justify-center">
            <span className="material-symbols-outlined text-white text-[32px] md:text-[40px] font-black">warning</span>
          </div>
          <div className="flex-1 text-sm md:text-lg">
            <p className="opacity-70 font-black mb-1 text-xs md:text-sm uppercase tracking-widest">Kitchen Alert</p>
            <p className="leading-snug">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-2 md:p-3 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
            <span className="material-symbols-outlined text-[24px] md:text-[32px]">close</span>
          </button>
        </div>
      )}
    </div>
  );
}