import PromptCards from "./PromptCards";

function WelcomeScreen({ onPromptClick }) {
  return (
    <div className="welcome">
      <h1>Create Cooking Videos</h1>
      <p>Turn recipes into cinematic AI videos instantly</p>
      <PromptCards onSelect={onPromptClick} />
    </div>
  );
}

export default WelcomeScreen;