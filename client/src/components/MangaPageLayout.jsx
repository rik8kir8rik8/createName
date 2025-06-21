import React from 'react';
import './MangaPageLayout.css';
import MangaPanel from './MangaPanel';

const MangaPageLayout = ({ panels, sceneIndex, layoutTemplate, editMode, onPanelEdit }) => {
  const getLayoutClass = (template) => {
    switch (template) {
      case 'standard_4': return 'layout-standard-4';
      case 'vertical_story': return 'layout-vertical-story';
      case 'action_sequence': return 'layout-action-sequence';
      case 'dialogue_focus': return 'layout-dialogue-focus';
      case 'climax_spread': return 'layout-climax-spread';
      case 'intro_page': return 'layout-intro-page';
      default: return 'layout-standard-4';
    }
  };

  const getGridLayout = (template, panelCount) => {
    switch (template) {
      case 'standard_4':
        return {
          gridTemplateRows: '1fr 1fr',
          gridTemplateColumns: '1fr 1fr'
        };
      case 'vertical_story':
        return {
          gridTemplateRows: 'repeat(3, 1fr)',
          gridTemplateColumns: '1fr 1fr'
        };
      case 'action_sequence':
        return {
          gridTemplateRows: 'repeat(4, 1fr)',
          gridTemplateColumns: 'repeat(2, 1fr)'
        };
      case 'dialogue_focus':
        return {
          gridTemplateRows: '2fr 1fr 2fr',
          gridTemplateColumns: '1fr'
        };
      case 'climax_spread':
        return {
          gridTemplateRows: '1fr',
          gridTemplateColumns: '1fr 1fr'
        };
      case 'intro_page':
        return {
          gridTemplateRows: '2fr repeat(2, 1fr)',
          gridTemplateColumns: 'repeat(2, 1fr)'
        };
      default:
        // 動的レイアウト（パネル数に応じて調整）
        if (panelCount <= 2) {
          return {
            gridTemplateRows: '1fr',
            gridTemplateColumns: panelCount === 1 ? '1fr' : '1fr 1fr'
          };
        } else if (panelCount <= 4) {
          return {
            gridTemplateRows: '1fr 1fr',
            gridTemplateColumns: '1fr 1fr'
          };
        } else if (panelCount <= 6) {
          return {
            gridTemplateRows: 'repeat(3, 1fr)',
            gridTemplateColumns: 'repeat(2, 1fr)'
          };
        } else {
          return {
            gridTemplateRows: 'repeat(4, 1fr)',
            gridTemplateColumns: 'repeat(2, 1fr)'
          };
        }
    }
  };

  const gridStyle = getGridLayout(layoutTemplate, panels.length);

  return (
    <div 
      className={`manga-page-layout ${getLayoutClass(layoutTemplate)}`}
      style={gridStyle}
    >
      {panels.map((panel, panelIndex) => (
        <MangaPanel
          key={panelIndex}
          panel={panel}
          panelIndex={panelIndex}
          sceneIndex={sceneIndex}
          editMode={editMode}
          onEdit={onPanelEdit}
        />
      ))}
    </div>
  );
};

export default MangaPageLayout;