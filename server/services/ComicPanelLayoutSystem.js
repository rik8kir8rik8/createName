const { createCanvas } = require('canvas');

/**
 * プロ品質のコマ割り自動生成システム
 * sample.png相当の動的レイアウト・不規則コマ構成を実現
 */
class ComicPanelLayoutSystem {
  constructor(options = {}) {
    this.pageWidth = options.pageWidth || 800;
    this.pageHeight = options.pageHeight || 1200;
    this.margin = options.margin || 20;
    this.gutterSize = options.gutterSize || 8;
    
    // コマ割りパターン定義（sample.png基準）
    this.layoutPatterns = {
      // 5コマパターン（sample.png型）
      'sample_style': {
        panels: [
          { id: 'A', weight: 3, priority: 'high', position: 'top-left' },
          { id: 'B', weight: 2, priority: 'high', position: 'top-right' },
          { id: 'C', weight: 4, priority: 'highest', position: 'center-wide' },
          { id: 'D', weight: 2, priority: 'medium', position: 'bottom-left' },
          { id: 'E', weight: 2, priority: 'medium', position: 'bottom-right' }
        ],
        layout: 'irregular_diagonal'
      },
      // 4コマパターン
      'yonkoma': {
        panels: [
          { id: 'A', weight: 1, priority: 'equal', position: 'top' },
          { id: 'B', weight: 1, priority: 'equal', position: 'upper-mid' },
          { id: 'C', weight: 1, priority: 'equal', position: 'lower-mid' },
          { id: 'D', weight: 1, priority: 'equal', position: 'bottom' }
        ],
        layout: 'vertical_equal'
      },
      // 3コマパターン
      'sankoma': {
        panels: [
          { id: 'A', weight: 2, priority: 'high', position: 'top-wide' },
          { id: 'B', weight: 1, priority: 'medium', position: 'bottom-left' },
          { id: 'C', weight: 1, priority: 'medium', position: 'bottom-right' }
        ],
        layout: 'L_shape'
      }
    };
  }

