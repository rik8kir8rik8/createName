import React, { useState } from 'react';
import './StoryInput.css';

const StoryInput = ({ onGenerate, loading, onClear }) => {
  const [text, setText] = useState('');
  const [useMockAI, setUseMockAI] = useState(false);
  const [pageCount, setPageCount] = useState(8);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !loading) {
      onGenerate(text.trim(), useMockAI, pageCount);
    }
  };

  const handlePageCountChange = (e) => {
    const value = e.target.value;
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) > 0 && parseInt(value) <= 50)) {
      setPageCount(value === '' ? '' : parseInt(value));
    }
  };

  const handleSampleLoad = () => {
    const sampleText = `太郎は朝早く起きて、窓の外を見た。雨が降っていた。
「今日も雨か...」と彼はため息をついた。
でも、玄関を出ると、隣の花子が傘を持って待っていた。
「おはよう、太郎！一緒に学校に行こう」
太郎の顔が明るくなった。「ありがとう、花子！」
二人は雨の中を歩いて行く。途中で大きな水たまりがあった。
太郎が飛び越えようとして、バランスを崩した。
「危ない！」花子が手を差し伸べた。
太郎は花子の手をつかんで、無事に水たまりを越えることができた。
「君がいてくれて良かった」太郎は微笑んだ。`;
    setText(sampleText);
  };

  return (
    <div className="story-input">
      <div className="input-header">
        <h2>📝 物語を入力</h2>
        <button 
          type="button" 
          onClick={handleSampleLoad}
          className="sample-btn"
          disabled={loading}
        >
          サンプルを読み込み
        </button>
      </div>
      
      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ここに物語の文章を入力してください...&#10;&#10;例：&#10;太郎は朝早く起きて、窓の外を見た。雨が降っていた。&#10;「今日も雨か...」と彼はため息をついた。&#10;でも、玄関を出ると、隣の花子が傘を持って待っていた。"
          disabled={loading}
          rows={12}
          className="story-textarea"
        />
        
        <div className="input-controls">
          <div className="input-info">
            <span className="char-count">
              {text.length} / 10000 文字
            </span>
            <div className="page-count-input">
              <label htmlFor="pageCount">📄 ページ数:</label>
              <input
                id="pageCount"
                type="number"
                value={pageCount}
                onChange={handlePageCountChange}
                disabled={loading}
                min="1"
                max="50"
                className="page-count-field"
              />
            </div>
            <div className="toggles-container">
              <div className="mock-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={useMockAI}
                    onChange={(e) => setUseMockAI(e.target.checked)}
                    disabled={loading}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">
                    {useMockAI ? '💡 モック生成' : '🤖 AI生成 (Difyフロー)'}
                  </span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="input-buttons">
            <button
              type="button"
              onClick={() => {
                setText('');
                onClear();
              }}
              disabled={loading}
              className="clear-btn"
            >
              クリア
            </button>
            
            <button
              type="submit"
              disabled={!text.trim() || loading}
              className="generate-btn"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  生成中...
                </>
              ) : (
                '🎨 ネームを生成'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StoryInput;