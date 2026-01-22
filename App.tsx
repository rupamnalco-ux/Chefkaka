import React, { useState, useEffect } from 'react';
import { 
  ViewState, 
  Ingredient, 
  Recipe, 
  UserPreferences,
  UserProfile,
  MealPlan,
  DayOfWeek,
  MealSlot
} from './types.ts';
import { 
  INITIAL_PREFERENCES, 
  COMMON_STAPLES, 
  MOCK_RECIPES 
} from './constants.tsx';
import { 
  generateRecipesFromPantry, 
  generateWeeklyPlan,
  generateAIImage
} from './geminiService.ts';

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS: MealSlot[] = ['Breakfast', 'Lunch', 'Dinner'];

const EMPTY_PLAN: MealPlan = {
  Monday: { Breakfast: null, Lunch: null, Dinner: null },
  Tuesday: { Breakfast: null, Lunch: null, Dinner: null },
  Wednesday: { Breakfast: null, Lunch: null, Dinner: null },
  Thursday: { Breakfast: null, Lunch: null, Dinner: null },
  Friday: { Breakfast: null, Lunch: null, Dinner: null },
  Saturday: { Breakfast: null, Lunch: null, Dinner: null },
  Sunday: { Breakfast: null, Lunch: null, Dinner: null },
};

