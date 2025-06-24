const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');
const DifyTo3DMapper = require('./DifyTo3DMapper');
const Procedural3DCharacterService = require('./Procedural3DCharacterService');
const MangaStyleRenderer = require('./MangaStyleRenderer');
// 真のThree.js WebGL 3Dレンダリングシステム（立体感強化版）
const Three3DRenderer = require('./Three3DRenderer_real');
// VRMシステム統合
const ComicPageRenderer = require('./ComicPageRenderer');
// 動的VRMコード生成システム
const DynamicVRMCodeGenerator = require('./DynamicVRMCodeGenerator');
const DynamicVRMExecutor = require('./DynamicVRMExecutor');

class ImageGenerationService {
  constructor(options = {}) {
    this.pageWidth = 800;
    this.pageHeight = 1200;
    this.panelMargin = 8;
    this.backgroundColor = '#ffffff';
    this.panelBorderColor = '#000000';
    this.panelBorderWidth = 3;
    
    // 3Dレンダリング設定（VRM統合）
    this.use3DMode = true; // 3Dモード強制有効
    
    // 3Dシステムのインスタンス初期化
    this.difyTo3DMapper = new DifyTo3DMapper();
    this.procedural3DCharacterService = new Procedural3DCharacterService();
    this.mangaStyleRenderer = new MangaStyleRenderer({
      width: this.pageWidth,
      height: this.pageHeight
    });
    
    // 3D+VRM統合レンダラーの初期化
    this.three3DRenderer = null;
    this.initializeThree3DRenderer();
    
    // 動的VRMシステムの初期化
    this.dynamicVRMGenerator = new DynamicVRMCodeGenerator({
      model: options.openaiModel || 'gpt-4',
      temperature: 0.1
    });
    this.dynamicVRMExecutor = new DynamicVRMExecutor({
      width: this.pageWidth,
      height: this.pageHeight,
      timeout: 30000
    });
    
    console.log(`🎨 ImageGenerationService initialized`);
    console.log(`   - 3D+VRM Mode: ${this.use3DMode}`);
    console.log(`   - Three3DRenderer: ${!!this.three3DRenderer}`);
    console.log(`   - Dynamic VRM: ${!!this.dynamicVRMGenerator}`);
    console.log(`   - VRM Executor: ${!!this.dynamicVRMExecutor}`);
  }

  /**
   * 3Dレンダリングモードは常に有効（設定変更不可）
   * @deprecated 3Dモードは常に有効です
   */
  set3DMode() {
    console.warn('⚠️ set3DMode() is deprecated. 3D mode is always enabled.');
  }

  /**
   * 現在のレンダリングモードを取得
   * @returns {Object} モード情報
   */
  getRenderingMode() {
    return {
      renderingMode: '3D+VRM',
      three3DRenderer: !!this.three3DRenderer,
      available3DServices: {
        difyTo3DMapper: !!this.difyTo3DMapper,
        procedural3DCharacterService: !!this.procedural3DCharacterService
      }
    };
  }

  /**
   * ストーリーボードのページを画像として生成
   */
  async generatePageImage(scene, pageNumber) {
    try {
      const canvas = createCanvas(this.pageWidth, this.pageHeight);
      const ctx = canvas.getContext('2d');

      // 背景を白で塗りつぶし
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(0, 0, this.pageWidth, this.pageHeight);

      // ページヘッダーを描画
      await this.drawPageHeader(ctx, scene, pageNumber);

      // パネルレイアウトに基づいてパネルを配置
      await this.drawPanels(ctx, scene.panels, scene.layout_template);

      // ページフッターを描画（適用されたルールなど）
      await this.drawPageFooter(ctx, scene);

      // Canvasをバッファに変換
      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Error generating page image:', error);
      throw new Error('ページ画像の生成に失敗しました: ' + error.message);
    }
  }

  /**
   * ページヘッダーを描画
   */
  async drawPageHeader(ctx, scene, pageNumber) {
    const headerHeight = 80;

    // ヘッダー背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, this.pageWidth, headerHeight);

    // ページ番号
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`ページ ${pageNumber}`, 20, 30);

    // シーン説明
    ctx.font = '14px Arial';
    ctx.fillText(scene.description, 20, 50);

