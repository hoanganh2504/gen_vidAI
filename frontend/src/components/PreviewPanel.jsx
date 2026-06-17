import { Film, ImageIcon, Loader } from "lucide-react";
import { useState } from "react";
import { generateSceneImage } from "../services/imageService";

function SceneCard({ scene }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleGenImage = async () => {
    if (!scene.imagePrompt || loading) return;
    setLoading(true);
    setError(false);
    const img = await generateSceneImage(scene.imagePrompt);
    if (img) {
      setImage(img);
    } else {
      setError(true);
    }
    setLoading(false);
  };

  return (
    <div className="preview-scene-card">
      <div className="preview-scene-num">Scene {scene.scene}</div>
      <div className="preview-scene-desc">{scene.description}</div>

      {image ? (
        <img
          src={image}
          alt={`Scene ${scene.scene}`}
          className="scene-image"
          referrerPolicy="no-referrer"
        />
      ) : (
        <button
          className="gen-image-btn"
          onClick={handleGenImage}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader size={13} className="spin" />
              Generating... (~10s)
            </>
          ) : error ? (
            <>
              <ImageIcon size={13} />
              Retry Gen Image
            </>
          ) : (
            <>
              <ImageIcon size={13} />
              Gen Image
            </>
          )}
        </button>
      )}

      {error && (
        <p style={{ fontSize: 11, color: "#f87171", textAlign: "center" }}>
          Failed to generate. Try again.
        </p>
      )}

      {scene.voiceover && (
        <div className="preview-voiceover">
          <div className="preview-scene-label">Voiceover</div>
          <div className="preview-scene-text">"{scene.voiceover}"</div>
        </div>
      )}
    </div>
  );
}

function PreviewPanel({ storyboard }) {
  if (!storyboard) {
    return (
      <div className="preview">
        <div className="preview-header">Storyboard</div>
        <div className="preview-empty">
          <Film size={40} />
          <p>Your storyboard will appear here after generation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview">
      <div className="preview-header">Storyboard</div>
      <div className="preview-body">
        <div className="info-card">
          <div className="info-card-title">{storyboard.title}</div>
          {storyboard.style && (
            <div className="info-card-row">
              <span className="info-card-label">Style</span>
              <span className="info-card-val">{storyboard.style}</span>
            </div>
          )}
          {storyboard.duration && (
            <div className="info-card-row">
              <span className="info-card-label">Duration</span>
              <span className="info-card-val">{storyboard.duration}</span>
            </div>
          )}
          <div className="info-card-row">
            <span className="info-card-label">Scenes</span>
            <span className="info-card-val">{storyboard.scenes?.length || 0}</span>
          </div>
        </div>

        {storyboard.scenes?.map((scene) => (
          <SceneCard key={scene.scene} scene={scene} />
        ))}
      </div>
    </div>
  );
}

export default PreviewPanel;