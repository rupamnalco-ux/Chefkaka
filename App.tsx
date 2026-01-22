import React, { useState } from 'react';
import { 
  ViewState, 
  Ingredient, 
  Recipe, 
  UserPreferences,
} from './types.ts';
import { 
  INITIAL_PREFERENCES, 
  COMMON_STAPLES, 
  MOCK_RECIPES 
} from './constants.tsx';
import { 
  generateRecipesFromPantry 
} from './geminiService.ts';

const Navbar: React.FC<{ 
  currentView: ViewState; 
  onNavigate: (view: ViewState) => void 
}> = ({ currentView, onNavigate }) => (
  <header className="sticky top-0 z-50 flex items-center justify-between bg-white px-6 py-4 lg:px-16 border-b border-slate-50 print:hidden">
    <div className="flex items-center gap-10">
      <div 
        className="flex items-center gap-2 text-primary cursor-pointer select-none"
        onClick={() => onNavigate('pantry')}
      >
        <div className="size-8 flex items-center justify-center bg-primary rounded-lg">
          <span className="material-symbols-outlined !text-[20px] text-white font-black">nutrition</span>
        </div>
        <h2 className="text-xl font-black tracking-tight text-slate-900">ChefMistri</h2>
      </div>
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
            className={`text-sm font-bold tracking-tight transition-all py-1 ${
              currentView === link.id ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-primary'
            }`}
          >
            {link.label}
          </button>
        ))}
      </nav>
    </div>
    <div className="flex items-center gap-6">
      <button className="text-sm font-bold text-slate-900 px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors">Log In</button>
      <button 
        onClick={() => onNavigate('pantry')}
        className="bg-primary text-white text-sm font-black px-8 py-2.5 rounded-lg hover:bg-primary-hover transition-all shadow-sm active:scale-95"
      >
        Get Started
      </button>
    </div>
  </header>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('pantry');
  const [pantry, setPantry] = useState<Ingredient[]>([]);
  const [recommendations, setRecommendations] = useState<Recipe[]>(MOCK_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [preferences] = useState<UserPreferences>(INITIAL_PREFERENCES);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  const handleAddIngredient = (name: string) => {
    if (!name.trim()) return;
    const exists = pantry.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (exists) return;
    
    const newItem: Ingredient = { 
      id: Date.now().toString(), 
      name: name.trim(), 
      quantity: 1, 
      unit: 'unit', 
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
      const recs = await generateRecipesFromPantry(pantry.map(p => p.name), preferences);
      setRecommendations(recs);
      setView('recommendations');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Chef AI hit a snag! Ensure your API key is configured correctly in Vercel.");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'pantry':
        return (
          <section className="px-6 py-12 lg:px-20 max-w-7xl mx-auto w-full flex-1">
            <div className="flex flex-col lg:flex-row gap-12 items-start justify-between">
              <div className="flex-1 flex flex-col gap-12 w-full">
                <div className="relative flex bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 w-full max-w-2xl">
                  <input 
                    className="flex-1 border-none focus:ring-0 text-xl font-bold px-10 py-6 text-slate-900 placeholder:text-slate-300" 
                    placeholder="Enter an ingredient..." 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient(inputValue)}
                  />
                  <button 
                    onClick={() => handleAddIngredient(inputValue)}
                    className="bg-primary text-white font-black px-12 text-xl hover:bg-primary-hover transition-all active:scale-95 m-1 rounded-[1.8rem]"
                  >
                    Add
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl">
                  {COMMON_STAPLES.map((staple) => (
                    <button 
                      key={staple.name} 
                      onClick={() => handleAddIngredient(staple.name)} 
                      className="bg-white rounded-[2.5rem] p-10 flex flex-col items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group border border-slate-50"
                    >
                      <span className="material-symbols-outlined text-4xl" style={{color: staple.color}}>{staple.icon}</span>
                      <span className="font-black text-slate-900 text-lg">{staple.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:w-[450px] w-full shrink-0">
                <div className="bg-white rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 flex flex-col min-h-[550px] overflow-hidden">
                  <div className="p-10 flex-1">
                    <div className="flex flex-col gap-6">
                      {pantry.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-100 group">
                          <span className="font-black text-slate-900 text-xl">{item.name}</span>
                          <button 
                            onClick={() => setPantry(pantry.filter(p => p.id !== item.id))} 
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <span className="material-symbols-outlined text-2xl">close</span>
                          </button>
                        </div>
                      ))}
                      {pantry.length === 0 && (
                        <div className="text-slate-300 font-bold italic py-20 text-center text-lg">Empty Pantry...</div>
                      )}
                    </div>
                  </div>
                  <div className="p-10">
                    <button 
                      disabled={pantry.length === 0}
                      onClick={generateAndSetRecipes} 
                      className="w-full py-7 bg-primary text-white rounded-[2rem] font-black text-2xl shadow-xl shadow-primary/20 disabled:opacity-50 hover:bg-primary-hover transition-all active:scale-[0.98]"
                    >
                      Generate Recipes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'recommendations':
        return (
          <section className="px-6 py-12 lg:px-20 max-w-7xl mx-auto w-full flex-1">
            <h1 className="text-4xl font-black mb-10 text-slate-900">Recommended Recipes</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recommendations.map(recipe => (
                <div 
                  key={recipe.id} 
                  onClick={() => { setSelectedRecipe(recipe); setView('recipe-details'); }} 
                  className="cursor-pointer group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col"
                >
                  <div className="aspect-video overflow-hidden bg-slate-100">
                    <img 
                      src={recipe.image} 
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800'; }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      alt={recipe.title} 
                    />
                  </div>
                  <div className="p-8 flex-1">
                    <h3 className="text-xl font-black text-slate-900 mb-2">{recipe.title}</h3>
                    <p className="text-slate-500 text-sm font-medium line-clamp-2">{recipe.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );

      case 'recipe-details':
        if (!selectedRecipe) return null;
        return (
          <main className="w-full max-w-6xl mx-auto px-6 py-12 flex-1">
            <button onClick={() => setView('recommendations')} className="flex items-center gap-2 font-bold text-slate-400 mb-8 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">arrow_back</span> Back to Recipes
            </button>
            <div className="flex flex-col lg:flex-row gap-16">
              <div className="lg:w-1/2 w-full">
                <img 
                  src={selectedRecipe.image} 
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800'; }}
                  className="w-full aspect-square object-cover rounded-[4rem] shadow-xl" 
                  alt={selectedRecipe.title} 
                />
              </div>
              <div className="lg:w-1/2 w-full flex flex-col gap-8">
                <h1 className="text-6xl font-black text-slate-900 leading-tight">{selectedRecipe.title}</h1>
                <p className="text-xl font-bold text-slate-500 leading-relaxed">{selectedRecipe.description}</p>
                
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h3 className="text-2xl font-black mb-6">Ingredients</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between font-bold text-slate-700 p-3 border-b border-slate-50">
                        <span className="text-lg">{ing.name}</span>
                        <span className="text-primary text-lg">{ing.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>
        );

      default:
        return <div className="p-20 text-center font-bold text-slate-300">Section Under Construction</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FCFA]">
      <Navbar currentView={view} onNavigate={setView} />
      
      <main className="flex-1 flex flex-col">
        {renderContent()}
      </main>
      
      {isGenerating && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-md flex items-center justify-center">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-8 text-center max-w-md">
            <div className="size-20 border-[6px] border-primary border-t-transparent rounded-full animate-spin" />
            <div>
              <h4 className="font-black text-2xl text-slate-900 mb-2">Chef AI is Cooking...</h4>
              <p className="text-slate-500 font-bold">Generating unique recipes and high-quality food photography for your ingredients.</p>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] bg-[#e63946] text-white px-10 py-6 rounded-3xl font-bold shadow-2xl flex items-center gap-6 max-w-2xl animate-in fade-in slide-in-from-bottom-6">
          <div className="bg-white/20 p-3 rounded-full flex items-center justify-center">
             <span className="material-symbols-outlined text-white text-[28px]">error_outline</span>
          </div>
          <div className="flex-1">
            <p className="text-sm opacity-90 font-black mb-0.5">Configuration Note:</p>
            <p className="text-sm leading-tight">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;