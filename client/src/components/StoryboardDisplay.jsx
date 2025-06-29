import React, { useState, useEffect } from 'react';
import './StoryboardDisplay.css';
import { generatePageImages } from '../services/api';
import ThreeJSPreview from './ThreeJSPreview';

const StoryboardDisplay = ({ storyboard, loading }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pageImages, setPageImages] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Reset to first page when new storyboard is loaded
  useEffect(() => {
    if (storyboard) {
      setCurrentPageIndex(0);
      setPageImages(null);
    }
  }, [storyboard]);

  // Auto-generate page images when storyboard is loaded
  useEffect(() => {
    if (storyboard && !pageImages && !imageLoading) {
      handleGeneratePageImages();
    }
  }, [storyboard]);

  // Generate page images
  const handleGeneratePageImages = async () => {
    if (!storyboard || imageLoading) return;

    setImageLoading(true);
    try {
      const result = await generatePageImages(storyboard.storyboard);
      setPageImages(result.images);
    } catch (error) {
      console.error('Failed to generate page images:', error);
      alert('画像生成に失敗しました: ' + error.message);
    } finally {
      setImageLoading(false);
    }
  };
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
          <small>
            左側で文章を入力して「ネームを生成」ボタンを押してください
          </small>
        </div>
      </div>
    );
  }

  const { storyboard: data, metadata } = storyboard;
  const totalPages = data.scenes.length;
  const currentScene = data.scenes[currentPageIndex];

  const handlePreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPageIndex < totalPages - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

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
            {imageLoading && (
              <div className="image-loading">🔄 画像生成中...</div>
            )}
          </div>
        </div>
      </div>

      {/* Page Navigation Controls */}
      <div className="page-navigation">
        <button
          className="nav-btn prev-btn"
          onClick={handlePreviousPage}
          disabled={currentPageIndex === 0}
        >
          ← 前のページ
        </button>

        <div className="page-indicator">
          <span className="current-page">ページ {currentPageIndex + 1}</span>
          <span className="page-separator"> / </span>
          <span className="total-pages">{totalPages}</span>
        </div>

        <button
          className="nav-btn next-btn"
          onClick={handleNextPage}
          disabled={currentPageIndex === totalPages - 1}
        >
          次のページ →
        </button>
      </div>

      <div className="manga-pages-container">
        {currentScene ? (
          <div className="manga-page-content">
            {/* Three.jsによるコマ表示 */}
            <div className="panels-3d-container">
              {currentScene.panels.map((panel, index) => (
                <div key={index} className="panel-3d-wrapper">
                  <ThreeJSPreview
                    panelData={panel}
                    sceneData={panel.composition_data || {
                      camera: { type: 'middle' },
                      background: { props: ['room'] },
                      character: { 
                        visible: panel.content.characters?.length > 0,
                        pose: panel.content.characters?.[0]?.pose || 'standing'
                      }
                    }}
                    width={380}
                    height={280}
                  />
                </div>
              ))}
            </div>
            
            {/* 従来の静的画像（フォールバック） */}
            {pageImages && (
              <div className="static-image-fallback">
                <div className="page-image-container">
                  <img
                    src={pageImages[currentPageIndex]?.imageData}
                    alt={`ページ ${currentPageIndex + 1} (静的画像)`}
                    className="page-image"
                  />
                </div>
              </div>
            )}
            
            <div className="page-image-info">
              <h3>ページ {currentPageIndex + 1}</h3>
              <p>シーン: {currentScene.description}</p>
              <p>感情: {currentScene.emotion_tone}</p>
              <p>レイアウト: {currentScene.layout_template}</p>
              <p>コマ数: {currentScene.panels.length}</p>
            </div>
          </div>
        ) : imageLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>画像を生成中...</p>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🖼️</div>
            <p>画像を生成できませんでした</p>
          </div>
        )}
      </div>

      <div className="storyboard-footer">
        <div className="overall-pacing">
          <strong>全体のペース感:</strong> {data.overall_pacing}
        </div>
        <div className="export-controls">
          <button className="export-btn">📄 テキストでエクスポート</button>
          <button className="export-btn">🖼️ 画像でエクスポート</button>
        </div>
      </div>
    </div>
  );
};

export default StoryboardDisplay;
