const prompts = [
  { label: "🍜 Ramen Recipe", text: "Create a cinematic 60s video teaching how to make authentic Japanese ramen" },
  { label: "🥗 Salad Tutorial", text: "Create a fresh and bright video guide for making a healthy Caesar salad" },
  { label: "🍰 Baking Video", text: "Create a step-by-step baking tutorial video for a classic birthday cake" },
  { label: "🍳 Quick Meals", text: "Create a fast-paced 30s video showcasing 3 quick breakfast ideas" },
  { label: "🌮 Street Food", text: "Create a vibrant street food style video about making authentic tacos" },
  { label: "🍣 Sushi Guide", text: "Create an elegant instructional video for making sushi rolls at home" },
];

function PromptCards({ onSelect }) {
  return (
    <div className="prompt-grid">
      {prompts.map((item) => (
        <div
          key={item.label}
          className="prompt-card"
          onClick={() => onSelect && onSelect(item.text)}
        >
          {item.label}
        </div>
      ))}
    </div>
  );
}

export default PromptCards;