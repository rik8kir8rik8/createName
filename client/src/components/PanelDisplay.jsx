import React from 'react';
import './PanelDisplay.css';

const PanelDisplay = ({ panel, sceneIndex, panelIndex }) => {
  const getSizeClass = (size) => {
    switch (size) {
      case 'large': return 'panel-large';
      case 'small': return 'panel-small';
      default: return 'panel-medium';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'action': return '⚡';
      case 'dialogue': return '💬';
      case 'narration': return '📝';
      case 'establishing': return '🏞️';
      default: return '📄';
    }
  };

  const renderCharacter = (character, index) => {
    // 簡単なSVG文字表現
    const getCharacterSVG = (svgPattern, emotion) => {
      const patterns = {
        'circle+upward_arc': (
          <g>
            <circle cx="25" cy="30" r="8" fill="#ffeb3b" stroke="#333" strokeWidth="1"/>
            <path d="M 20 28 Q 25 24 30 28" stroke="#333" strokeWidth="1" fill="none"/>
            <circle cx="23" cy="27" r="1" fill="#333"/>
            <circle cx="27" cy="27" r="1" fill="#333"/>
          </g>
        ),
        'circle+downward_arc': (
          <g>
            <circle cx="25" cy="30" r="8" fill="#e3f2fd" stroke="#333" strokeWidth="1"/>
            <path d="M 20 32 Q 25 36 30 32" stroke="#333" strokeWidth="1" fill="none"/>
            <circle cx="23" cy="27" r="1" fill="#333"/>
            <circle cx="27" cy="27" r="1" fill="#333"/>
          </g>
        ),
        'square+zigzag': (
          <g>
            <rect x="17" y="22" width="16" height="16" fill="#f44336" stroke="#333" strokeWidth="1"/>
            <path d="M 19 29 L 22 26 L 25 32 L 28 26 L 31 29" stroke="#333" strokeWidth="2" fill="none"/>
            <circle cx="22" cy="27" r="1" fill="#333"/>
            <circle cx="28" cy="27" r="1" fill="#333"/>
          </g>
        ),
        'triangle+exclamation': (
          <g>
            <polygon points="25,20 35,35 15,35" fill="#ff9800" stroke="#333" strokeWidth="1"/>
            <line x1="25" y1="25" x2="25" y2="30" stroke="#333" strokeWidth="2"/>
            <circle cx="25" cy="32" r="1" fill="#333"/>
          </g>
        )
      };

      return patterns[svgPattern] || patterns['circle+upward_arc'];
    };

    return (
      <div key={index} className="character" title={`${character.name} (${character.emotion})`}>
        <svg width="50" height="60" viewBox="0 0 50 60">
          {getCharacterSVG(character.svg_pattern, character.emotion)}
          <text x="25" y="55" textAnchor="middle" fontSize="8" fill="#333">
            {character.name}
          </text>
        </svg>
      </div>
    );
  };

  return (
    <div className={`panel ${getSizeClass(panel.size)} panel-type-${panel.type}`}>
      <div className="panel-header">
        <span className="panel-number">#{panel.panel_number}</span>
        <span className="panel-type">
          {getTypeIcon(panel.type)} {panel.type}
        </span>
        <span className="panel-size">{panel.size}</span>
      </div>

      <div className="panel-content">
        {/* 背景 */}
        {panel.content.background && (
          <div className="panel-background">
            <div className="background-placeholder">
              🏞️ {panel.content.background}
            </div>
          </div>
        )}

        {/* キャラクター */}
        {panel.content.characters && panel.content.characters.length > 0 && (
          <div className="panel-characters">
            {panel.content.characters.map(renderCharacter)}
          </div>
        )}

        {/* セリフ */}
        {panel.content.dialogue && panel.content.dialogue.length > 0 && (
          <div className="panel-dialogue">
            {panel.content.dialogue.map((line, index) => (
              <div key={index} className="speech-bubble">
                {line}
              </div>
            ))}
          </div>
        )}

        {/* ナレーション */}
        {panel.content.narration && (
          <div className="panel-narration">
            <div className="narration-box">
              {panel.content.narration}
            </div>
          </div>
        )}
      </div>

      {panel.visual_notes && (
        <div className="panel-notes">
          <small>💡 {panel.visual_notes}</small>
        </div>
      )}
    </div>
  );
};

export default PanelDisplay;