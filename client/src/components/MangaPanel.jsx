import React from 'react';
import './MangaPanel.css';

const MangaPanel = ({ panel, panelIndex, sceneIndex, editMode, onEdit }) => {
  const handlePanelClick = () => {
    if (editMode && onEdit) {
      onEdit(panel, panelIndex, sceneIndex);
    }
  };

  const getPanelSizeClass = (size) => {
    switch (size) {
      case 'large': return 'panel-large';
      case 'small': return 'panel-small';
      default: return 'panel-medium';
    }
  };

  const getTypeClass = (type) => {
    return `panel-type-${type}`;
  };

  const renderCharacter = (character, index) => {
    const getCharacterSVG = (svgPattern) => {
      const patterns = {
        'circle+upward_arc': (
          <g>
            <circle cx="25" cy="35" r="12" fill="#fff" stroke="#000" strokeWidth="2"/>
            <path d="M 18 32 Q 25 28 32 32" stroke="#000" strokeWidth="2" fill="none"/>
            <circle cx="22" cy="30" r="1.5" fill="#000"/>
            <circle cx="28" cy="30" r="1.5" fill="#000"/>
            <line x1="25" y1="47" x2="25" y2="60" stroke="#000" strokeWidth="3"/>
            <line x1="25" y1="50" x2="15" y2="55" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="50" x2="35" y2="55" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="60" x2="18" y2="70" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="60" x2="32" y2="70" stroke="#000" strokeWidth="2"/>
          </g>
        ),
        'circle+downward_arc': (
          <g>
            <circle cx="25" cy="35" r="12" fill="#fff" stroke="#000" strokeWidth="2"/>
            <path d="M 18 35 Q 25 40 32 35" stroke="#000" strokeWidth="2" fill="none"/>
            <circle cx="22" cy="30" r="1.5" fill="#000"/>
            <circle cx="28" cy="30" r="1.5" fill="#000"/>
            <line x1="25" y1="47" x2="25" y2="60" stroke="#000" strokeWidth="3"/>
            <line x1="25" y1="50" x2="20" y2="58" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="50" x2="30" y2="58" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="60" x2="18" y2="70" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="60" x2="32" y2="70" stroke="#000" strokeWidth="2"/>
          </g>
        ),
        'square+zigzag': (
          <g>
            <rect x="15" y="25" width="20" height="20" fill="#fff" stroke="#000" strokeWidth="2"/>
            <path d="M 18 32 L 22 28 L 26 36 L 30 28 L 32 32" stroke="#000" strokeWidth="2" fill="none"/>
            <circle cx="21" cy="30" r="1.5" fill="#000"/>
            <circle cx="29" cy="30" r="1.5" fill="#000"/>
            <line x1="25" y1="45" x2="25" y2="60" stroke="#000" strokeWidth="3"/>
            <line x1="25" y1="50" x2="15" y2="55" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="50" x2="35" y2="55" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="60" x2="18" y2="70" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="60" x2="32" y2="70" stroke="#000" strokeWidth="2"/>
          </g>
        ),
        'triangle+exclamation': (
          <g>
            <polygon points="25,20 38,42 12,42" fill="#fff" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="28" x2="25" y2="35" stroke="#000" strokeWidth="2"/>
            <circle cx="25" cy="38" r="1.5" fill="#000"/>
            <line x1="25" y1="42" x2="25" y2="60" stroke="#000" strokeWidth="3"/>
            <line x1="25" y1="50" x2="15" y2="55" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="50" x2="35" y2="55" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="60" x2="18" y2="70" stroke="#000" strokeWidth="2"/>
            <line x1="25" y1="60" x2="32" y2="70" stroke="#000" strokeWidth="2"/>
          </g>
        )
      };

      return patterns[svgPattern] || patterns['circle+upward_arc'];
    };

    return (
      <div key={index} className="character" title={`${character.name} (${character.emotion})`}>
        <svg width="50" height="80" viewBox="0 0 50 80">
          {getCharacterSVG(character.svg_pattern)}
        </svg>
      </div>
    );
  };

  const renderBackground = () => {
    if (!panel.content.background) return null;
    
    return (
      <div className="panel-background">
        {panel.content.background.includes('雨') && (
          <svg className="rain-effect" width="100%" height="100%">
            {Array.from({length: 20}).map((_, i) => (
              <line 
                key={i}
                x1={Math.random() * 100 + '%'} 
                y1="0%" 
                x2={Math.random() * 100 + '%'} 
                y2="100%" 
                stroke="#4a90e2" 
                strokeWidth="1"
                opacity="0.6"
              />
            ))}
          </svg>
        )}
        {panel.content.background.includes('アジサイ') && (
          <div className="hydrangea-bg">
            <svg width="100%" height="100%">
              <circle cx="20%" cy="30%" r="15" fill="#9c88d4" opacity="0.7"/>
              <circle cx="25%" cy="35%" r="12" fill="#7c5fc7" opacity="0.7"/>
              <circle cx="70%" cy="25%" r="18" fill="#ff9aa2" opacity="0.7"/>
              <circle cx="75%" cy="30%" r="14" fill="#ffb3ba" opacity="0.7"/>
            </svg>
          </div>
        )}
        <div className="bg-description">{panel.content.background}</div>
      </div>
    );
  };

  return (
    <div 
      className={`manga-panel ${getPanelSizeClass(panel.size)} ${getTypeClass(panel.type)} ${editMode ? 'editable' : ''}`}
      onClick={handlePanelClick}
    >
      {/* パネル番号表示 */}
      <div className="panel-number-badge">
        {panel.panel_number}
      </div>

      {/* 背景 */}
      {renderBackground()}

      {/* ナレーション（状況説明） */}
      {panel.content.narration && (
        <div className="panel-narration">
          <span className="narration-text">
            {panel.content.narration}
          </span>
        </div>
      )}

      {/* キャラクター */}
      {panel.content.characters && panel.content.characters.length > 0 && (
        <div className="panel-characters">
          {panel.content.characters.map(renderCharacter)}
        </div>
      )}

      {/* 吹き出し（セリフ） */}
      {panel.content.dialogue && panel.content.dialogue.length > 0 && (
        <div className="panel-dialogues">
          {panel.content.dialogue.map((line, index) => (
            <div key={index} className="speech-bubble">
              <div className="bubble-content">{line}</div>
              <div className="bubble-tail"></div>
            </div>
          ))}
        </div>
      )}

      {/* 編集モード時の操作ヒント */}
      {editMode && (
        <div className="edit-hint">
          ✏️ クリックして編集
        </div>
      )}

      {/* 視覚的注意点 */}
      {panel.visual_notes && (
        <div className="visual-notes">
          {panel.visual_notes}
        </div>
      )}
    </div>
  );
};

export default MangaPanel;