import React, { useState } from 'react';
import './App.css';
import StoryInput from './components/StoryInput';
import StoryboardDisplay from './components/StoryboardDisplay';
import { generateStoryboard } from './services/api';

function App() {
  const [storyboard, setStoryboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateStoryboard = async (
    text,
    useMockAI = false,
    pageCount = 8
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateStoryboard(text, useMockAI, pageCount);
      setStoryboard(result);
    } catch (err) {
      setError(err.message || '生成に失敗しました');
      console.error('Error generating storyboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setStoryboard(null);
    setError(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📚 漫画ネーム生成アプリ</h1>
        <p>文章を入力して、漫画のネーム（設計図）を自動生成しましょう</p>
      </header>

      <main className="app-main">
        <div className="app-container">
          <div className="input-section">
            <StoryInput
              onGenerate={handleGenerateStoryboard}
              loading={loading}
              onClear={handleClear}
            />
            {error && (
              <div className="error-message">
                <p>❌ {error}</p>
              </div>
            )}
          </div>

          <div className="output-section">
            <StoryboardDisplay storyboard={storyboard} loading={loading} />
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>AI powered manga storyboard generator</p>
      </footer>
    </div>
  );
}

export default App;