  /**
   * ストーリーデータからコマ割りレイアウトを自動生成
   * @param {Array} storyScenes - シーンデータ配列
   * @param {Object} options - レイアウト オプション
   * @returns {Object} コマ割りレイアウト情報
   */
  async generatePanelLayout(storyScenes, options = {}) {
    try {
      console.log('🎬 コマ割り自動生成開始...');
      
      // 1. シーン分析でコマ数・重要度を決定
      const panelAnalysis = this.analyzeStoryForPanels(storyScenes);
      
      // 2. 最適なレイアウトパターンを選択
      const layoutPattern = this.selectOptimalLayout(panelAnalysis);
      
      // 3. 動的レイアウト計算
      const panelGeometry = this.calculatePanelGeometry(layoutPattern, panelAnalysis);
      
      // 4. コマ境界線・効果の追加
      const enhancedLayout = this.addPanelEffects(panelGeometry, layoutPattern);
      
      console.log(`✅ ${enhancedLayout.panels.length}コマのレイアウト生成完了`);
      
      return {
        layoutType: layoutPattern.layout,
        pageSize: { width: this.pageWidth, height: this.pageHeight },
        panels: enhancedLayout.panels,
        effects: enhancedLayout.effects,
        metadata: {
          totalPanels: enhancedLayout.panels.length,
          layoutPattern: layoutPattern,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ コマ割り生成エラー:', error);
      throw error;
    }
  }

  /**
   * ストーリー分析によるコマ構成決定
   * @param {Array} storyScenes - シーンデータ
   * @returns {Object} パネル分析結果
   */
  analyzeStoryForPanels(storyScenes) {
    const panelCount = Math.min(Math.max(storyScenes.length, 3), 6); // 3-6コマに制限
    
    // シーン重要度分析
    const sceneAnalysis = storyScenes.map((scene, index) => {
      let importance = 'medium';
      let emotionalWeight = 1;
      
      // キャラクターの感情・動作から重要度判定
      if (scene.character?.expression) {
        const emotionKeywords = ['surprised', 'angry', 'sad', 'happy', 'shocked'];
        if (emotionKeywords.some(emotion => 
          scene.character.expression.includes(emotion) ||
          (scene.character.originalDescription && scene.character.originalDescription.includes(emotion))
        )) {
          importance = 'high';
          emotionalWeight = 2;
        }
      }
      
      // 構図・背景から重要度判定
      if (scene.composition?.layout === 'depth-layered' || 
          scene.camera?.type === 'close-up' ||
          scene.background?.lighting === 'dramatic') {
        importance = 'high';
        emotionalWeight = Math.max(emotionalWeight, 1.5);
      }
      
      // 1番目と最後のコマは重要度を上げる
      if (index === 0 || index === storyScenes.length - 1) {
        importance = index === 0 ? 'highest' : 'high';
        emotionalWeight = Math.max(emotionalWeight, 1.8);
      }
      
      return {
        sceneIndex: index,
        importance: importance,
        emotionalWeight: emotionalWeight,
        hasAction: scene.character?.pose !== 'standing',
        hasDialogue: false, // 将来的にセリフ解析
        sceneType: this.classifySceneType(scene)
      };
    });

    return {
      panelCount: panelCount,
      scenes: sceneAnalysis,
      recommendedLayout: this.getRecommendedLayoutType(sceneAnalysis)
    };
  }

  /**
   * シーンタイプ分類
   * @param {Object} scene - シーンデータ
   * @returns {string} シーンタイプ
   */
  classifySceneType(scene) {
    if (scene.camera?.type === 'close-up') return 'emotion';
    if (scene.character?.pose === 'standing') return 'action';
    if (scene.background?.environment === 'room') return 'setting';
    return 'transition';
  }

  /**
   * 最適なレイアウトパターンを選択
   * @param {Object} panelAnalysis - パネル分析結果
   * @returns {Object} 選択されたレイアウトパターン
   */
  selectOptimalLayout(panelAnalysis) {
    const { panelCount, scenes } = panelAnalysis;
    
    // sample.png風の5コマレイアウトを優先
    if (panelCount === 5) {
      return this.layoutPatterns.sample_style;
    }
    
    // その他のパターン
    if (panelCount === 4) {
      return this.layoutPatterns.yonkoma;
    }
    
    if (panelCount === 3) {
      return this.layoutPatterns.sankoma;
    }
    
    // デフォルト: sample_style を基に動的調整
    return this.createCustomLayout(panelAnalysis);
  }

  /**
   * カスタムレイアウト生成
   * @param {Object} panelAnalysis - パネル分析結果
   * @returns {Object} カスタムレイアウト
   */
  createCustomLayout(panelAnalysis) {
    const panels = panelAnalysis.scenes.map((scene, index) => ({
      id: String.fromCharCode(65 + index), // A, B, C, ...
      weight: scene.emotionalWeight,
      priority: scene.importance,
      position: this.calculatePosition(index, panelAnalysis.panelCount),
      sceneType: scene.sceneType
    }));

    return {
      panels: panels,
      layout: 'custom_dynamic'
    };
  }

  /**
   * 推奨レイアウトタイプ取得
   * @param {Array} sceneAnalysis - シーン分析結果
   * @returns {string} レイアウトタイプ
   */
  getRecommendedLayoutType(sceneAnalysis) {
    const hasHighEmotion = sceneAnalysis.some(s => s.importance === 'highest');
    const hasAction = sceneAnalysis.some(s => s.hasAction);
    
    if (hasHighEmotion && hasAction) return 'irregular_diagonal';
    if (hasHighEmotion) return 'L_shape';
    return 'vertical_equal';
  }

  /**
   * コマの幾何学的配置計算
   * @param {Object} layoutPattern - レイアウトパターン
   * @param {Object} panelAnalysis - パネル分析結果
   * @returns {Object} 幾何学的レイアウト
   */
  calculatePanelGeometry(layoutPattern, panelAnalysis) {
    const workArea = {
      x: this.margin,
      y: this.margin,
      width: this.pageWidth - (this.margin * 2),
      height: this.pageHeight - (this.margin * 2)
    };

    let panels = [];

    if (layoutPattern.layout === 'irregular_diagonal') {
      // sample.png風の不規則配置
      panels = this.calculateIrregularDiagonalLayout(workArea, layoutPattern.panels);
    } else if (layoutPattern.layout === 'vertical_equal') {
      // 4コマ漫画風の縦等分割
      panels = this.calculateVerticalEqualLayout(workArea, layoutPattern.panels);
    } else if (layoutPattern.layout === 'L_shape') {
      // L字型レイアウト
      panels = this.calculateLShapeLayout(workArea, layoutPattern.panels);
    } else {
      // カスタム動的レイアウト
      panels = this.calculateDynamicLayout(workArea, layoutPattern.panels);
    }

    return { panels };
  }

  /**
   * sample.png風の不規則対角レイアウト計算
   * @param {Object} workArea - 作業エリア
   * @param {Array} panelDefs - パネル定義
   * @returns {Array} パネル配置情報
   */
  calculateIrregularDiagonalLayout(workArea, panelDefs) {
    const panels = [];
    
    // sample.pngを参考にした比率配置
    const topHeight = workArea.height * 0.35; // 上段35%
    const centerHeight = workArea.height * 0.4; // 中段40%
    const bottomHeight = workArea.height * 0.25; // 下段25%
    
    // パネルA: 左上（大きめ）
    panels.push({
      id: 'A',
      x: workArea.x,
      y: workArea.y,
      width: workArea.width * 0.55,
      height: topHeight,
      rotation: 0,
      zIndex: 1,
      borderStyle: 'normal'
    });
    
    // パネルB: 右上（集中線エリア）
    panels.push({
      id: 'B',
      x: workArea.x + workArea.width * 0.57,
      y: workArea.y,
      width: workArea.width * 0.43,
      height: topHeight,
      rotation: 0,
      zIndex: 1,
      borderStyle: 'speed_lines'
    });
    
    // パネルC: 中央横長（メインシーン）
    panels.push({
      id: 'C',
      x: workArea.x,
      y: workArea.y + topHeight + this.gutterSize,
      width: workArea.width,
      height: centerHeight,
      rotation: 0,
      zIndex: 2,
      borderStyle: 'thick'
    });
    
    // パネルD: 左下
    panels.push({
      id: 'D',
      x: workArea.x,
      y: workArea.y + topHeight + centerHeight + (this.gutterSize * 2),
      width: workArea.width * 0.48,
      height: bottomHeight,
      rotation: 0,
      zIndex: 1,
      borderStyle: 'normal'
    });
    
    // パネルE: 右下
    panels.push({
      id: 'E',
      x: workArea.x + workArea.width * 0.52,
      y: workArea.y + topHeight + centerHeight + (this.gutterSize * 2),
      width: workArea.width * 0.48,
      height: bottomHeight,
      rotation: 0,
      zIndex: 1,
      borderStyle: 'normal'
    });
    
    return panels;
  }

  /**
   * 縦等分割レイアウト計算（4コマ漫画風）
   * @param {Object} workArea - 作業エリア
   * @param {Array} panelDefs - パネル定義
   * @returns {Array} パネル配置情報
   */
  calculateVerticalEqualLayout(workArea, panelDefs) {
    const panels = [];
    const panelHeight = (workArea.height - (this.gutterSize * (panelDefs.length - 1))) / panelDefs.length;
    
    panelDefs.forEach((panelDef, index) => {
      panels.push({
        id: panelDef.id,
        x: workArea.x,
        y: workArea.y + (index * (panelHeight + this.gutterSize)),
        width: workArea.width,
        height: panelHeight,
        rotation: 0,
        zIndex: 1,
        borderStyle: 'normal'
      });
    });
    
    return panels;
  }

  /**
   * L字型レイアウト計算
   * @param {Object} workArea - 作業エリア
   * @param {Array} panelDefs - パネル定義
   * @returns {Array} パネル配置情報
   */
  calculateLShapeLayout(workArea, panelDefs) {
    const panels = [];
    
    // 上段大きなパネル
    panels.push({
      id: 'A',
      x: workArea.x,
      y: workArea.y,
      width: workArea.width,
      height: workArea.height * 0.6,
      rotation: 0,
      zIndex: 2,
      borderStyle: 'thick'
    });
    
    // 下段2分割
    const bottomY = workArea.y + workArea.height * 0.6 + this.gutterSize;
    const bottomHeight = workArea.height * 0.4 - this.gutterSize;
    const bottomWidth = (workArea.width - this.gutterSize) / 2;
    
    panels.push({
      id: 'B',
      x: workArea.x,
      y: bottomY,
      width: bottomWidth,
      height: bottomHeight,
      rotation: 0,
      zIndex: 1,
      borderStyle: 'normal'
    });
    
    panels.push({
      id: 'C',
      x: workArea.x + bottomWidth + this.gutterSize,
      y: bottomY,
      width: bottomWidth,
      height: bottomHeight,
      rotation: 0,
      zIndex: 1,
      borderStyle: 'normal'
    });
    
    return panels;
  }

  /**
   * 動的レイアウト計算
   * @param {Object} workArea - 作業エリア
   * @param {Array} panelDefs - パネル定義
   * @returns {Array} パネル配置情報
   */
  calculateDynamicLayout(workArea, panelDefs) {
    // 重要度に基づく面積配分
    const totalWeight = panelDefs.reduce((sum, p) => sum + p.weight, 0);
    const panels = [];
    
    let currentY = workArea.y;
    let remainingHeight = workArea.height;
    
    panelDefs.forEach((panelDef, index) => {
      const heightRatio = panelDef.weight / totalWeight;
      const panelHeight = remainingHeight * heightRatio;
      
      panels.push({
        id: panelDef.id,
        x: workArea.x,
        y: currentY,
        width: workArea.width,
        height: panelHeight - (index < panelDefs.length - 1 ? this.gutterSize : 0),
        rotation: 0,
        zIndex: panelDef.priority === 'highest' ? 2 : 1,
        borderStyle: panelDef.priority === 'highest' ? 'thick' : 'normal'
      });
      
      currentY += panelHeight;
      remainingHeight -= panelHeight;
    });
    
    return panels;
  }

  /**
   * パネル効果・境界線の追加
   * @param {Object} panelGeometry - パネル幾何情報
   * @param {Object} layoutPattern - レイアウトパターン
   * @returns {Object} 効果付きレイアウト
   */
  addPanelEffects(panelGeometry, layoutPattern) {
    const effects = {
      borderLines: [],
      speedLines: [],
      focusLines: [],
      diagonalCuts: []
    };

    // sample.png風の斜め境界線追加
    if (layoutPattern.layout === 'irregular_diagonal') {
      // 斜め境界線効果
      effects.diagonalCuts.push({
        type: 'diagonal_border',
        startPanel: 'A',
        endPanel: 'B',
        angle: -15, // 斜め角度
        style: 'dynamic'
      });
    }

    // 集中線効果（Bパネル）
    panelGeometry.panels.forEach(panel => {
      if (panel.borderStyle === 'speed_lines') {
        effects.speedLines.push({
          panelId: panel.id,
          centerX: panel.x + panel.width / 2,
          centerY: panel.y + panel.height / 2,
          lineCount: 24,
          intensity: 'high'
        });
      }
    });

    return {
      panels: panelGeometry.panels,
      effects: effects
    };
  }

  /**
   * ポジション計算ヘルパー
   * @param {number} index - パネルインデックス
   * @param {number} totalPanels - 総パネル数
   * @returns {string} ポジション文字列
   */
  calculatePosition(index, totalPanels) {
    if (index === 0) return 'top';
    if (index === totalPanels - 1) return 'bottom';
    return 'middle';
  }
}

module.exports = ComicPanelLayoutSystem;