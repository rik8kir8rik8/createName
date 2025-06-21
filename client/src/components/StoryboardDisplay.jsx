import React, { useState } from 'react';
import './StoryboardDisplay.css';
import MangaPageLayout from './MangaPageLayout';

const StoryboardDisplay = ({ storyboard, loading }) => {
  const [editingPanel, setEditingPanel] = useState(null);
  const [editMode, setEditMode] = useState(false);
  if (loading) {
    return (
      <div className="storyboard-display">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>ネームを生成中...</p>
        </div>
      </div>
    );
  }

  if (!storyboard) {
    return (
      <div className="storyboard-display">
        <div className="empty-state">
          <div className="empty-icon">📖</div>
          <p>生成されたネームがここに表示されます</p>
          <small>左側で文章を入力して「ネームを生成」ボタンを押してください</small>
        </div>
      </div>
    );
  }

  const { storyboard: data, metadata } = storyboard;

  return (
    <div className="storyboard-display">
      <div className="storyboard-header">
        <h2>🎨 生成されたネーム</h2>
        <div className="storyboard-controls">
          <div className="storyboard-info">
            <span>シーン数: {data.scenes.length}</span>
            <span>総コマ数: {metadata.panels_count}</span>
            <span>推定ページ数: {data.page_count_estimate || 'N/A'}</span>
          </div>
          <div className="mode-controls">
            <button 
              className={`mode-btn ${!editMode ? 'active' : ''}`}
              onClick={() => setEditMode(false)}
            >
              👁️ 表示
            </button>
            <button 
              className={`mode-btn ${editMode ? 'active' : ''}`}
              onClick={() => setEditMode(true)}
            >
              ✏️ 編集
            </button>
          </div>
        </div>
      </div>

      <div className="manga-pages-container">
        {data.scenes.map((scene, sceneIndex) => (
          <div key={sceneIndex} className="manga-page">
            <div className="page-header">
              <span className="page-number">ページ {scene.scene_number}</span>
              <div className="scene-info">
                <span className="scene-description">{scene.description}</span>
                <span className="emotion-tone">{scene.emotion_tone}</span>
              </div>
            </div>

            <div className="page-content">
              <MangaPageLayout 
                panels={scene.panels}
                sceneIndex={sceneIndex}
                layoutTemplate={scene.layout_template}
                editMode={editMode}
                onPanelEdit={setEditingPanel}
              />
            </div>

            {scene.applied_rules && scene.applied_rules.length > 0 && (
              <div className="applied-rules">
                <details>
                  <summary>適用されたルール ({scene.applied_rules.length})</summary>
                  <ul>
                    {scene.applied_rules.slice(0, 3).map((rule, ruleIndex) => (
                      <li key={ruleIndex} className={`rule-${rule.priority}`}>
                        {rule.description}
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="storyboard-footer">
        <div className="overall-pacing">
          <strong>全体のペース感:</strong> {data.overall_pacing}
        </div>
        <div className="export-controls">
          <button className="export-btn">
            📄 テキストでエクスポート
          </button>
          <button className="export-btn">
            🖼️ 画像でエクスポート
          </button>
        </div>
      </div>

      {/* パネル編集モーダル */}
      {editingPanel && (
        <div className="edit-modal-placeholder">
          <div className="modal-content">
            <h3>パネル編集</h3>
            <p>編集機能は次のアップデートで実装予定です</p>
            <button onClick={() => setEditingPanel(null)}>閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryboardDisplay;