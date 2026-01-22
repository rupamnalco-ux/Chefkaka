import React, { useState } from 'react';
import { 
  ViewState, 
  Ingredient, 
  Recipe, 
  UserPreferences,
  MealPlan
} from './types.ts';
import { 
  INITIAL_PREFERENCES, 
  COMMON_STAPLES, 
  MOCK_RECIPES 
} from './constants.tsx';
import { 
  generateRecipesFromPantry, 
  generateWeeklyPlan
} from './geminiService.ts';

const Navbar: React.FC<{ 
  currentView: ViewState; 
  onNavigate: (view: ViewState) => void 
}> = ({ currentView, onNavigate }) => (
  <header className="sticky top-0 z-50 flex items-center justify-between bg-white px-6 py-4 lg:px-16 border-b border-slate-100 print:hidden">
    <div className="flex items-center gap-12">
      <div 
        className="flex items-center gap-2 text-primary cursor-pointer select-none group"
        onClick={() => onNavigate('landing')}
      >
        <div className="size-8 flex items-center justify-center bg-primary rounded-lg shadow-sm">
          <span className="material-symbols-outlined !text-[20px] text-white font-black">nutrition</span>
        </div>
        <h2 className="text-xl font-black leading-tight tracking-[-0.03em] text-slate-900">ChefMistri</h2>
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
            className={`text-sm font-bold tracking-tight transition-all duration-200 py-1 border-b-2 ${
              currentView === link.id ? 'text-primary border-primary' : 'text-slate-500 border-transparent hover:text-primary'
            }`}
          >
            {link.label}
          </button>
        ))}
      </nav>
    </div>
    <div className="flex items-center gap-4">
      <button className="text-sm font-bold text-slate-900 px-4 py-2 hover:bg-slate-50 rounded-lg transition-colors">Log In</button>
      <button 
        onClick={() => onNavigate('pantry')}
        className="bg-primary text-white text-sm font-black px-8 py-2.5 rounded-lg hover:bg-primary-hover transition-all shadow-md active:scale-95"
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
      setErrorMsg(err.message || "Chef AI hit a snag!");
    } finally {
      setIsGenerating(false);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'pantry':
        return (
          <section className="px-6 py-12 lg:px-20 max-w-7xl mx-auto w-full flex-1">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
              {/* Left Column: Input and Quick Selection */}
              <div className="flex-1 flex flex-col gap-10">
                <div className="flex bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 max-w-2xl w-full p-1.5">
                  <input 
                    className="flex-1 border-none focus:ring-0 text-lg font-bold px-6 text-slate-900 placeholder:text-slate-300" 
                    placeholder="Enter an ingredient..." 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddIngredient(inputValue)}
                  />
                  <button 
                    onClick={() => handleAddIngredient(inputValue)}
                    className="bg-primary text-white font-black px-10 py-3.5 rounded-xl hover:bg-primary-hover transition-all active:scale-95"
                  >
                    Add
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl">
                  {COMMON_STAPLES.map((staple) => (
                    <button 
                      key={staple.name} 
                      onClick={() => handleAddIngredient(staple.name)} 
                      className="bg-white rounded-[2rem] p-8 flex flex-col items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all group border border-slate-50"
                    >
                      <span className="material-symbols-outlined text-4xl" style={{color: staple.color}}>{staple.icon}</span>
                      <span className="font-black text-slate-800 text-lg">{staple.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Selected Items List */}
              <div className="lg:w-[420px] w-full shrink-0">
                <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col min-h-[500px]">
                  <div className="p-8 flex-1 flex flex-col">
                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[450px] pr-2 custom-scrollbar">
                      {pantry.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-primary/20 transition-colors">
                          <span className="font-black text-slate-900 text-lg">{item.name}</span>
                          <button 
                            onClick={() => setPantry(pantry.filter(p => p.id !== item.id))} 
                            className="text-slate-200 hover:text-red-500 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-8 pt-0">
                    <button 
                      disabled={pantry.length === 0}
                      onClick={generateAndSetRecipes} 
                      className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xl shadow-lg shadow-primary/20 disabled:opacity-50 hover:bg-primary-hover transition-all active:scale-[0.98]"
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
                  className="cursor-pointer group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100"
                >
                  <div className="aspect-video overflow-hidden bg-slate-100">
                    <img src={recipe.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={recipe.title} />
                  </div>
                  <div className="p-8">
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
          <main className="w-full max-w-5xl mx-auto px-6 py-12 flex-1">
            <div className="flex flex-col lg:flex-row gap-12">
              <div className="lg:w-1/2 w-full">
                <img src={selectedRecipe.image} className="w-full aspect-square object-cover rounded-[3rem] shadow-xl" alt={selectedRecipe.title} />
              </div>
              <div className="lg:w-1/2 w-full flex flex-col gap-6">
                <h1 className="text-5xl font-black text-slate-900 leading-tight">{selectedRecipe.title}</h1>
                <p className="text-lg font-bold text-slate-400">{selectedRecipe.description}</p>
                
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-black mb-4">Ingredients</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between font-bold text-slate-700 p-2 border-b border-slate-50">
                        <span>{ing.name}</span>
                        <span className="text-primary">{ing.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>
        );

      case 'landing':
        return (
          <section className="mx-auto max-w-7xl px-6 lg:px-12 py-24 text-center lg:text-left grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col items-center lg:items-start">
              <h1 className="text-7xl font-black text-slate-900 mb-8 leading-tight tracking-tighter">
                Cook with <br /><span className="text-primary">Confidence.</span>
              </h1>
              <p className="text-xl text-slate-500 mb-10 max-w-md font-medium">
                The smart way to manage your pantry and find the perfect meal for your ingredients.
              </p>
              <button 
                onClick={() => setView('pantry')} 
                className="bg-primary text-white px-12 py-5 rounded-2xl font-black text-xl shadow-lg hover:scale-105 transition-all"
              >
                Go to Pantry
              </button>
            </div>
            <img src="https://thedeliciousplate.com/wp-content/uploads/2019/07/cropped-IMG_5672.jpg" className="rounded-[3rem] shadow-2xl" alt="ChefMistri Hero" />
          </section>
        );

      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FCFA]">
      <Navbar currentView={view} onNavigate={setView} />
      
      <main className="flex-1 flex flex-col">
        {renderContent()}
      </main>
      
      {isGenerating && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center gap-6">
            <div className="size-16 border-[5px] border-primary border-t-transparent rounded-full animate-spin" />
            <h4 className="font-black text-xl text-slate-900">AI is cooking up recipes...</h4>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] bg-red-600 text-white px-8 py-4 rounded-3xl font-bold shadow-2xl flex items-center gap-5 max-w-xl animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-white/20 p-2 rounded-full">
             <span className="material-symbols-outlined text-white text-[24px]">error_outline</span>
          </div>
          <div className="flex-1">
            <p className="text-sm opacity-90 font-black">AI Error:</p>
            <p className="text-sm leading-tight">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;