    // 感情トーン
    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`感情: ${scene.emotion_tone}`, this.pageWidth - 20, 30);

    // レイアウトテンプレート
    ctx.fillText(
      `レイアウト: ${scene.layout_template}`,
      this.pageWidth - 20,
      50
    );

    return headerHeight;
  }

  /**
   * パネルを描画
   */
  async drawPanels(ctx, panels, layoutTemplate) {
    const startY = 90; // ヘッダー後の開始位置
    const availableHeight = this.pageHeight - 170; // ヘッダーとフッターを除いた高さ
    const panelPositions = this.calculatePanelPositions(
      panels,
      layoutTemplate,
      availableHeight
    );

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const position = panelPositions[i];

      const panelBounds = {
        x: position.x,
        y: startY + position.y,
        width: position.width,
        height: position.height,
      };

      console.log(`🖼️ Rendering panel ${i + 1}/${panels.length} (${panel.panel_number})`);

      try {
        // 3D+VRM統合レンツリングのみ
        if (this.three3DRenderer) {
          console.log(`🎬 3D+VRM rendering for panel ${panel.panel_number}`);
          await this.drawSinglePanelWithTrue3D(ctx, panel, panelBounds);
        } else {
          throw new Error('Three3DRenderer not initialized');
        }
        
        console.log(`✅ Panel ${panel.panel_number} rendered successfully`);
      } catch (error) {
        console.error(`❌ Panel ${panel.panel_number} 3D rendering failed:`, error.message);
        throw error; // エラーを上位に伝播してデバッグを容易に
      }
    }
  }

  /**
   * レイアウトテンプレートに基づいてパネル位置を計算
   */
  calculatePanelPositions(panels, layoutTemplate, availableHeight) {
    const positions = [];
    const totalWidth = this.pageWidth - this.panelMargin * 2;

    // シンプルなグリッドレイアウト実装
    const panelCount = panels.length;
    let rows, cols;

    // レイアウトテンプレートに基づく配置
    switch (layoutTemplate) {
      case 'standard_4':
        rows = 2;
        cols = 2;
        break;
      case 'vertical_flow':
        rows = panelCount;
        cols = 1;
        break;
      case 'horizontal_strip':
        rows = 1;
        cols = panelCount;
        break;
      default:
        // 動的に行列を決定
        cols = Math.ceil(Math.sqrt(panelCount));
        rows = Math.ceil(panelCount / cols);
    }

    const panelWidth = (totalWidth - this.panelMargin * (cols - 1)) / cols;
    const panelHeight =
      (availableHeight - this.panelMargin * (rows - 1)) / rows;

    for (let i = 0; i < panelCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      positions.push({
        x: this.panelMargin + col * (panelWidth + this.panelMargin),
        y: row * (panelHeight + this.panelMargin),
        width: panelWidth,
        height: panelHeight,
      });
    }

    return positions;
  }

  /**
   * 3Dシステムを使用して単一パネルを描画
   * @param {CanvasRenderingContext2D} ctx - Canvasコンテキスト
   * @param {Object} panel - パネルデータ
   * @param {Object} bounds - 描画範囲
   */
  async drawSinglePanelWith3D(ctx, panel, bounds) {
    console.log(`🏗️ Starting 3D panel rendering for panel ${panel.panel_number}`);
    
    try {
      // Flow3構図データの取得
      const compositionData = panel.composition_data;
      if (!compositionData) {
        console.warn(`⚠️ No composition data found for panel ${panel.panel_number}, using default`);
        compositionData = this.createDefaultCompositionData(panel);
      }

      // パネル枠を描画
      this.drawPanelFrame(ctx, bounds, compositionData);

      // 3Dキャラクター画像の生成
      const character3DImage = await this.generate3DCharacterImage(compositionData, panel.content);
      
      if (character3DImage) {
        // 3D結果をCanvasに描画
        await this.apply3DToCanvas(character3DImage, ctx, bounds);
      }

      // セリフやその他のオーバーレイ要素を描画
      await this.drawOverlayElements(ctx, panel, bounds);

      console.log(`✅ 3D panel rendering completed for panel ${panel.panel_number}`);
      
    } catch (error) {
      console.error(`❌ 3D panel rendering failed for panel ${panel.panel_number}:`, error);
      throw error;
    }
  }

  // 不要なフォールバック描画メソッドを削除 - 3D描画のみ使用

  /**
   * 基本パネル描画（最後のフォールバック）
   */
  async drawBasicPanel(ctx, panel, bounds) {
    // Flow3構図データの取得
    const compositionData = panel.composition_data;

    // 視覚効果に基づいてパネル背景色を調整
    let panelBg = '#ffffff';
    if (compositionData?.visualEffects === 'emotional') {
      panelBg = '#fff8f0'; // 温かみのある色調
    } else if (compositionData?.visualEffects === 'deformed') {
      panelBg = '#f0f8ff'; // 青みがかった色調
    } else if (compositionData?.visualEffects === 'past') {
      panelBg = '#faf8f0'; // セピア調
    }

    // パネル枠を描画（漫画風の太い黒枠）
    ctx.strokeStyle = this.panelBorderColor;
    ctx.lineWidth = this.panelBorderWidth;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // パネル内部を効果に応じた色で塗りつぶし
    ctx.fillStyle = panelBg;
    ctx.fillRect(
      bounds.x + this.panelBorderWidth / 2,
      bounds.y + this.panelBorderWidth / 2,
      bounds.width - this.panelBorderWidth,
      bounds.height - this.panelBorderWidth
    );

    // パネル内容を描画
    const contentArea = {
      x: bounds.x + 10,
      y: bounds.y + 10,
      width: bounds.width - 20,
      height: bounds.height - 20,
    };

    // パネル番号（右上に小さく表示）
    ctx.fillStyle = '#666666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${panel.panel_number}`,
      contentArea.x + contentArea.width - 5,
      contentArea.y + 15
    );

    // 背景を先に描画（Flow3データを活用）
    if (
      compositionData?.background === 1 &&
      compositionData?.backgroundDetails
    ) {
      await this.drawBackgroundWithComposition(
        ctx,
        compositionData.backgroundDetails,
        contentArea,
        compositionData
      );
    } else if (panel.content.background) {
      await this.drawBackground(ctx, panel.content.background, contentArea);
    }

    // キャラクターを描画（カメラアングルを考慮）
    if (panel.content.characters && panel.content.characters.length > 0) {
      await this.drawCharactersWithComposition(
        ctx,
        panel.content.characters,
        contentArea,
        compositionData
      );
    }

    // セリフを描画
    if (panel.content.dialogue && panel.content.dialogue.length > 0) {
      await this.drawDialogue(ctx, panel.content.dialogue, contentArea);
    }

    // 視覚的ノートを描画
    if (panel.visual_notes) {
      await this.drawVisualNotes(ctx, panel.visual_notes, contentArea);
    }

    // 構図情報を左下に小さく表示（デバッグ用）
    if (compositionData) {
      ctx.fillStyle = '#999999';
      ctx.font = '8px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(
        `角度:${compositionData.cameraAngle} 効果:${compositionData.visualEffects}`,
        contentArea.x + 2,
        contentArea.y + contentArea.height - 5
      );
    }
  }

  /**
   * Flow3構図データを活用してキャラクターを描画
   */
  async drawCharactersWithComposition(
    ctx,
    characters,
    contentArea,
    compositionData
  ) {
    if (!characters || characters.length === 0) return;

    // カメラアングルに基づいてキャラクターサイズとポジションを調整
    let charScale = 1.0;
    let charY = contentArea.y + 60;

    if (compositionData?.cameraAngle === 'near') {
      charScale = 1.5; // クローズアップ
      charY = contentArea.y + 40;
    } else if (compositionData?.cameraAngle === 'far') {
      charScale = 0.7; // 引きの構図
      charY = contentArea.y + 80;
    }

    const charSpacing = contentArea.width / (characters.length + 1);

    characters.forEach((character, index) => {
      const charX = contentArea.x + charSpacing * (index + 1);

      // キャラクターの描画（スケール適用）
      this.drawSingleCharacter(
        ctx,
        character,
        charX,
        charY,
        charScale,
        compositionData
      );
    });
  }

  /**
   * 単一キャラクターを描画（構図データ考慮）
   */
  drawSingleCharacter(ctx, character, x, y, scale, compositionData) {
    const size = {
      head: 15 * scale,
      body: 60 * scale,
      arm: 20 * scale,
      leg: 25 * scale,
    };

    // 視覚効果に基づいて線の太さを調整
    let lineWidth = 3;
    if (compositionData?.visualEffects === 'emotional') {
      lineWidth = 4; // 感情的な場面では太く
    } else if (compositionData?.visualEffects === 'deformed') {
      lineWidth = 2; // 変形効果では細く
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = lineWidth;

    // 頭（円）
    ctx.beginPath();
    ctx.arc(x, y, size.head, 0, 2 * Math.PI);
    ctx.stroke();

    // 体（縦線）
    ctx.beginPath();
    ctx.moveTo(x, y + size.head);
    ctx.lineTo(x, y + size.body);
    ctx.stroke();

    // 腕（横線）
    ctx.beginPath();
    ctx.moveTo(x - size.arm, y + size.body * 0.6);
    ctx.lineTo(x + size.arm, y + size.body * 0.6);
    ctx.stroke();

    // 足（ハの字）
    ctx.beginPath();
    ctx.moveTo(x, y + size.body);
    ctx.lineTo(x - size.leg * 0.6, y + size.body + size.leg);
    ctx.moveTo(x, y + size.body);
    ctx.lineTo(x + size.leg * 0.6, y + size.body + size.leg);
    ctx.stroke();

    // 感情表現（顔の中）
    this.drawCharacterEmotion(ctx, character, x, y, scale);
  }

  /**
   * キャラクターの感情表現を描画
   */
  drawCharacterEmotion(ctx, character, x, y, scale) {
    ctx.fillStyle = this.getEmotionColor(character.emotion);
    ctx.beginPath();

    const eyeSize = 2 * scale;
    const eyeOffset = 5 * scale;
    const mouthRadius = 8 * scale;

    if (character.emotion === 'happy') {
      // 笑顔
      ctx.arc(x - eyeOffset, y - eyeOffset, eyeSize, 0, 2 * Math.PI); // 左目
      ctx.arc(x + eyeOffset, y - eyeOffset, eyeSize, 0, 2 * Math.PI); // 右目
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + eyeOffset, mouthRadius, 0, Math.PI); // 口
      ctx.stroke();
    } else if (character.emotion === 'sad') {
      // 悲しい顔
      ctx.arc(x - eyeOffset, y - eyeOffset, eyeSize, 0, 2 * Math.PI); // 左目
      ctx.arc(x + eyeOffset, y - eyeOffset, eyeSize, 0, 2 * Math.PI); // 右目
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + eyeOffset + 5, mouthRadius, Math.PI, 2 * Math.PI); // 下向きの口
      ctx.stroke();
    } else {
      // デフォルト（中性的な顔）
      ctx.arc(x - eyeOffset, y - eyeOffset, eyeSize, 0, 2 * Math.PI); // 左目
      ctx.arc(x + eyeOffset, y - eyeOffset, eyeSize, 0, 2 * Math.PI); // 右目
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - eyeOffset, y + eyeOffset);
      ctx.lineTo(x + eyeOffset, y + eyeOffset);
      ctx.stroke();
    }
  }

  /**
   * Flow3構図データを活用した背景描画
   */
  async drawBackgroundWithComposition(
    ctx,
    backgroundDetails,
    contentArea,
    compositionData
  ) {
    // 背景の基本色を設定
    let bgColor = '#f0f0f0';
    if (compositionData.visualEffects === 'emotional') {
      bgColor = '#ffe4e1'; // 温かい背景
    } else if (compositionData.visualEffects === 'past') {
      bgColor = '#f5f5dc'; // セピア調背景
    } else if (compositionData.visualEffects === 'deformed') {
      bgColor = '#e6f3ff'; // 冷たい背景
    }

    // 背景を塗りつぶし
    ctx.fillStyle = bgColor;
    ctx.fillRect(
      contentArea.x,
      contentArea.y + contentArea.height * 0.7,
      contentArea.width,
      contentArea.height * 0.3
    );

    // 背景詳細テキストを描画
    ctx.fillStyle = '#666666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    const bgText =
      backgroundDetails.length > 30
        ? backgroundDetails.substring(0, 27) + '...'
        : backgroundDetails;
    ctx.fillText(
      bgText,
      contentArea.x + contentArea.width / 2,
      contentArea.y + contentArea.height - 15
    );

    // カメラアングルに応じた背景要素を追加
    if (compositionData.cameraAngle === 'far') {
      // 遠景の場合は地平線を追加
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(contentArea.x, contentArea.y + contentArea.height * 0.8);
      ctx.lineTo(
        contentArea.x + contentArea.width,
        contentArea.y + contentArea.height * 0.8
      );
      ctx.stroke();
    }
  }

  /**
   * キャラクターを描画（漫画風のシンプルな人型）
   */
  async drawCharacters(ctx, characters, contentArea) {
    if (!characters || characters.length === 0) return;

    const charY = contentArea.y + 60;
    const charSpacing = contentArea.width / (characters.length + 1);

    characters.forEach((character, index) => {
      const charX = contentArea.x + charSpacing * (index + 1);

      // キャラクターの体（棒人間風）
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;

      // 頭（円）
      ctx.beginPath();
      ctx.arc(charX, charY, 15, 0, 2 * Math.PI);
      ctx.stroke();

      // 体（縦線）
      ctx.beginPath();
      ctx.moveTo(charX, charY + 15);
      ctx.lineTo(charX, charY + 60);
      ctx.stroke();

      // 腕（横線）
      ctx.beginPath();
      ctx.moveTo(charX - 20, charY + 35);
      ctx.lineTo(charX + 20, charY + 35);
      ctx.stroke();

      // 足（ハの字）
      ctx.beginPath();
      ctx.moveTo(charX, charY + 60);
      ctx.lineTo(charX - 15, charY + 85);
      ctx.moveTo(charX, charY + 60);
      ctx.lineTo(charX + 15, charY + 85);
      ctx.stroke();

      // 感情表現（顔の中）
      ctx.fillStyle = this.getEmotionColor(character.emotion);
      ctx.beginPath();
      if (character.emotion === 'happy') {
        // 笑顔
        ctx.arc(charX - 5, charY - 5, 2, 0, 2 * Math.PI); // 左目
        ctx.arc(charX + 5, charY - 5, 2, 0, 2 * Math.PI); // 右目
        ctx.fill();
        ctx.beginPath();
        ctx.arc(charX, charY + 5, 8, 0, Math.PI); // 口
        ctx.stroke();
      } else if (character.emotion === 'sad') {
        // 悲しい顔
        ctx.arc(charX - 5, charY - 5, 2, 0, 2 * Math.PI); // 左目
        ctx.arc(charX + 5, charY - 5, 2, 0, 2 * Math.PI); // 右目
        ctx.fill();
        ctx.beginPath();
        ctx.arc(charX, charY + 10, 8, Math.PI, 2 * Math.PI); // 逆さ口
        ctx.stroke();
      } else {
        // 普通の顔
        ctx.arc(charX - 5, charY - 5, 2, 0, 2 * Math.PI); // 左目
        ctx.arc(charX + 5, charY - 5, 2, 0, 2 * Math.PI); // 右目
        ctx.fill();
        ctx.fillRect(charX - 3, charY + 3, 6, 2); // 口
      }

      // キャラクター名（小さく表示）
      ctx.fillStyle = '#000000';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(character.name, charX, charY + 105);
    });
  }

  /**
   * セリフを描画（漫画風の吹き出し）
   */
  async drawDialogue(ctx, dialogue, contentArea) {
    if (!dialogue || dialogue.length === 0) return;

    const text = dialogue.join(' ');
    const dialogueY = contentArea.y + contentArea.height - 80;
    const bubbleWidth = Math.min(contentArea.width - 20, 200);
    const bubbleHeight = 50;
    const bubbleX = contentArea.x + (contentArea.width - bubbleWidth) / 2;

    // 吹き出しの背景（白い楕円）
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(
      bubbleX + bubbleWidth / 2,
      dialogueY + bubbleHeight / 2,
      bubbleWidth / 2,
      bubbleHeight / 2,
      0,
      0,
      2 * Math.PI
    );
    ctx.fill();

    // 吹き出しの枠線（黒い楕円）
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      bubbleX + bubbleWidth / 2,
      dialogueY + bubbleHeight / 2,
      bubbleWidth / 2,
      bubbleHeight / 2,
      0,
      0,
      2 * Math.PI
    );
    ctx.stroke();

    // 吹き出しのしっぽ
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bubbleX + bubbleWidth / 2 - 10, dialogueY + bubbleHeight - 5);
    ctx.lineTo(bubbleX + bubbleWidth / 2, dialogueY + bubbleHeight + 15);
    ctx.lineTo(bubbleX + bubbleWidth / 2 + 10, dialogueY + bubbleHeight - 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // セリフテキスト
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';

    const wrappedText = this.wrapText(ctx, text, bubbleWidth - 20);
    const lineHeight = 15;
    const startY =
      dialogueY +
      bubbleHeight / 2 -
      (wrappedText.length * lineHeight) / 2 +
      lineHeight / 2;

    wrappedText.forEach((line, index) => {
      ctx.fillText(
        line,
        bubbleX + bubbleWidth / 2,
        startY + index * lineHeight
      );
    });
  }

  /**
   * True 3Dレンダラーの初期化
   */
  initializeThree3DRenderer() {
    try {
      this.three3DRenderer = new Three3DRenderer({
        width: 400, // パネル標準サイズ
        height: 300,
        pixelRatio: 1
      });
      console.log('✅ Three3DRenderer initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Three3DRenderer:', error);
      this.three3DRenderer = null;
      // 3D初期化失敗はアプリケーションエラー
      throw new Error('3D rendering system initialization failed: ' + error.message);
    }
  }

  // VRMシステムはThree3DRenderer内で統合されました

  /**
   * 真の3Dレンダリングで単一パネルを描画
   * @param {CanvasRenderingContext2D} ctx - Canvasコンテキスト
   * @param {Object} panel - パネルデータ
   * @param {Object} bounds - 描画範囲
   */
  async drawSinglePanelWithTrue3D(ctx, panel, bounds) {
    console.log(`🎬 True 3D rendering for panel ${panel.panel_number}`);
    
    try {
      // パネル枠を描画
      this.drawPanelFrame(ctx, bounds);

      // Difyデータの準備
      const compositionData = panel.composition_data || this.createDefaultCompositionData(panel);
      
      // DifyTo3DMapperでデータを変換
      const sceneData = this.difyTo3DMapper.mapTo3DParameters(compositionData);
      
      // ⭐ コマ専用のThree3DRendererを作成（独立した3D空間）
      const panelRenderer = await this.createPanelSpecific3DRenderer(bounds);
      
      try {
        // Three3DRendererで実際の3Dシーンをレンダリング
        const render3DImage = await panelRenderer.render3DScene(sceneData);
        
        // 3D画像をCanvasに描画
        await this.apply3DImageToCanvas(render3DImage, ctx, bounds);
        
        // ⭐ コマ描画完了後に3Dプレビューを表示
        await this.show3DPreview(render3DImage, panel, sceneData);
        
        console.log(`🔍 3D Preview created for panel ${panel.panel_number}`);
        
      } finally {
        // コマ専用レンダラーをクリーンアップ
        panelRenderer.dispose();
      }

      // オーバーレイ要素（セリフなど）を描画
      await this.drawOverlayElements(ctx, panel, bounds);

      console.log(`✅ True 3D rendering completed for panel ${panel.panel_number}`);
      
    } catch (error) {
      console.error(`❌ True 3D rendering failed for panel ${panel.panel_number}:`, error);
      throw error;
    }
  }

  /**
   * デフォルトのcomposition_dataを作成
   * @param {Object} panel - パネルデータ
   */
  createDefaultCompositionData(panel) {
    return {
      index: panel.panel_number || 1,
      cameraAngle: "middle",
      composition: panel.content?.description || "キャラクターが室内にいる",
      visualEffects: "normal",
      characterDetails: panel.content?.characters?.[0]?.description || "普通の服装で立っている",
      background: 1,
      backgroundDetails: panel.content?.background || "シンプルな室内"
    };
  }

  /**
   * 3D画像をCanvasに適用
   * @param {Buffer} imageBuffer - 3Dレンダリング結果のPNG Buffer
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} bounds - 描画範囲
   */
  async apply3DImageToCanvas(imageBuffer, ctx, bounds) {
    try {
      const { loadImage } = require('canvas');
      const image = await loadImage(imageBuffer);
      
      // パネル内部エリアに3D画像を描画
      const padding = 10;
      const drawArea = {
        x: bounds.x + padding,
        y: bounds.y + padding,
        width: bounds.width - padding * 2,
        height: bounds.height - padding * 2
      };
      
      ctx.drawImage(
        image,
        drawArea.x,
        drawArea.y,
        drawArea.width,
        drawArea.height
      );
      
      console.log('🖼️ 3D image applied to canvas successfully');
    } catch (error) {
      console.error('❌ Failed to apply 3D image to canvas:', error);
      throw error;
    }
  }

  /**
   * パネル枠を描画
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} bounds - 描画範囲
   */
  drawPanelFrame(ctx, bounds) {
    // パネル枠（漫画風の太い黒枠）
    ctx.strokeStyle = this.panelBorderColor;
    ctx.lineWidth = this.panelBorderWidth;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // パネル内部を白で塗りつぶし（3D画像の背景として）
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      bounds.x + this.panelBorderWidth / 2,
      bounds.y + this.panelBorderWidth / 2,
      bounds.width - this.panelBorderWidth,
      bounds.height - this.panelBorderWidth
    );
  }

  /**
   * オーバーレイ要素を描画（セリフ、パネル番号など）
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} panel - パネルデータ
   * @param {Object} bounds - 描画範囲
   */
  async drawOverlayElements(ctx, panel, bounds) {
    const contentArea = {
      x: bounds.x + 10,
      y: bounds.y + 10,
      width: bounds.width - 20,
      height: bounds.height - 20,
    };

    // パネル番号（右上に小さく表示）
    ctx.fillStyle = '#666666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${panel.panel_number}`,
      contentArea.x + contentArea.width - 5,
      contentArea.y + 15
    );

    // セリフを描画
    if (panel.content.dialogue && panel.content.dialogue.length > 0) {
      await this.drawDialogue(ctx, panel.content.dialogue, contentArea);
    }

    // 視覚的ノートを描画
    if (panel.visual_notes) {
      await this.drawVisualNotes(ctx, panel.visual_notes, contentArea);
    }

    // 3D情報を左下に小さく表示（デバッグ用）
    ctx.fillStyle = '#999999';
    ctx.font = '8px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(
      '3D: True 3D rendering',
      contentArea.x + 2,
      contentArea.y + contentArea.height - 5
    );
  }

  /**
   * 背景を描画
   */
  async drawBackground(ctx, background, contentArea) {
    ctx.fillStyle = '#e8e8e8';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(
      `背景: ${background}`,
      contentArea.x + contentArea.width,
      contentArea.y + 25
    );
  }

  /**
   * 視覚的ノートを描画（擬音語風）
   */
  async drawVisualNotes(ctx, notes, contentArea) {
    if (!notes) return;

    ctx.fillStyle = '#FF6B35';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';

    // 擬音語風のテキストを斜めに配置
    ctx.save();
    ctx.translate(contentArea.x + contentArea.width / 2, contentArea.y + 30);
    ctx.rotate(-0.2); // 軽く斜めに
    ctx.fillText(notes, 0, 0);
    ctx.restore();
  }

  /**
   * ページフッターを描画
   */
  async drawPageFooter(ctx, scene) {
    const footerY = this.pageHeight - 60;
    const footerHeight = 60;

    // フッター背景
    ctx.fillStyle = '#f9f9f9';
    ctx.fillRect(0, footerY, this.pageWidth, footerHeight);

    // 適用されたルール
    if (scene.applied_rules && scene.applied_rules.length > 0) {
      ctx.fillStyle = '#666666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('適用ルール:', 20, footerY + 20);

      scene.applied_rules.slice(0, 2).forEach((rule, index) => {
        ctx.fillText(`• ${rule.description}`, 20, footerY + 35 + index * 12);
      });
    }
  }

  /**
   * 感情に基づく色を取得
   */
  getEmotionColor(emotion) {
    const emotionColors = {
      happy: '#FFD700',
      sad: '#4169E1',
      angry: '#FF4500',
      surprised: '#FF69B4',
      neutral: '#808080',
      excited: '#FF6347',
    };

    return emotionColors[emotion] || emotionColors.neutral;
  }

  /**
   * テキストを指定幅で折り返し
   */
  wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;

      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    lines.push(currentLine);
    return lines;
  }

  /**
   * 全ページの画像を生成
   */
  async generateAllPageImages(storyboard) {
    const images = [];
    
    console.log(`🖼️ Starting image generation for ${storyboard.scenes.length} scenes`);

    for (let i = 0; i < storyboard.scenes.length; i++) {
      const scene = storyboard.scenes[i];
      console.log(`🖼️ Generating page ${i + 1} with ${scene.panels.length} panels`);
      scene.panels.forEach((panel, idx) => {
        console.log(`🖼️ Panel ${idx + 1} has composition_data:`, !!panel.composition_data);
      });
      
      const pageImage = await this.generatePageImage(scene, i + 1);

      images.push({
        pageNumber: i + 1,
        imageBuffer: pageImage,
        sceneInfo: {
          description: scene.description,
          emotion_tone: scene.emotion_tone,
          layout_template: scene.layout_template,
          panels_count: scene.panels.length,
        },
      });
    }

    return images;
  }

  /**
   * 3Dキャラクター画像を生成
   * @param {Object} compositionData - Flow3構図データ
   * @param {Object} panelContent - パネルコンテンツ
   * @returns {Promise<Buffer|null>} 3Dキャラクター画像のBuffer
   */
  async generate3DCharacterImage(compositionData, panelContent) {
    console.log('💼 Starting 3D character image generation...');
    
    try {
      // Flow3データを3Dパラメータに変換
      const threeDParams = this.difyTo3DMapper.mapTo3DParameters(compositionData);
      console.log('🔄 Flow3 data mapped to 3D parameters:', threeDParams.metadata);

      // キャラクターが表示されない場合はnullを返す
      if (!threeDParams.character.visible) {
        console.log('🚫 Character not visible, skipping 3D generation');
        return null;
      }

      // 3Dキャラクターの生成パラメータを準備
      const characterParams = {
        gender: this.inferGenderFromContent(panelContent),
        pose: threeDParams.character.pose,
        emotion: this.mapEmotionToCharacterService(threeDParams.character.expression),
        clothing: {
          shirt: this.mapClothingColor(threeDParams.character.clothing, 'shirt'),
          pants: this.mapClothingColor(threeDParams.character.clothing, 'pants')
        }
      };

      console.log('👤 Generating 3D character with params:', characterParams);

      // 3Dキャラクターを生成
      const character3D = this.procedural3DCharacterService.generateCharacter(characterParams);
      
      console.log('✨ 3D character image generation completed');
      // 3Dデータそのものを返す（画像ではなく）
      return threeDParams;
      
    } catch (error) {
      console.error('❌ 3D character generation failed:', error);
      throw error;
    }
  }

  // === 3D専用描画システム（不要なフォールバック削除済み） ===

  /**
   * 全ページの画像を生成（3D専用）
   */

  /**
   * パネルデータをVRMシーンデータに変換
   * @param {Object} panel - パネルデータ
   * @returns {Object} VRMシーンデータ
   */
  convertPanelToVRMScene(panel) {
    const compositionData = panel.composition_data || this.createDefaultCompositionData(panel);
    
    return {
      character: {
        visible: panel.content.characters && panel.content.characters.length > 0,
        useVRM: true,
        pose: this.mapPoseToVRM(panel.content.characters?.[0]?.pose || 'standing'),
        expression: this.mapExpressionToVRM(panel.content.characters?.[0]?.emotion || 'neutral'),
        camera: {
          type: compositionData.cameraAngle || 'middle'
        },
        smoothTransition: true,
        expressionIntensity: 1.0
      },
      background: {
        environment: panel.content.background || 'room',
        visible: true
      }
    };
  }

  /**
   * ポーズをVRM用にマッピング
   */
  mapPoseToVRM(pose) {
    const poseMapping = {
      'standing': 'neutral',
      'sitting': 'sitting',
      'sitting-up': 'sitting',
      'looking': 'neutral',
      'surprised': 'surprised',
      'thinking': 'thinking'
    };
    return poseMapping[pose] || 'neutral';
  }

  /**
   * 表情をVRM用にマッピング
   */
  mapExpressionToVRM(emotion) {
    const expressionMapping = {
      'happy': 'happy',
      'sad': 'sad',
      'surprised': 'surprised',
      'neutral': 'neutral',
      'sleepy': 'relaxed',
      'angry': 'angry'
    };
    return expressionMapping[emotion] || 'neutral';
  }

  /**
   * VRMコンテキストを作成
   * @param {Object} bounds - 描画範囲
   * @returns {Object} VRM実行コンテキスト
   */
  createVRMContext(bounds) {
    // 既存のVRMシステムを活用
    let vrmContext = {};
    
    if (this.comicPageRenderer) {
      vrmContext = {
        vrm: this.comicPageRenderer.vrmRenderer?.vrmModel || null,
        scene: this.comicPageRenderer.vrmRenderer?.scene || null,
        camera: this.comicPageRenderer.vrmRenderer?.camera || null,
        renderer: this.comicPageRenderer.vrmRenderer?.renderer || null,
        canvas: null // 動的に作成
      };
    }
    
    console.log(`🛠️ VRMコンテキスト作成: VRM=${!!vrmContext.vrm}, Scene=${!!vrmContext.scene}`);
    return vrmContext;
  }

  /**
   * 動的VRM結果をCanvasに適用
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} bounds - 描画範囲
   * @param {string} imageData - VRMレンダリング結果
   */
  async applyDynamicVRMResult(ctx, bounds, imageData) {
    try {
      if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
        const { loadImage } = require('canvas');
        const image = await loadImage(imageData);
        
        const padding = 10;
        const drawArea = {
          x: bounds.x + padding,
          y: bounds.y + padding,
          width: bounds.width - padding * 2,
          height: bounds.height - padding * 2
        };
        
        ctx.drawImage(image, drawArea.x, drawArea.y, drawArea.width, drawArea.height);
        
        // Dynamic VRMラベル
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('Dynamic VRM', drawArea.x + 5, drawArea.y + 15);
        
        console.log('🖼️ Dynamic VRM result applied to canvas');
      } else {
        throw new Error('Invalid image data format');
      }
    } catch (error) {
      console.error('❌ Failed to apply dynamic VRM result:', error);
      throw error;
    }
  }

  /**
   * 高品質VRMプレースホルダーを描画（フォールバック用）
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} bounds - 描画範囲
   * @param {Object} panel - パネルデータ
   */
  async drawEnhancedVRMPlaceholder(ctx, bounds, panel) {
    const character = panel.content.characters?.[0] || {};
    const composition = panel.composition_data || {};
    
    const padding = 10;
    const drawArea = {
      x: bounds.x + padding,
      y: bounds.y + padding,
      width: bounds.width - padding * 2,
      height: bounds.height - padding * 2
    };
    
    // 背景
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(drawArea.x, drawArea.y, drawArea.width, drawArea.height);
    
    // sample.png風の高品質キャラクター描画
    await this.drawSamplePngStyleCharacter(ctx, drawArea, character, composition);
    
    // Enhanced VRMラベル
    ctx.fillStyle = '#ff6b35';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Enhanced VRM', drawArea.x + 5, drawArea.y + 15);
    
    // デバッグ情報
    ctx.fillStyle = '#666';
    ctx.font = '8px Arial';
    ctx.fillText(`Pose: ${character.pose || 'neutral'}`, drawArea.x + 5, drawArea.y + drawArea.height - 25);
    ctx.fillText(`Expr: ${character.emotion || 'neutral'}`, drawArea.x + 5, drawArea.y + drawArea.height - 15);
    ctx.fillText(`Cam: ${composition.cameraAngle || 'middle'}`, drawArea.x + 5, drawArea.y + drawArea.height - 5);
  }

  /**
   * sample.pngスタイルの高品質キャラクター描画
   */
  async drawSamplePngStyleCharacter(ctx, area, character, composition) {
    const centerX = area.x + area.width / 2;
    const centerY = area.y + area.height * 0.8;
    const scale = Math.min(area.width, area.height) / 250;
    
    // 線の太さとスタイル（sample.png風）
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(2, 3 * scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 頭部（立体的で詳細）
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 100 * scale, 35 * scale, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // 胴体（衣服の細部を表現）
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(centerX - 30 * scale, centerY - 65 * scale, 60 * scale, 80 * scale);
    ctx.strokeRect(centerX - 30 * scale, centerY - 65 * scale, 60 * scale, 80 * scale);
    
    // 衣服の細部線
    ctx.beginPath();
    ctx.moveTo(centerX - 20 * scale, centerY - 50 * scale);
    ctx.lineTo(centerX + 20 * scale, centerY - 50 * scale);
    ctx.moveTo(centerX, centerY - 65 * scale);
    ctx.lineTo(centerX, centerY - 45 * scale);
    ctx.stroke();
    
    // ポーズ別の腕・手の描画（sample.pngレベル）
    const pose = character.pose || 'neutral';
    
    if (pose === 'thinking' || composition.characterDetails?.includes('考え')) {
      // 考え込みポーズ：右手を顆に
      this.drawDetailedArm(ctx, centerX + 30 * scale, centerY - 50 * scale, 'rightThinking', scale);
      this.drawDetailedArm(ctx, centerX - 30 * scale, centerY - 40 * scale, 'leftDown', scale);
    } else if (pose === 'surprised' || character.emotion === 'surprised') {
      // 驚きポーズ：両手を上げる
      this.drawDetailedArm(ctx, centerX - 30 * scale, centerY - 50 * scale, 'leftUp', scale);
      this.drawDetailedArm(ctx, centerX + 30 * scale, centerY - 50 * scale, 'rightUp', scale);
    } else {
      // デフォルトポーズ
      this.drawDetailedArm(ctx, centerX - 30 * scale, centerY - 40 * scale, 'leftNeutral', scale);
      this.drawDetailedArm(ctx, centerX + 30 * scale, centerY - 40 * scale, 'rightNeutral', scale);
    }
    
    // 表情描画（sample.pngレベルの細かさ）
    this.drawDetailedFace(ctx, centerX, centerY - 100 * scale, character.emotion || 'neutral', scale);
  }

  /**
   * 詳細な腕の描画
   */
  drawDetailedArm(ctx, startX, startY, armType, scale) {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(2, 3 * scale);
    
    const armConfigs = {
      'rightThinking': {
        shoulder: { x: 0, y: 0 },
        elbow: { x: 20 * scale, y: -30 * scale },
        wrist: { x: 10 * scale, y: -50 * scale },
        hand: { x: -10 * scale, y: -55 * scale }
      },
      'leftUp': {
        shoulder: { x: 0, y: 0 },
        elbow: { x: -25 * scale, y: -40 * scale },
        wrist: { x: -30 * scale, y: -70 * scale },
        hand: { x: -35 * scale, y: -75 * scale }
      },
      'rightUp': {
        shoulder: { x: 0, y: 0 },
        elbow: { x: 25 * scale, y: -40 * scale },
        wrist: { x: 30 * scale, y: -70 * scale },
        hand: { x: 35 * scale, y: -75 * scale }
      },
      'leftDown': {
        shoulder: { x: 0, y: 0 },
        elbow: { x: -20 * scale, y: 15 * scale },
        wrist: { x: -25 * scale, y: 35 * scale },
        hand: { x: -30 * scale, y: 40 * scale }
      },
      'leftNeutral': {
        shoulder: { x: 0, y: 0 },
        elbow: { x: -25 * scale, y: 20 * scale },
        wrist: { x: -30 * scale, y: 40 * scale },
        hand: { x: -35 * scale, y: 45 * scale }
      },
      'rightNeutral': {
        shoulder: { x: 0, y: 0 },
        elbow: { x: 25 * scale, y: 20 * scale },
        wrist: { x: 30 * scale, y: 40 * scale },
        hand: { x: 35 * scale, y: 45 * scale }
      }
    };
    
    const config = armConfigs[armType] || armConfigs['leftNeutral'];
    
    // 上腕
    ctx.beginPath();
    ctx.moveTo(startX + config.shoulder.x, startY + config.shoulder.y);
    ctx.lineTo(startX + config.elbow.x, startY + config.elbow.y);
    ctx.stroke();
    
    // 前腕
    ctx.beginPath();
    ctx.moveTo(startX + config.elbow.x, startY + config.elbow.y);
    ctx.lineTo(startX + config.wrist.x, startY + config.wrist.y);
    ctx.stroke();
    
    // 手
    ctx.beginPath();
    ctx.arc(startX + config.hand.x, startY + config.hand.y, 5 * scale, 0, 2 * Math.PI);
    ctx.stroke();
  }

  /**
   * 詳細な顔の描画
   */
  drawDetailedFace(ctx, centerX, centerY, emotion, scale) {
    ctx.fillStyle = '#000000';
    
    // 目の描画
    const eyeY = centerY - 5 * scale;
    const eyeSize = 3 * scale;
    
    if (emotion === 'surprised') {
      // 驚きの目（大きく丸い）
      ctx.beginPath();
      ctx.arc(centerX - 10 * scale, eyeY, eyeSize * 1.5, 0, 2 * Math.PI);
      ctx.arc(centerX + 10 * scale, eyeY, eyeSize * 1.5, 0, 2 * Math.PI);
      ctx.fill();
    } else if (emotion === 'thinking') {
      // 考え込みの目（少し細め）
      ctx.fillRect(centerX - 12 * scale, eyeY - eyeSize/2, eyeSize * 2, eyeSize);
      ctx.fillRect(centerX + 8 * scale, eyeY - eyeSize/2, eyeSize * 2, eyeSize);
    } else {
      // 通常の目
      ctx.beginPath();
      ctx.arc(centerX - 10 * scale, eyeY, eyeSize, 0, 2 * Math.PI);
      ctx.arc(centerX + 10 * scale, eyeY, eyeSize, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // 口の描画
    const mouthY = centerY + 10 * scale;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2 * scale;
    
    if (emotion === 'happy') {
      // 笑顔
      ctx.beginPath();
      ctx.arc(centerX, mouthY, 8 * scale, 0, Math.PI);
      ctx.stroke();
    } else if (emotion === 'surprised') {
      // 驚きの口（丸い）
      ctx.beginPath();
      ctx.arc(centerX, mouthY, 4 * scale, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (emotion === 'thinking') {
      // 考え込みの口（小さな線）
      ctx.beginPath();
      ctx.moveTo(centerX - 5 * scale, mouthY);
      ctx.lineTo(centerX + 5 * scale, mouthY);
      ctx.stroke();
    } else {
      // ニュートラル
      ctx.beginPath();
      ctx.moveTo(centerX - 6 * scale, mouthY);
      ctx.lineTo(centerX + 6 * scale, mouthY);
      ctx.stroke();
    }
  }

  /**
   * VRMプレースホルダーを描画（旧バージョン）
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} bounds - 描画範囲
   * @param {Object} character - キャラクターデータ
   */
  async drawVRMPlaceholder(ctx, bounds, character) {
    const padding = 10;
    const drawArea = {
      x: bounds.x + padding,
      y: bounds.y + padding,
      width: bounds.width - padding * 2,
      height: bounds.height - padding * 2
    };
    
    // VRM背景
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(drawArea.x, drawArea.y, drawArea.width, drawArea.height);
    
    // VRMキャラクターの高品質プレースホルダー
    const charX = drawArea.x + drawArea.width / 2;
    const charY = drawArea.y + drawArea.height * 0.8;
    
    // VRM風の3Dキャラクター描画
    await this.drawVRMStyleCharacter(ctx, charX, charY, character, drawArea);
    
    // 旧VRMラベル
    ctx.fillStyle = '#007acc';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('VRM (Legacy)', drawArea.x + 5, drawArea.y + 15);
    
    // ポーズ・表情情報
    ctx.fillStyle = '#666';
    ctx.font = '8px Arial';
    ctx.fillText(`Pose: ${character.pose}`, drawArea.x + 5, drawArea.y + drawArea.height - 15);
    ctx.fillText(`Expr: ${character.expression}`, drawArea.x + 5, drawArea.y + drawArea.height - 5);
  }

  /**
   * VRMスタイルのキャラクター描画
   */
  async drawVRMStyleCharacter(ctx, x, y, character, area) {
    const scale = Math.min(area.width, area.height) / 200;
    
    // 頭部（立体的）
    ctx.fillStyle = '#ffdbac';
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.arc(x, y - 80 * scale, 25 * scale, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // 胴体（VRM風）
    ctx.fillStyle = character.pose === 'thinking' ? '#4a90e2' : '#87ceeb';
    ctx.fillRect(x - 20 * scale, y - 55 * scale, 40 * scale, 60 * scale);
    ctx.strokeRect(x - 20 * scale, y - 55 * scale, 40 * scale, 60 * scale);
    
    // ポーズ別の腕の描画
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    
    if (character.pose === 'thinking') {
      // 考え込みポーズ：右手を顆に
      ctx.beginPath();
      ctx.moveTo(x + 20 * scale, y - 40 * scale);
      ctx.lineTo(x + 35 * scale, y - 60 * scale); // 右腕上げ
      ctx.lineTo(x + 30 * scale, y - 80 * scale); // 手を顆へ
      ctx.stroke();
      
      // 左腕（下げ）
      ctx.beginPath();
      ctx.moveTo(x - 20 * scale, y - 40 * scale);
      ctx.lineTo(x - 30 * scale, y - 20 * scale);
      ctx.stroke();
    } else if (character.pose === 'surprised') {
      // 驚きポーズ：両手を上げる
      ctx.beginPath();
      ctx.moveTo(x - 20 * scale, y - 40 * scale);
      ctx.lineTo(x - 35 * scale, y - 70 * scale); // 左腕上げ
      ctx.moveTo(x + 20 * scale, y - 40 * scale);
      ctx.lineTo(x + 35 * scale, y - 70 * scale); // 右腕上げ
      ctx.stroke();
    } else {
      // デフォルトポーズ
      ctx.beginPath();
      ctx.moveTo(x - 20 * scale, y - 40 * scale);
      ctx.lineTo(x - 35 * scale, y - 20 * scale);
      ctx.moveTo(x + 20 * scale, y - 40 * scale);
      ctx.lineTo(x + 35 * scale, y - 20 * scale);
      ctx.stroke();
    }
    
    // 表情描画
    ctx.fillStyle = '#000';
    
    if (character.expression === 'happy') {
      // 笑顔
      ctx.beginPath();
      ctx.arc(x - 8 * scale, y - 85 * scale, 2 * scale, 0, 2 * Math.PI);
      ctx.arc(x + 8 * scale, y - 85 * scale, 2 * scale, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.arc(x, y - 75 * scale, 8 * scale, 0, Math.PI);
      ctx.stroke();
    } else if (character.expression === 'surprised') {
      // 驚き顔
      ctx.beginPath();
      ctx.arc(x - 8 * scale, y - 85 * scale, 3 * scale, 0, 2 * Math.PI);
      ctx.arc(x + 8 * scale, y - 85 * scale, 3 * scale, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(x, y - 75 * scale, 5 * scale, 0, 2 * Math.PI);
      ctx.fill();
    } else {
      // ニュートラル
      ctx.beginPath();
      ctx.arc(x - 8 * scale, y - 85 * scale, 2 * scale, 0, 2 * Math.PI);
      ctx.arc(x + 8 * scale, y - 85 * scale, 2 * scale, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillRect(x - 6 * scale, y - 75 * scale, 12 * scale, 2 * scale);
    }
  }

  /**
   * 3D結果をCanvasに描画
   * @param {Buffer} threeDResult - 3Dレンダリング結果
   * @param {CanvasRenderingContext2D} ctx - Canvasコンテキスト
   * @param {Object} bounds - 描画範囲
   */
  async apply3DToCanvas(threeDResult, ctx, bounds) {
    try {
      console.log('🖼️ Applying 3D result to canvas...');
      
      // パネル内のコンテンツエリアを計算
      const contentArea = {
        x: bounds.x + 10,
        y: bounds.y + 10,
        width: bounds.width - 20,
        height: bounds.height - 20
      };
      
      // 3Dデータから詳細描画
      if (threeDResult && threeDResult.character) {
        await this.drawEnhanced3DCharacter(ctx, threeDResult, contentArea);
      }
      
      // 3D背景・環境の描画
      if (threeDResult && threeDResult.background) {
        await this.drawEnhanced3DBackground(ctx, threeDResult, contentArea);
      }
      
      console.log('✅ 3D result applied to canvas successfully');
    } catch (error) {
      console.error('❌ Failed to apply 3D result to canvas:', error);
      throw error;
    }
  }

  /**
   * 強化された3Dキャラクターを描画
   * @param {CanvasRenderingContext2D} ctx - Canvasコンテキスト
   * @param {Object} threeDResult - 3Dデータ
   * @param {Object} contentArea - コンテンツエリア
   */
  async drawEnhanced3DCharacter(ctx, threeDResult, contentArea) {
    const character = threeDResult.character;
    if (!character.visible) return;

    console.log(`🎭 Drawing enhanced 3D character with pose: ${character.pose}`);

    // キャラクター基本位置
    let charX = contentArea.x + contentArea.width / 2;
    let charY = contentArea.y + contentArea.height * 0.7;
    
    // カメラアングルによるサイズ調整
    let scale = 1.0;
    if (threeDResult.camera?.type === 'close-up') {
      scale = 1.5;
      charY = contentArea.y + contentArea.height * 0.5;
    } else if (threeDResult.camera?.originalAngle === 'far') {
      scale = 0.7;
      charY = contentArea.y + contentArea.height * 0.8;
    }

    // ポーズ別の描画
    switch (character.pose) {
      case 'sitting-up':
        await this.drawSittingUpPose(ctx, charX, charY, scale, character);
        break;
      case 'looking':
        await this.drawLookingPose(ctx, charX, charY, scale, character);
        break;
      case 'opening-curtain':
        await this.drawOpeningCurtainPose(ctx, charX, charY, scale, character);
        break;
      default:
        await this.drawDefaultPose(ctx, charX, charY, scale, character);
    }
  }

  /**
   * 強化された3D背景を描画
   * @param {CanvasRenderingContext2D} ctx - Canvasコンテキスト
   * @param {Object} threeDResult - 3Dデータ
   * @param {Object} contentArea - コンテンツエリア
   */
  async drawEnhanced3DBackground(ctx, threeDResult, contentArea) {
    const background = threeDResult.background;
    if (!background.visible) return;

    console.log(`🏠 Drawing enhanced 3D background: ${background.environment}`);

    // 背景色設定
    ctx.fillStyle = background.ambientColor || '#f0f0f0';
    ctx.fillRect(contentArea.x, contentArea.y + contentArea.height * 0.7, 
                 contentArea.width, contentArea.height * 0.3);

    // 部屋環境の描画
    if (background.environment === 'room' && background.roomLayout) {
      await this.drawRoomEnvironment(ctx, contentArea, background, threeDResult.composition);
    }
  }

  /**
   * ベッドから起き上がるポーズを描画
   */
  async drawSittingUpPose(ctx, x, y, scale, character) {
    const headSize = 20 * scale;
    const bodyHeight = 40 * scale;
    
    // 上半身を前傾させて起き上がりポーズ
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    
    // 頭部（少し下向き）
    ctx.beginPath();
    ctx.arc(x, y - bodyHeight - headSize, headSize, 0, 2 * Math.PI);
    ctx.stroke();
    
    // 上半身（前傾）
    ctx.beginPath();
    ctx.moveTo(x, y - bodyHeight);
    ctx.lineTo(x - 10 * scale, y - 10 * scale); // 前傾した胴体
    ctx.stroke();
    
    // 腕（ベッドに手をついている）
    ctx.beginPath();
    ctx.moveTo(x - 10 * scale, y - 25 * scale);
    ctx.lineTo(x - 30 * scale, y - 5 * scale); // 左腕
    ctx.moveTo(x - 10 * scale, y - 25 * scale);
    ctx.lineTo(x + 10 * scale, y - 5 * scale); // 右腕
    ctx.stroke();
    
    // パジャマの色（キャラクターの衣装色を反映）
    if (character.clothing === 'pajamas') {
      ctx.fillStyle = character.detailedAttributes?.clothingColor?.shirt || '#FFB6C1';
      ctx.fillRect(x - 15 * scale, y - 35 * scale, 30 * scale, 25 * scale);
    }
    
    console.log(`✅ Sitting-up pose drawn for character in ${character.clothing}`);
  }

  /**
   * 空のパネルを描画（最終フォールバック）
   */
  drawEmptyPanel(ctx, bounds, panel) {
    // パネル枠を描画
    ctx.strokeStyle = this.panelBorderColor;
    ctx.lineWidth = this.panelBorderWidth;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // パネル内部を白で塗りつぶし
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      bounds.x + this.panelBorderWidth / 2,
      bounds.y + this.panelBorderWidth / 2,
      bounds.width - this.panelBorderWidth,
      bounds.height - this.panelBorderWidth
    );

    // エラーメッセージを表示
    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(
      'レンダリングエラー',
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    );
    
    // パネル番号
    ctx.fillStyle = '#999999';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${panel.panel_number}`,
      bounds.x + bounds.width - 10,
      bounds.y + 20
    );
  }

  /**
   * 振り向き・見回すポーズを描画
   */
  async drawLookingPose(ctx, x, y, scale, character) {
    const headSize = 20 * scale;
    const bodyHeight = 60 * scale;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    
    // 頭部（横向き）
    ctx.beginPath();
    ctx.arc(x + 5 * scale, y - bodyHeight - headSize, headSize, 0, 2 * Math.PI);
    ctx.stroke();
    
    // 体（少し横向き）
    ctx.beginPath();
    ctx.moveTo(x, y - bodyHeight);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // 腕（片手を上げて見ている）
    ctx.beginPath();
    ctx.moveTo(x, y - bodyHeight * 0.7);
    ctx.lineTo(x + 25 * scale, y - bodyHeight * 0.8); // 右腕を上げる
    ctx.moveTo(x, y - bodyHeight * 0.7);
    ctx.lineTo(x - 15 * scale, y - bodyHeight * 0.5); // 左腕
    ctx.stroke();
    
    console.log(`✅ Looking pose drawn`);
  }

  /**
   * デフォルトポーズを描画
   */
  async drawDefaultPose(ctx, x, y, scale, character) {
    // 従来の描画を改善版で実行
    await this.drawImprovedBasicCharacter(ctx, x, y, scale, character);
  }

  /**
   * 改善された基本キャラクター描画
   */
  async drawImprovedBasicCharacter(ctx, x, y, scale, character) {
    const headSize = 20 * scale;
    const bodyHeight = 60 * scale;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    
    // 頭部
    ctx.beginPath();
    ctx.arc(x, y - bodyHeight - headSize, headSize, 0, 2 * Math.PI);
    ctx.stroke();
    
    // 胴体
    ctx.beginPath();
    ctx.moveTo(x, y - bodyHeight);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // 腕
    ctx.beginPath();
    ctx.moveTo(x, y - bodyHeight * 0.7);
    ctx.lineTo(x - 25 * scale, y - bodyHeight * 0.5);
    ctx.moveTo(x, y - bodyHeight * 0.7);
    ctx.lineTo(x + 25 * scale, y - bodyHeight * 0.5);
    ctx.stroke();
    
    // 脚
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 20 * scale, y + 30 * scale);
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20 * scale, y + 30 * scale);
    ctx.stroke();
    
    // 服装色の反映
    if (character.clothing === 'pajamas') {
      ctx.fillStyle = character.detailedAttributes?.clothingColor?.shirt || '#FFB6C1';
      ctx.fillRect(x - 15 * scale, y - bodyHeight * 0.8, 30 * scale, bodyHeight * 0.6);
    }
  }

  /**
   * 部屋環境を描画
   */
  async drawRoomEnvironment(ctx, contentArea, background, composition) {
    // ベッドを描画
    if (composition?.midgroundObjects?.some(obj => obj.type === 'bed')) {
      this.drawBed(ctx, contentArea);
    }
    
    // 窓とカーテンを描画
    if (background.roomLayout?.lightingSources?.some(light => light.source === 'window')) {
      this.drawWindowAndCurtain(ctx, contentArea);
    }
  }

  /**
   * ベッドを描画
   */
  drawBed(ctx, contentArea) {
    console.log('🛏️ Drawing bed...');
    
    // ベッドの位置（手前）
    const bedX = contentArea.x + 20;
    const bedY = contentArea.y + contentArea.height * 0.8;
    const bedWidth = contentArea.width * 0.6;
    const bedHeight = 30;
    
    // ベッドフレーム
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.strokeRect(bedX, bedY, bedWidth, bedHeight);
    
    // マットレス
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(bedX + 2, bedY + 2, bedWidth - 4, bedHeight - 4);
    
    // 枕
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(bedX + bedWidth * 0.75, bedY - 10, bedWidth * 0.2, 15);
  }

  /**
   * 窓とカーテンを描画
   */
  drawWindowAndCurtain(ctx, contentArea) {
    console.log('🪟 Drawing window and curtain...');
    
    // 窓の位置（奥）
    const windowX = contentArea.x + contentArea.width * 0.7;
    const windowY = contentArea.y + 20;
    const windowWidth = contentArea.width * 0.25;
    const windowHeight = contentArea.height * 0.4;
    
    // 窓枠
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 3;
    ctx.strokeRect(windowX, windowY, windowWidth, windowHeight);
    
    // 窓ガラス（朝の光）
    ctx.fillStyle = '#FFFACD';
    ctx.fillRect(windowX + 2, windowY + 2, windowWidth - 4, windowHeight - 4);
    
    // カーテン
    ctx.fillStyle = '#4169E1';
    ctx.fillRect(windowX - 10, windowY, 8, windowHeight);
    ctx.fillRect(windowX + windowWidth + 2, windowY, 8, windowHeight);
  }

  /**
   * パネル枠を描画（構図データを考慮）
   * @param {CanvasRenderingContext2D} ctx - Canvasコンテキスト
   * @param {Object} bounds - 描画範囲
   * @param {Object} compositionData - 構図データ
   */
  drawPanelFrame(ctx, bounds, compositionData) {
    // 視覚効果に応じたパネル背景色を調整
    let panelBg = '#ffffff';
    if (compositionData?.visualEffects === 'emotional') {
      panelBg = '#fff8f0'; // 温かみのある色調
    } else if (compositionData?.visualEffects === 'deformed') {
      panelBg = '#f0f8ff'; // 青みがかった色調
    } else if (compositionData?.visualEffects === 'past') {
      panelBg = '#faf8f0'; // セピア調
    }

    // パネル枠を描画（漫画風の太い黒枠）
    ctx.strokeStyle = this.panelBorderColor;
    ctx.lineWidth = this.panelBorderWidth;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // パネル内部を効果に応じた色で塗りつぶし
    ctx.fillStyle = panelBg;
    ctx.fillRect(
      bounds.x + this.panelBorderWidth / 2,
      bounds.y + this.panelBorderWidth / 2,
      bounds.width - this.panelBorderWidth,
      bounds.height - this.panelBorderWidth
    );
  }

  /**
   * オーバーレイ要素（セリフ、パネル番号など）を描画
   * @param {CanvasRenderingContext2D} ctx - Canvasコンテキスト
   * @param {Object} panel - パネルデータ
   * @param {Object} bounds - 描画範囲
   */
  async drawOverlayElements(ctx, panel, bounds) {
    const contentArea = {
      x: bounds.x + 10,
      y: bounds.y + 10,
      width: bounds.width - 20,
      height: bounds.height - 20
    };

    // パネル番号（右上に小さく表示）
    ctx.fillStyle = '#666666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(
      `${panel.panel_number}`,
      contentArea.x + contentArea.width - 5,
      contentArea.y + 15
    );

    // セリフを描画
    if (panel.content.dialogue && panel.content.dialogue.length > 0) {
      await this.drawDialogue(ctx, panel.content.dialogue, contentArea);
    }

    // 視覚的ノートを描画
    if (panel.visual_notes) {
      await this.drawVisualNotes(ctx, panel.visual_notes, contentArea);
    }

    // 構図情報を左下に小さく表示（デバッグ用）
    if (panel.composition_data) {
      ctx.fillStyle = '#999999';
      ctx.font = '8px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(
        `3D: ${panel.composition_data.cameraAngle} ${panel.composition_data.visualEffects}`,
        contentArea.x + 2,
        contentArea.y + contentArea.height - 5
      );
    }
  }

  /**
   * コンテンツから性別を推定
   * @param {Object} content - パネルコンテンツ
   * @returns {string} 性別 ('male' | 'female')
   */
  inferGenderFromContent(content) {
    // シンプルな推定ロジック（実際の実装ではより高度な推定を行う）
    if (content.characters && content.characters.length > 0) {
      const character = content.characters[0];
      if (character.name && (character.name.includes('女') || character.name.includes('嬢'))) {
        return 'female';
      }
    }
    return 'male'; // デフォルト
  }

  /**
   * 表情をキャラクターサービス用にマッピング
   * @param {string} expression - 表情
   * @returns {string} キャラクターサービス用表情
   */
  mapEmotionToCharacterService(expression) {
    const emotionMap = {
      'happy': 'happy',
      'sad': 'sad',
      'sleepy': 'neutral',
      'surprised': 'happy',
      'angry': 'sad',
      'neutral': 'neutral'
    };
    return emotionMap[expression] || 'neutral';
  }

  /**
   * 服装色をマッピング
   * @param {string} clothing - 服装タイプ
   * @param {string} type - 服装パーツ ('shirt' | 'pants')
   * @returns {string} 色名
   */
  mapClothingColor(clothing, type) {
    const colorMap = {
      'pajamas': { shirt: 'blue', pants: 'blue' },
      't-shirt': { shirt: 'white', pants: 'black' },
      'casual': { shirt: 'blue', pants: 'black' },
      'uniform': { shirt: 'white', pants: 'black' }
    };
    
    return colorMap[clothing]?.[type] || (type === 'shirt' ? 'blue' : 'black');
  }

  /**
   * 3Dキャラクターのモックレンダリング
   * 実際の実装ではThree.jsを使用してレンダリングを行う
   * @param {Object} character3D - 3Dキャラクターデータ
   * @param {Object} threeDParams - 3Dパラメータ
   * @returns {Promise<Buffer>} レンダリング結果
   */
  async mockRender3DCharacter(character3D, threeDParams) {
    console.log('🎨 Mock rendering 3D character...');
    
    // モックレンダリング：シンプルな図形を描画
    const mockCanvas = createCanvas(400, 300);
    const mockCtx = mockCanvas.getContext('2d');
    
    // 背景
    const bgColor = threeDParams.background.visible ? '#E8E8E8' : '#F5F5F5';
    mockCtx.fillStyle = bgColor;
    mockCtx.fillRect(0, 0, 400, 300);
    
    // キャラクターの簡易描画
    const centerX = 200;
    const centerY = 200;
    const scale = threeDParams.camera.type === 'close-up' ? 1.5 : 
                  threeDParams.camera.type === 'wide-shot' ? 0.7 : 1.0;
    
    // 頭部
    mockCtx.fillStyle = '#FFDBAC';
    mockCtx.beginPath();
    mockCtx.arc(centerX, centerY - 60 * scale, 30 * scale, 0, 2 * Math.PI);
    mockCtx.fill();
    
    // 胴体
    mockCtx.fillStyle = character3D.metadata.clothing.shirt === 'blue' ? '#4444FF' : '#FF4444';
    mockCtx.fillRect(centerX - 25 * scale, centerY - 30 * scale, 50 * scale, 80 * scale);
    
    // 腕
    mockCtx.fillStyle = '#FFDBAC';
    mockCtx.fillRect(centerX - 50 * scale, centerY - 20 * scale, 25 * scale, 60 * scale);
    mockCtx.fillRect(centerX + 25 * scale, centerY - 20 * scale, 25 * scale, 60 * scale);
    
    // 脚
    const pantsColor = character3D.metadata.clothing.pants === 'black' ? '#222222' : '#2222AA';
    mockCtx.fillStyle = pantsColor;
    mockCtx.fillRect(centerX - 30 * scale, centerY + 50 * scale, 25 * scale, 70 * scale);
    mockCtx.fillRect(centerX + 5 * scale, centerY + 50 * scale, 25 * scale, 70 * scale);
    
    // 表情（簡易版）
    mockCtx.fillStyle = '#000000';
    mockCtx.beginPath();
    mockCtx.arc(centerX - 10 * scale, centerY - 70 * scale, 3 * scale, 0, 2 * Math.PI);
    mockCtx.arc(centerX + 10 * scale, centerY - 70 * scale, 3 * scale, 0, 2 * Math.PI);
    mockCtx.fill();
    
    // 口（表情に応じて）
    mockCtx.beginPath();
    if (character3D.metadata.emotion === 'happy') {
      mockCtx.arc(centerX, centerY - 50 * scale, 10 * scale, 0, Math.PI);
    } else if (character3D.metadata.emotion === 'sad') {
      mockCtx.arc(centerX, centerY - 40 * scale, 10 * scale, Math.PI, 2 * Math.PI);
    } else {
      mockCtx.moveTo(centerX - 10 * scale, centerY - 50 * scale);
      mockCtx.lineTo(centerX + 10 * scale, centerY - 50 * scale);
    }
    mockCtx.stroke();
    
    console.log('✅ Mock 3D character rendered');
    return mockCanvas.toBuffer('image/png');
  }
  /**
   * コマ専用の3Dレンダラーを作成
   * @param {Object} bounds - 描画範囲
   * @returns {Object} パネル専用の3Dレンダラー
   */
  async createPanelSpecific3DRenderer(bounds) {
    const Three3DRenderer = require('./Three3DRenderer_real');
    
    // パネルサイズに基づいた3Dレンダラー
    const panelRenderer = new Three3DRenderer({
      width: Math.floor(bounds.width) || 400,
      height: Math.floor(bounds.height) || 300,
      pixelRatio: 1
    });
    
    console.log(`🎬 Created panel-specific 3D renderer: ${bounds.width}x${bounds.height}`);
    
    return panelRenderer;
  }

  /**
   * 3Dプレビューを表示
   * @param {Buffer} render3DImage - 3Dレンダリング画像
   * @param {Object} panel - パネルデータ
   * @param {Object} sceneData - 3Dシーンデータ
   */
  async show3DPreview(render3DImage, panel, sceneData) {
    try {
      console.log(`🔍 Showing 3D preview for panel ${panel.panel_number}`);
      
      // 画像が有効かチェック
      if (!render3DImage || render3DImage.length === 0) {
        console.warn(`⚠️ Empty or invalid 3D image for panel ${panel.panel_number}`);
        // 空白の場合は代替画像を生成
        render3DImage = await this.createFallbackPreview(panel, sceneData);
      }
      
      // プレビュー用のメタデータを作成
      const previewMetadata = {
        panelNumber: panel.panel_number,
        timestamp: new Date().toISOString(),
        rendering: {
          mode: '3D',
          camera: sceneData.camera?.type || 'middle',
          lighting: sceneData.background?.lighting || 'normal',
          characterVisible: sceneData.character?.visible || false,
          characterPose: sceneData.character?.pose || 'neutral'
        },
        imageSize: {
          width: render3DImage ? 400 : 0,
          height: render3DImage ? 300 : 0,
          format: 'PNG'
        }
      };
      
      // プレビューファイルを保存
      const previewPath = await this.savePreviewFile(render3DImage, panel.panel_number);
      
      // プレビュー情報をログ出力（フロントエンドでの表示用）
      console.log(`📸 3D Preview saved: ${previewPath}`);
      console.log(`📊 Preview metadata:`, JSON.stringify(previewMetadata, null, 2));
      
      // フロントエンドへの通知を送信（WebSocketやSSEを使用する場合）
      await this.notifyFrontendPreview(panel.panel_number, previewPath, previewMetadata);
      
      // プレビューデータを返す（API経由でフロントエンドに送信可能）
      return {
        success: true,
        previewPath,
        metadata: previewMetadata,
        imageBuffer: render3DImage
      };
      
    } catch (error) {
      console.error(`❌ Failed to show 3D preview for panel ${panel.panel_number}:`, error);
      return {
        success: false,
        error: error.message,
        panelNumber: panel.panel_number
      };
    }
  }

  /**
   * 代替プレビュー画像を生成（空白画像対策）
   * @param {Object} panel - パネルデータ
   * @param {Object} sceneData - 3Dシーンデータ
   * @returns {Buffer} 代替画像バッファ
   */
  async createFallbackPreview(panel, sceneData) {
    console.log(`🔄 Creating fallback preview for panel ${panel.panel_number}`);
    
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(400, 300);
    const ctx = canvas.getContext('2d');
    
    // 背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, 400, 300);
    
    // パネル情報を描画
    ctx.fillStyle = '#333';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Panel ${panel.panel_number}`, 200, 80);
    
    ctx.font = '16px Arial';
    ctx.fillText('3D Preview', 200, 120);
    
    // シーン情報
    ctx.font = '12px Arial';
    ctx.fillText(`Camera: ${sceneData.camera?.type || 'middle'}`, 200, 160);
    ctx.fillText(`Character: ${sceneData.character?.visible ? 'visible' : 'hidden'}`, 200, 180);
    ctx.fillText(`Pose: ${sceneData.character?.pose || 'neutral'}`, 200, 200);
    
    // フレーム
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 380, 280);
    
    return canvas.toBuffer('image/png');
  }

  /**
   * フロントエンドにプレビュー通知を送信
   * @param {number} panelNumber - パネル番号
   * @param {string} previewPath - プレビューパス
   * @param {Object} metadata - メタデータ
   */
  async notifyFrontendPreview(panelNumber, previewPath, metadata) {
    // 将来的にWebSocketやServer-Sent Eventsで実装
    console.log(`📡 Notifying frontend about panel ${panelNumber} preview: ${previewPath}`);
    
    // 現在はログ出力のみ（後でWebSocket実装可能）
    const notification = {
      type: '3d_preview_ready',
      panelNumber,
      previewPath,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    console.log(`🔔 Preview notification:`, JSON.stringify(notification, null, 2));
  }

  /**
   * プレビューファイルを保存
   * @param {Buffer} imageBuffer - 画像バッファ
   * @param {number} panelNumber - パネル番号
   * @returns {string} 保存されたファイルパス
   */
  async savePreviewFile(imageBuffer, panelNumber) {
    const fs = require('fs').promises;
    const path = require('path');
    
    // プレビュー保存ディレクトリを作成
    const previewDir = path.join(process.cwd(), 'server', 'output', 'previews');
    try {
      await fs.mkdir(previewDir, { recursive: true });
    } catch (error) {
      // ディレクトリが既に存在する場合は無視
    }
    
    // ファイル名を生成（タイムスタンプ付き）
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `panel_${panelNumber}_3d_preview_${timestamp}.png`;
    const filePath = path.join(previewDir, filename);
    
    // ファイルを保存
    await fs.writeFile(filePath, imageBuffer);
    
    console.log(`💾 Preview saved to: ${filePath}`);
    return filePath;
  }

  /**
   * リソースのクリーンアップ
   */
  dispose() {
    if (this.three3DRenderer) {
      this.three3DRenderer.dispose();
    }
    
    console.log('🧹 ImageGenerationService disposed');
  }
}

module.exports = ImageGenerationService;
