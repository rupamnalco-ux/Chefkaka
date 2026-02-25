
import React from 'react';

export const INITIAL_PREFERENCES = {
  dietType: 'Vegetarian' as const,
  allergies: ['Shellfish', 'Tree Nuts'],
  dislikes: ['Olives'],
  skillLevel: 'Intermediate' as const,
};

export const COMMON_STAPLES = [
  { name: 'Eggs', icon: 'egg', color: 'orange' },
  { name: 'Milk', icon: 'water_full', color: 'blue' },
  { name: 'Chicken', icon: 'kebab_dining', color: 'red' },
  { name: 'Rice', icon: 'rice_bowl', color: 'yellow' },
  { name: 'Tomatoes', icon: 'nutrition', color: 'red' },
  { name: 'Onion', icon: 'radio_button_checked', color: 'purple' },
  { name: 'Cheese', icon: 'local_pizza', color: 'yellow' },
  { name: 'Garlic', icon: 'spa', color: 'gray' },
];

export const DISCOVER_CATEGORIES = ["Trending", "Global", "Zero-Waste", "Moods"];

export const DISCOVER_RECIPES = [
  // Trending
  { title: "Seared Scallops & Saffron Foam", time: "15 MINS", diff: "HARD", img: "https://images.pexels.com/photos/5638527/pexels-photo-5638527.jpeg", popular: true, category: "Trending" },
  { title: "Wild Mushroom Truffle Risotto", time: "35 MINS", diff: "MEDIUM", img: "https://images.pexels.com/photos/5638732/pexels-photo-5638732.jpeg", popular: true, category: "Trending" },
  { title: "Honey Glazed Duck Breast", time: "25 MINS", diff: "HARD", img: "https://images.pexels.com/photos/604969/pexels-photo-604969.jpeg", popular: false, category: "Trending" },
  { title: "Heirloom Tomato & Burrata", time: "10 MINS", diff: "EASY", img: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg", popular: true, category: "Trending" },
  
  // Global
  { title: "Miso Glazed Black Cod", time: "20 MINS", diff: "MEDIUM", img: "https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg", popular: false, category: "Global" },
  { title: "Thai Basil Fried Rice", time: "15 MINS", diff: "EASY", img: "https://images.pexels.com/photos/5938/food-salad-healthy-lunch.jpg", popular: true, category: "Global" },
  { title: "Moroccan Lamb Tagine", time: "2 HOURS", diff: "HARD", img: "https://images.pexels.com/photos/1273765/pexels-photo-1273765.jpeg", popular: false, category: "Global" },
  
  // Zero-Waste
  { title: "Wilted Greens Pesto Pasta", time: "15 MINS", diff: "EASY", img: "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg", popular: false, category: "Zero-Waste" },
  { title: "Stale Bread Panzanella", time: "10 MINS", diff: "EASY", img: "https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg", popular: false, category: "Zero-Waste" },
  { title: "Broccoli Stalk Stir-fry", time: "12 MINS", diff: "EASY", img: "https://images.pexels.com/photos/262959/pexels-photo-262959.jpeg", popular: false, category: "Zero-Waste" },

  // Moods
  { title: "Rainy Day Pumpkin Soup", time: "40 MINS", diff: "MEDIUM", img: "https://images.pexels.com/photos/539451/pexels-photo-539451.jpeg", popular: true, category: "Moods" },
  { title: "Post-Gym Protein Bowl", time: "20 MINS", diff: "EASY", img: "https://images.pexels.com/photos/1640775/pexels-photo-1640775.jpeg", popular: false, category: "Moods" },
  { title: "Date Night Filet Mignon", time: "30 MINS", diff: "HARD", img: "https://images.pexels.com/photos/769289/pexels-photo-769289.jpeg", popular: true, category: "Moods" },
];

export const MOCK_RECIPES = [
  {
    id: '1',
    title: 'Lemon Herb Chicken Rice',
    description: 'A zesty and fresh dinner using your chicken breast, rice, and bell peppers.',
    image: 'https://image.pollinations.ai/prompt/lemon%20herb%20chicken%20rice%20gourmet%20food%20photography?width=800&height=800&seed=101',
    prepTime: '30m',
    cookTime: '20m',
    servings: 2,
    calories: '450 kcal',
    matchPercentage: 98,
    difficulty: 'Easy' as const,
    ingredients: [{ name: 'Chicken breast', amount: '500g' }, { name: 'Rice', amount: '1 cup' }],
    steps: ['Prepare the aromatics. Pound the garlic and herbs together.', 'Sear the chicken in a hot wok.', 'Season and finish with lemon zest.'],
    tags: ['Quick', 'Fresh'],
    nutrition: { protein: '28g', carbs: '45g', fats: '12g' }
  },
  {
    id: '2',
    title: 'Stuffed Bell Peppers',
    description: 'Classic comfort food. Uses your bell peppers as the vessel for a savory rice and chicken mix.',
    image: 'https://image.pollinations.ai/prompt/stuffed%20bell%20peppers%20gourmet%20food%20photography?width=800&height=800&seed=102',
    prepTime: '45m',
    cookTime: '30m',
    servings: 4,
    calories: '380 kcal',
    matchPercentage: 85,
    difficulty: 'Med' as const,
    ingredients: [{ name: 'Bell Peppers', amount: '4 large' }, { name: 'Ground meat', amount: '300g' }],
    steps: ['Clean the peppers.', 'Prepare the stuffing mixture.', 'Roast until tender.'],
    tags: ['Comfort Food', 'Healthy'],
    nutrition: { protein: '15g', carbs: '40g', fats: '10g' }
  }
];
