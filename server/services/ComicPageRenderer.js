const { createCanvas } = require('canvas');
const ComicPanelLayoutSystem = require('./ComicPanelLayoutSystem');
const ProfessionalCharacterRenderer = require('./ProfessionalCharacterRenderer');
const Model3DRenderer = require('./Model3DRenderer');
const VRMRenderer = require('./VRMRenderer');
const VRMPoseController = require('./VRMPoseController');

/**
 * コマ割りレイアウトを実際の画像として描画するレンダラー
 * sample.png相当の複数コマページを生成
 */
class ComicPageRenderer {
  constructor(options = {}) {
    this.pageWidth = options.pageWidth || 800;
    this.pageHeight = options.pageHeight || 1200;
    this.canvas = createCanvas(this.pageWidth, this.pageHeight);
    this.ctx = this.canvas.getContext('2d');
    
    // 線画スタイル設定
    this.borderStyles = {
      normal: { lineWidth: 2, color: '#000000' },
      thick: { lineWidth: 4, color: '#000000' },
      thin: { lineWidth: 1, color: '#000000' },
      dashed: { lineWidth: 2, color: '#000000', lineDash: [5, 5] }
    };
    
    this.layoutSystem = new ComicPanelLayoutSystem({
      pageWidth: this.pageWidth,
      pageHeight: this.pageHeight
    });
    
    this.professionalCharacterRenderer = new ProfessionalCharacterRenderer({
      quality: 'high',
      lineWeight: 2,
      detailLevel: 'professional'
    });
    
    // 3Dモデルレンダラー（新しい高品質システム）
    this.model3DRenderer = new Model3DRenderer({
      quality: 'high',
      renderSettings: {
        resolution: { width: this.pageWidth, height: this.pageHeight },
        antiAliasing: true,
        shadows: true
      }
    });
    
    // VRMレンダラー（最高品質VRMキャラクターシステム）
    this.vrmRenderer = new VRMRenderer({
      width: this.pageWidth,
      height: this.pageHeight,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    
    // VRMポーズコントローラー
    this.vrmPoseController = null; // VRM読み込み後に初期化
  }

  /**
   * 複数シーンからコマ割りページを描画
   * @param {Array} storyScenes - シーンデータ配列
   * @param {Object} renderOptions - 描画オプション
   * @returns {Promise<Buffer>} 描画済みページ画像
   */
  async renderComicPage(storyScenes, renderOptions = {}) {
    try {
      console.log('📖 コマ割りページ描画開始...');
      
      // 1. コマ割りレイアウト生成
      const layout = await this.layoutSystem.generatePanelLayout(storyScenes, renderOptions);
      
      // 2. ページクリア・背景設定
      this.clearPage();
      
      // 3. 各コマのコンテンツ描画
      for (let i = 0; i < layout.panels.length; i++) {
        const panel = layout.panels[i];
        const scene = storyScenes[i] || storyScenes[storyScenes.length - 1]; // フォールバック
        
        await this.renderPanelContent(panel, scene, renderOptions);
      }
      
      // 4. コマ境界線・効果の描画
      this.renderPanelBorders(layout.panels);
      this.renderPanelEffects(layout.effects);
      
      // 5. 最終仕上げ
      this.applyPageEffects(layout, renderOptions);
      
      console.log(`✅ ${layout.panels.length}コマのページ描画完了`);
      
      return {
        imageBuffer: this.canvas.toBuffer('image/png'),
        layout: layout,
        metadata: {
          panelCount: layout.panels.length,
          pageSize: { width: this.pageWidth, height: this.pageHeight },
          renderedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ コマ割りページ描画エラー:', error);
      throw error;
    }
  }

  /**
   * ページクリア・背景設定
   */
  clearPage() {
    // 白背景
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.pageWidth, this.pageHeight);
    
    // アンチエイリアス有効化
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  /**
   * 個別コマの内容描画
   * @param {Object} panel - パネル情報
   * @param {Object} scene - シーンデータ
   * @param {Object} options - 描画オプション
   */
  async renderPanelContent(panel, scene, options = {}) {
    // パネル領域にクリップ設定
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(panel.x, panel.y, panel.width, panel.height);
    this.ctx.clip();
    
    // 背景描画
    this.renderPanelBackground(panel, scene);
    
    // キャラクター描画
    if (scene.character?.visible) {
      this.renderPanelCharacter(panel, scene.character);
    }
    
    // 小道具・背景オブジェクト描画
    if (scene.background?.props) {
      this.renderPanelProps(panel, scene.background.props);
    }
    
    // パネル特有の効果
    this.renderPanelSpecialEffects(panel, scene);
    
    this.ctx.restore();
  }

  /**
   * パネル背景描画
   * @param {Object} panel - パネル情報
   * @param {Object} scene - シーンデータ
   */
  renderPanelBackground(panel, scene) {
    const bgColor = scene.background?.ambientColor || '#f5f5f5';
    
    // 基本背景色
    this.ctx.fillStyle = bgColor;
    this.ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
    
    // 環境に応じた背景
    if (scene.background?.environment === 'room') {
      this.renderRoomBackground(panel, scene);
    }
  }

  /**
   * 室内背景の簡易描画
   * @param {Object} panel - パネル情報
   * @param {Object} scene - シーンデータ
   */
  renderRoomBackground(panel, scene) {
    // 床線
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(panel.x, panel.y + panel.height * 0.8);
    this.ctx.lineTo(panel.x + panel.width, panel.y + panel.height * 0.8);
    this.ctx.stroke();
    
    // 壁の示唆線
    this.ctx.beginPath();
    this.ctx.moveTo(panel.x + panel.width * 0.1, panel.y);
    this.ctx.lineTo(panel.x + panel.width * 0.1, panel.y + panel.height * 0.8);
    this.ctx.stroke();
  }

  /**
   * パネル内キャラクター描画（高品質版）
   * @param {Object} panel - パネル情報
   * @param {Object} character - キャラクターデータ
   */
  async renderPanelCharacter(panel, character) {
    try {
      console.log(`🤖 VRMレンダリング試行: ${character.pose}`);
      
      // 最高品質: VRMレンダリングを最優先で試行
      if (character.useVRM && this.vrmRenderer && this.vrmRenderer.vrmModel) {
        await this.renderVRMCharacter(panel, character);
        console.log(`✅ VRMレンダリング成功`);
        return;
      }
      
      console.log(`🎮 3Dモデルレンダリング試行: ${character.pose}`);
      
      // 次点: 3Dモデルレンダリングを試行
      await this.model3DRenderer.renderProfessional3DCharacter(
        this.ctx,
        panel,
        character,
        { 
          renderStyle: 'manga',
          quality: 'ultra_high',
          lighting: 'dramatic'
        }
      );
      
      console.log(`✅ 3Dモデルレンダリング成功`);
      
    } catch (error) {
      console.warn('⚠️ 3Dレンダリング失敗、プロ品質2D描画にフォールバック:', error.message);
      
      try {
        // フォールバック1: プロ品質2Dキャラクター描画システムを使用
        await this.professionalCharacterRenderer.renderProfessionalCharacter(
          this.ctx, 
          panel, 
          character, 
          { renderStyle: 'manga' }
        );
        
        console.log(`✅ プロ品質2D描画成功`);
        
      } catch (fallbackError) {
        console.warn('⚠️ プロ品質2D描画も失敗、シンプル描画を使用:', fallbackError.message);
        
        // フォールバック2: シンプルな描画
        this.renderSimpleCharacter(panel, character);
      }
    }
  }

  /**
   * シンプルなキャラクター描画（フォールバック）
   * @param {Object} panel - パネル情報
   * @param {Object} character - キャラクターデータ
   */
  renderSimpleCharacter(panel, character) {
    const centerX = panel.x + panel.width / 2;
    const centerY = panel.y + panel.height / 2;
    const scale = Math.min(panel.width, panel.height) / 300; // スケール調整
    
    // シンプルなキャラクター表現
    this.ctx.fillStyle = character.detailedAttributes?.skinTone || '#ffdbac';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    
    // 頭部（円）
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY - 30 * scale, 25 * scale, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    // 胴体（楕円）
    this.ctx.fillStyle = character.detailedAttributes?.clothingColor?.shirt || '#87ceeb';
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY + 20 * scale, 20 * scale, 35 * scale, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    // ポーズに応じた調整
    if (character.pose === 'sitting-up') {
      // 座った姿勢の調整
      this.ctx.fillStyle = character.detailedAttributes?.clothingColor?.pants || '#87ceeb';
      this.ctx.fillRect(centerX - 15 * scale, centerY + 40 * scale, 30 * scale, 20 * scale);
      this.ctx.strokeRect(centerX - 15 * scale, centerY + 40 * scale, 30 * scale, 20 * scale);
    }
  }

  /**
   * パネル内小道具描画
   * @param {Object} panel - パネル情報
   * @param {Array} props - 小道具配列
   */
  renderPanelProps(panel, props) {
    props.forEach(prop => {
      switch (prop) {
        case 'bed':
          this.renderBedInPanel(panel);
          break;
        case 'window':
          this.renderWindowInPanel(panel);
          break;
        case 'curtain':
          this.renderCurtainInPanel(panel);
          break;
      }
    });
  }

  /**
   * パネル内ベッド描画
   * @param {Object} panel - パネル情報
   */
  renderBedInPanel(panel) {
    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 2;
    
    const bedX = panel.x + panel.width * 0.1;
    const bedY = panel.y + panel.height * 0.7;
    const bedW = panel.width * 0.6;
    const bedH = panel.height * 0.2;
    
    this.ctx.strokeRect(bedX, bedY, bedW, bedH);
  }

  /**
   * パネル内窓描画
   * @param {Object} panel - パネル情報
   */
  renderWindowInPanel(panel) {
    this.ctx.strokeStyle = '#666666';
    this.ctx.lineWidth = 2;
    
    const winX = panel.x + panel.width * 0.7;
    const winY = panel.y + panel.height * 0.1;
    const winW = panel.width * 0.25;
    const winH = panel.height * 0.4;
    
    this.ctx.strokeRect(winX, winY, winW, winH);
    
    // 窓枠の十字
    this.ctx.beginPath();
    this.ctx.moveTo(winX + winW/2, winY);
    this.ctx.lineTo(winX + winW/2, winY + winH);
    this.ctx.moveTo(winX, winY + winH/2);
    this.ctx.lineTo(winX + winW, winY + winH/2);
    this.ctx.stroke();
  }

  /**
   * パネル内カーテン描画
   * @param {Object} panel - パネル情報
   */
  renderCurtainInPanel(panel) {
    this.ctx.strokeStyle = '#4a4a4a';
    this.ctx.lineWidth = 1;
    
    const curtainX = panel.x + panel.width * 0.75;
    const curtainY = panel.y + panel.height * 0.1;
    const curtainH = panel.height * 0.5;
    
    // 波状のカーテン線
    this.ctx.beginPath();
    this.ctx.moveTo(curtainX, curtainY);
    for (let i = 0; i < curtainH; i += 10) {
      const waveX = curtainX + Math.sin(i * 0.2) * 5;
      this.ctx.lineTo(waveX, curtainY + i);
    }
    this.ctx.stroke();
  }

  /**
   * パネル特殊効果
   * @param {Object} panel - パネル情報
   * @param {Object} scene - シーンデータ
   */
  renderPanelSpecialEffects(panel, scene) {
    // 集中線効果
    if (panel.borderStyle === 'speed_lines') {
      this.renderSpeedLinesInPanel(panel);
    }
    
    // 感情表現
    if (scene.character?.expression === 'surprised') {
      this.renderSurpriseEffectInPanel(panel);
    }
  }

  /**
   * パネル内集中線描画
   * @param {Object} panel - パネル情報
   */
  renderSpeedLinesInPanel(panel) {
    const centerX = panel.x + panel.width / 2;
    const centerY = panel.y + panel.height / 2;
    const lineCount = 16;
    
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i < lineCount; i++) {
      const angle = (i / lineCount) * Math.PI * 2;
      const startRadius = 20;
      const endRadius = Math.min(panel.width, panel.height) / 2;
      
      const startX = centerX + Math.cos(angle) * startRadius;
      const startY = centerY + Math.sin(angle) * startRadius;
      const endX = centerX + Math.cos(angle) * endRadius;
      const endY = centerY + Math.sin(angle) * endRadius;
      
      this.ctx.beginPath();
      this.ctx.moveTo(startX, startY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }
  }

  /**
   * 驚き効果
   * @param {Object} panel - パネル情報
   */
  renderSurpriseEffectInPanel(panel) {
    // 簡易な効果線
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 3;
    
    this.ctx.beginPath();
    this.ctx.moveTo(panel.x + panel.width * 0.9, panel.y + panel.height * 0.1);
    this.ctx.lineTo(panel.x + panel.width * 0.8, panel.y + panel.height * 0.2);
    this.ctx.stroke();
  }

  /**
   * コマ境界線描画
   * @param {Array} panels - パネル配列
   */
  renderPanelBorders(panels) {
    panels.forEach(panel => {
      const style = this.borderStyles[panel.borderStyle] || this.borderStyles.normal;
      
      this.ctx.strokeStyle = style.color;
      this.ctx.lineWidth = style.lineWidth;
      
      if (style.lineDash) {
        this.ctx.setLineDash(style.lineDash);
      } else {
        this.ctx.setLineDash([]);
      }
      
      this.ctx.strokeRect(panel.x, panel.y, panel.width, panel.height);
    });
  }

  /**
   * パネル効果描画
   * @param {Object} effects - 効果情報
   */
  renderPanelEffects(effects) {
    // 集中線効果
    if (effects.speedLines) {
      effects.speedLines.forEach(speedLine => {
        this.renderPageSpeedLines(speedLine);
      });
    }
    
    // 斜め境界線
    if (effects.diagonalCuts) {
      effects.diagonalCuts.forEach(cut => {
        this.renderDiagonalCut(cut);
      });
    }
  }

  /**
   * ページレベル集中線
   * @param {Object} speedLine - 集中線情報
   */
  renderPageSpeedLines(speedLine) {
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i < speedLine.lineCount; i++) {
      const angle = (i / speedLine.lineCount) * Math.PI * 2;
      const length = 100;
      
      const endX = speedLine.centerX + Math.cos(angle) * length;
      const endY = speedLine.centerY + Math.sin(angle) * length;
      
      this.ctx.beginPath();
      this.ctx.moveTo(speedLine.centerX, speedLine.centerY);
      this.ctx.lineTo(endX, endY);
      this.ctx.stroke();
    }
  }

  /**
   * 斜め境界線カット
   * @param {Object} cut - カット情報
   */
  renderDiagonalCut(cut) {
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    
    // 簡易的な斜め線
    this.ctx.beginPath();
    this.ctx.moveTo(this.pageWidth * 0.5, 0);
    this.ctx.lineTo(this.pageWidth * 0.6, this.pageHeight * 0.4);
    this.ctx.stroke();
  }

  /**
   * VRMキャラクター描画
   * @param {Object} panel - パネル情報
   * @param {Object} character - キャラクターデータ
   */
  async renderVRMCharacter(panel, character) {
    console.log(`🤖 VRMキャラクター描画開始: ${character.pose}`);
    
    try {
      // VRMポーズコントローラーの初期化（まだの場合）
      if (!this.vrmPoseController && this.vrmRenderer.vrmModel) {
        this.vrmPoseController = new VRMPoseController(this.vrmRenderer);
        console.log('🎭 VRMポーズコントローラー初期化完了');
      }
      
      // ポーズ適用
      if (this.vrmPoseController && character.pose) {
        const poseName = this.mapToVRMPose(character.pose);
        await this.vrmPoseController.applyPose(poseName, {
          transition: character.smoothTransition !== false
        });
      }
      
      // 表情適用
      if (this.vrmPoseController && character.expression) {
        const expressionName = this.mapToVRMExpression(character.expression);
        await this.vrmPoseController.setExpression(expressionName, {
          transition: character.smoothTransition !== false,
          intensity: character.expressionIntensity || 1.0
        });
      }
      
      // カメラ調整
      this.adjustVRMCamera(panel, character);
      
      // VRMレンダリングをCanvasに描画
      await this.vrmRenderer.renderToCanvas(this.ctx, panel);
      
      console.log(`✅ VRMキャラクター描画完了`);
      return true;
    } catch (error) {
      console.error('❌ VRMキャラクター描画エラー:', error);
      throw error;
    }
  }

  /**
   * ポーズ名をVRM用にマッピング
   * @param {string} pose - 汎用ポーズ名
   */
  mapToVRMPose(pose) {
    const mapping = {
      'standing': 'neutral',
      'thinking': 'thinking',
      'surprised': 'surprised',
      'sitting': 'sitting',
      'sitting_floor': 'sitting',
      'sitting-up': 'sitting',
      'smiling': 'smiling',
      'smiling_closeup': 'smiling',
      'standing_up': 'standing_up',
      'looking': 'neutral'
    };
    
    return mapping[pose] || 'neutral';
  }

  /**
   * 表情名をVRM用にマッピング
   * @param {string} expression - 汎用表情名
   */
  mapToVRMExpression(expression) {
    const mapping = {
      'neutral': 'neutral',
      'happy': 'happy',
      'sad': 'sad',
      'angry': 'angry',
      'surprised': 'surprised',
      'relaxed': 'relaxed',
      'thinking': 'thinking',
      'smiling': 'smiling'
    };
    
    return mapping[expression] || 'neutral';
  }

  /**
   * VRMカメラ調整
   * @param {Object} panel - パネル情報
   * @param {Object} character - キャラクターデータ
   */
  adjustVRMCamera(panel, character) {
    if (!this.vrmRenderer || !this.vrmRenderer.camera) {
      return;
    }
    
    // カメラタイプに応じた調整
    const cameraType = character.camera?.type || 'middle';
    const panelAspect = panel.width / panel.height;
    
    switch (cameraType) {
      case 'close-up':
        this.vrmRenderer.camera.position.set(0, 1.8, 1.5);
        this.vrmRenderer.camera.fov = 35;
        break;
      case 'wide-shot':
        this.vrmRenderer.camera.position.set(0, 1.5, 4.5);
        this.vrmRenderer.camera.fov = 50;
        break;
      default: // middle
        this.vrmRenderer.camera.position.set(0, 1.6, 3.0);
        this.vrmRenderer.camera.fov = 42;
        break;
    }
    
    // アスペクト比調整
    this.vrmRenderer.camera.aspect = panelAspect;
    
    // カメラターゲット設定
    if (this.vrmRenderer.camera.lookAt) {
      this.vrmRenderer.camera.lookAt(0, 1.2, 0);
    }
    
    console.log(`📷 VRMカメラ調整: ${cameraType}, FOV: ${this.vrmRenderer.camera.fov}`);
  }

  /**
   * VRMモデル読み込み
   * @param {string} vrmPath - VRMファイルパス
   * @param {Object} options - オプション
   */
  async loadVRMModel(vrmPath, options = {}) {
    try {
      console.log(`🤖 VRMモデル読み込み開始: ${vrmPath}`);
      
      // VRMレンダラー初期化
      await this.vrmRenderer.initialize();
      
      // VRMモデル読み込み
      const result = await this.vrmRenderer.loadVRMModel(vrmPath, options);
      
      // VRMポーズコントローラー初期化
      this.vrmPoseController = new VRMPoseController(this.vrmRenderer);
      
      console.log(`✅ VRMモデル読み込み完了: ${result.vrm ? '成功' : '失敗'}`);
      return result;
    } catch (error) {
      console.error('❌ VRMモデル読み込みエラー:', error);
      throw error;
    }
  }

  /**
   * ページ最終効果適用
   * @param {Object} layout - レイアウト情報
   * @param {Object} options - オプション
   */
  applyPageEffects(layout, options) {
    // 全体のトーン調整
    if (options.mangaStyle) {
      // より漫画らしい白黒コントラスト
      const imageData = this.ctx.getImageData(0, 0, this.pageWidth, this.pageHeight);
      // 簡易的なコントラスト強化
      for (let i = 0; i < imageData.data.length; i += 4) {
        const avg = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
        const newValue = avg > 128 ? 255 : 0;
        imageData.data[i] = newValue;
        imageData.data[i + 1] = newValue;
        imageData.data[i + 2] = newValue;
      }
      this.ctx.putImageData(imageData, 0, 0);
    }
  }
}

module.exports = ComicPageRenderer;