import { useState } from "react";
import { Paperclip, Mic, Sparkles } from "lucide-react";

function InputBox({ onSend, loading }) {
  const [prompt, setPrompt] = useState("");

  const handleSend = () => {
    if (!prompt.trim() || loading) return;
    onSend(prompt);
    setPrompt("");
  };

  return (
    <div className="input-area">
      <button className="input-icon-btn" title="Attach file">
        <Paperclip size={16} />
      </button>
      <button className="input-icon-btn" title="Voice input">
        <Mic size={16} />
      </button>
      <input
        type="text"
        value={prompt}
        placeholder="Describe your cooking video..."
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        disabled={loading}
      />
      <button className="generate-btn" onClick={handleSend} disabled={loading || !prompt.trim()}>
        <Sparkles size={16} />
        {loading ? "Generating..." : "Generate"}
      </button>
    </div>
  );
}

export default InputBox;