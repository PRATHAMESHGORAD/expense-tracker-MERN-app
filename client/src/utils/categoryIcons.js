const ICONS = {
  Food: "🍔", Travel: "✈️", Shopping: "🛍️", Bills: "🧾", Rent: "🏠",
  Entertainment: "🎬", Health: "💊", Education: "📚", Subscription: "📱",
  Salary: "💰", Freelance: "💻", Business: "📈", Investment: "📊",
  Gift: "🎁", Other: "🔖",
};

export function categoryIcon(category) {
  return ICONS[category] || "🔖";
}