const Navbar: React.FC<{ 
  currentView: ViewState; 
  onNavigate: (view: ViewState) => void 
}> = ({ currentView, onNavigate }) => (
  <header className="sticky top-0 z-50 flex items-center justify-between bg-white/70 backdrop-blur-xl px-6 py-4 lg:px-16 border-b border-slate-100 print:hidden">
    <div className="flex items-center gap-12">
      <div 
        className="flex items-center gap-2 text-primary cursor-pointer select-none group"
        onClick={() => onNavigate('landing')}
      >
        <div className="size-8 flex items-center justify-center bg-gradient-to-br from-primary-dark to-primary rounded-lg shadow-sm group-hover:scale-110 transition-transform">
          <span className="material-symbols-outlined !text-[20px] text-white font-black">nutrition</span>
        </div>
        <h2 className="text-xl font-black leading-tight tracking-[-0.03em] text-slate-900">ChefMistri</h2>
      </div>
      {currentView !== 'landing' && (
        <nav className="hidden md:flex items-center gap-8">
          {[
            { id: 'recommendations', label: 'Recipes' },
            { id: 'shopping-list', label: 'Meal Planner' },
            { id: 'pantry', label: 'My Pantry' },
            { id: 'profile', label: 'Profile' }
          ].map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id as ViewState)}
              className={`text-sm font-bold tracking-tight transition-all duration-200 border-b-2 ${
                currentView === link.id ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-primary'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>
      )}
    </div>
    <div className="flex items-center gap-8">
      <button className="text-sm font-black text-slate-900 hover:text-primary transition-colors">Log In</button>
      <button 
        onClick={() => onNavigate('pantry')}
        className="bg-primary text-white text-sm font-black px-8 py-2.5 rounded-lg hover:bg-primary-hover transition-all shadow-lg active:scale-95"
      >
        Get Started
      </button>
    </div>
  </header>
);

const Footer: React.FC = () => (
  <footer className="w-full py-12 text-center text-slate-400 text-sm border-t border-slate-100 mt-auto print:hidden bg-white/30 backdrop-blur-sm">
    <div className="max-w-7xl mx-auto px-6">
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary">restaurant</span>
        <span className="font-black text-xl text-slate-900">ChefMistri</span>
      </div>
      <p>© 2024 ChefMistri. Precision meal planning for modern kitchens.</p>
    </div>
  </footer>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('landing');
  const [pantry, setPantry] = useState<Ingredient[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlan>(() => JSON.parse(JSON.stringify(EMPTY_PLAN)));
  const [recommendations, setRecommendations] = useState<Recipe[]>(MOCK_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>(INITIAL_PREFERENCES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [userProfile] = useState<UserProfile>({
    fullName: 'Jane Doe',
    email: 'jane.doe@example.com',
    username: 'chef_jane',
    bio: 'Avid home cook exploring the world of gourmet flavors.',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane'
  });

  const handleAddToPantry = (name: string) => {
    const cleaned = name.trim();
    if (!cleaned) return;
    const existing = pantry.find(i => i.name.toLowerCase() === cleaned.toLowerCase());
    if (existing) {
      setPantry(pantry.map(i => i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setPantry([...pantry, { id: Date.now().toString(), name: cleaned, quantity: 1, unit: 'unit', category: 'Pantry' }]);
    }
  };

  const handleClearPantry = () => {
    setPantry([]);
    setShowClearConfirm(false);
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setView('recipe-details');
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
      console.error("Recipe Generation Error Details:", err);
      // Show the specific error message to help the user debug
      const message = err.message || "Unknown AI error";
      setErrorMsg(`AI Error: ${message}. (Check if API_KEY is set in Vercel)`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAndSetWeeklyPlan = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const plan = await generateWeeklyPlan(pantry.map(p => p.name), preferences);
      setMealPlan(plan);
    } catch (err: any) {
      console.error("Weekly Plan Error Details:", err);
      setErrorMsg(`Planner Error: ${err.message || "Failed to generate plan"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'landing':
        return (
          <div className="flex flex-col items-center">
            <section className="relative w-full pt-16 pb-24 lg:pt-32 lg:pb-48">
              <div className="mx-auto max-w-7xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full mb-8">
                    <span className="material-symbols-outlined !text-[18px] text-emerald-500">eco</span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600">NEW: SMART PANTRY INTEGRATION</span>
                  </div>

                  <h1 className="text-[48px] sm:text-[64px] lg:text-[84px] font-black text-slate-900 mb-8 leading-[1.05] tracking-[-0.04em]">
                    Turn What's in Your Fridge Into a <span className="text-primary">Week of Great Meals</span>
                  </h1>
                  
                  <p className="text-lg lg:text-xl text-slate-500 mb-12 leading-relaxed max-w-xl font-medium">
                    AI-powered recipes, meal plans, and shopping lists built around your ingredients, diet, and schedule.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-6 mb-16 w-full sm:w-auto">
                    <button 
                      onClick={() => setView('pantry')} 
                      className="w-full sm:w-auto bg-primary text-white px-12 py-6 rounded-2xl font-black text-xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      Get Started Free
                    </button>
                  </div>
                </div>

                <div className="relative group perspective-[2000px]">
                  <div className="relative bg-slate-100 rounded-[3rem] aspect-[1.3/1] shadow-2xl overflow-hidden border-[12px] border-white/60 transition-all duration-700 ease-out transform group-hover:rotate-y-[-10deg] group-hover:rotate-x-[5deg]">
                    <img 
                      src="https://thedeliciousplate.com/wp-content/uploads/2019/07/cropped-IMG_5672.jpg" 
                      className="absolute inset-0 w-full h-full object-cover pt-12" 
                      alt="Healthy Recipe Suggestion"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        );

      case 'pantry':
        return (
          <section className="px-6 py-12 lg:px-20 max-w-7xl mx-auto w-full flex-1">
            <div className="flex flex-col lg:flex-row gap-16">
              <div className="flex-1 flex flex-col gap-10">
                <h1 className="text-6xl font-black tracking-tighter text-slate-900">Your Digital Pantry.</h1>
                <div className="flex h-16 bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm focus-within:border-primary transition-colors">
                  <input 
                    id="pantry-input"
                    className="flex-1 border-none focus:ring-0 text-lg font-bold px-8 text-slate-900" 
                    placeholder="Enter an ingredient..." 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddToPantry((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <button onClick={() => {
                    const el = document.getElementById('pantry-input') as HTMLInputElement;
                    handleAddToPantry(el.value);
                    el.value = '';
                  }} className="bg-primary px-10 text-white font-black text-lg hover:bg-primary-hover transition-colors">Add</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {COMMON_STAPLES.map((staple) => (
                    <button 
                      key={staple.name} 
                      onClick={() => handleAddToPantry(staple.name)} 
                      className="bg-white border-2 border-slate-50 rounded-[2.5rem] p-8 flex flex-col items-center gap-4 hover:shadow-xl hover:scale-105 transition-all group"
                    >
                      <span className="material-symbols-outlined text-3xl group-hover:scale-110 transition-transform" style={{color: staple.color}}>{staple.icon}</span>
                      <span className="font-black text-slate-800">{staple.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="lg:w-[450px]">
                <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl p-10">
                  <h3 className="text-2xl font-black text-slate-900 mb-8">Current Stock ({pantry.length})</h3>
                  <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto mb-10 pr-2">
                    {pantry.length === 0 ? (
                      <div className="text-slate-300 font-bold italic py-10 text-center">Your pantry is empty...</div>
                    ) : (
                      pantry.map(item => (
                        <div key={item.id} className="flex items-center gap-4 p-5 rounded-3xl bg-slate-50 border border-slate-100">
                          <span className="flex-1 font-black text-slate-900">{item.name}</span>
                          <button onClick={() => setPantry(pantry.filter(p => p.id !== item.id))} className="text-slate-300 hover:text-red-400">
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <button 
                    disabled={pantry.length === 0}
                    onClick={generateAndSetRecipes} 
                    className="w-full py-6 bg-primary text-white rounded-[2rem] font-black text-xl shadow-xl shadow-primary/20 disabled:opacity-50 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Generate Recipes
                  </button>
                </div>
              </div>
            </div>
          </section>
        );

      case 'recommendations':
        return (
          <section className="px-6 py-12 lg:px-20 max-w-7xl mx-auto w-full flex-1">
            <h1 className="text-6xl font-black mb-16 tracking-tighter text-slate-900">Chef Recommendations.</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {recommendations.map(recipe => (
                <div 
                  key={recipe.id} 
                  onClick={() => handleRecipeClick(recipe)} 
                  className="cursor-pointer group bg-white rounded-[3rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all border border-slate-50"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img src={recipe.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={recipe.title} />
                  </div>
                  <div className="p-10">
                    <h3 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors mb-4">{recipe.title}</h3>
                    <p className="text-slate-500 font-medium line-clamp-2">{recipe.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'recipe-details':
        if (!selectedRecipe) return null;
        return (
          <main className="w-full max-w-6xl mx-auto px-6 py-16 flex-1">
            <div className="flex flex-col lg:flex-row gap-16 items-start">
              <div className="lg:w-1/2 w-full">
                <img src={selectedRecipe.image} className="w-full aspect-square object-cover rounded-[4rem] shadow-2xl mb-12" alt={selectedRecipe.title} />
                <h3 className="text-3xl font-black mb-8 text-slate-900">Ingredients</h3>
                <div className="grid grid-cols-1 gap-4">
                  {selectedRecipe.ingredients.map((ing, i) => (
                    <div key={i} className="p-5 bg-white border border-slate-50 rounded-3xl flex justify-between font-bold shadow-sm">
                      <span className="text-slate-700">{ing.name}</span>
                      <span className="text-primary font-black">{ing.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:w-1/2 w-full">
                <h1 className="text-6xl font-black mb-6 text-slate-900">{selectedRecipe.title}</h1>
                <p className="text-xl font-bold text-slate-400 mb-12">{selectedRecipe.description}</p>
                <h3 className="text-3xl font-black mb-8 text-slate-900">Instructions</h3>
                <div className="flex flex-col gap-8">
                  {selectedRecipe.steps.map((step, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="size-10 rounded-2xl bg-primary text-white flex items-center justify-center font-black shrink-0">{i+1}</div>
                      <p className="font-bold text-slate-600 leading-relaxed pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        );

      case 'shopping-list':
        return (
          <main className="flex-1 px-6 py-16 lg:px-20 max-w-[1600px] mx-auto w-full flex flex-col gap-12">
            <div className="flex justify-between items-end">
              <h1 className="text-7xl font-black tracking-tighter text-slate-900">Control Room.</h1>
              <button 
                onClick={generateAndSetWeeklyPlan}
                className="bg-slate-900 text-white px-10 py-5 rounded-3xl font-black flex items-center gap-3 hover:scale-105 transition-all"
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                Auto-Generate Full Week
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-6">
              {DAYS.map(day => (
                <div key={day} className="flex flex-col gap-4">
                  <div className="bg-white border border-slate-100 p-4 rounded-[1.5rem] text-center font-black text-xs tracking-widest uppercase text-slate-900">{day}</div>
                  {SLOTS.map(slot => (
                    <div 
                      key={slot} 
                      onClick={() => setView('recommendations')}
                      className="group h-48 rounded-[2rem] bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-primary transition-all relative overflow-hidden"
                    >
                      {mealPlan[day][slot] ? (
                        <div className="absolute inset-0 p-4 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent">
                          <p className="text-white text-xs font-black line-clamp-2">{mealPlan[day][slot]?.title}</p>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-black text-xs">{slot}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </main>
        );

      case 'profile':
        return (
          <main className="flex-1 px-6 py-16 lg:px-20 max-w-5xl mx-auto w-full">
            <div className="bg-white border border-slate-100 rounded-[4rem] p-12 shadow-2xl flex flex-col items-center">
              <img src={userProfile.avatar} className="size-40 rounded-full border-8 border-slate-50 mb-8" alt="User avatar" />
              <h2 className="text-4xl font-black text-slate-900 mb-2">{userProfile.fullName}</h2>
              <p className="text-slate-500 font-bold mb-12">@{userProfile.username}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full">
                <div className="bg-slate-50 p-8 rounded-4xl">
                  <h3 className="text-xl font-black mb-4">Dietary Type</h3>
                  <p className="font-bold text-slate-600">{preferences.dietType}</p>
                </div>
                <div className="bg-slate-50 p-8 rounded-4xl">
                  <h3 className="text-xl font-black mb-4">Allergies</h3>
                  <div className="flex flex-wrap gap-2">
                    {preferences.allergies.map(a => <span key={a} className="bg-white px-3 py-1 rounded-full text-xs font-black">{a}</span>)}
                  </div>
                </div>
              </div>
            </div>
          </main>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar currentView={view} onNavigate={setView} />
      <div className="flex-1 flex flex-col">
        {renderContent()}
      </div>
      <Footer />
      
      {isGenerating && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-8 text-center max-w-sm w-full">
            <div className="size-20 border-[6px] border-primary border-t-transparent rounded-full animate-spin" />
            <div className="flex flex-col gap-2">
              <h4 className="font-black text-2xl text-slate-900">Chef AI is Drafting...</h4>
              <p className="text-slate-400 font-bold text-sm">Crafting your custom kitchen menu</p>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] bg-red-600 text-white px-8 py-4 rounded-2xl font-black shadow-[0_20px_50px_rgba(220,38,38,0.4)] flex items-center gap-4 animate-in slide-in-from-bottom-8 max-w-md border border-red-500/30">
          <span className="material-symbols-outlined shrink-0 text-red-200">error</span>
          <span className="text-sm leading-tight">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-4 shrink-0 size-8 flex items-center justify-center bg-white/10 rounded-full hover:bg-white/20 transition-colors">✕</button>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 text-center max-w-md w-full">
            <h4 className="font-black text-3xl text-slate-900">Clear your Pantry?</h4>
            <div className="flex w-full gap-4 mt-4">
              <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-4 px-6 bg-slate-100 text-slate-600 rounded-2xl font-black">Cancel</button>
              <button onClick={handleClearPantry} className="flex-1 py-4 px-6 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-200">Clear All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;