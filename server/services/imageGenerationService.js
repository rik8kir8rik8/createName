const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');

class ImageGenerationService {
  constructor() {
    this.pageWidth = 800;
    this.pageHeight = 1200;
    this.panelMargin = 8;
    this.backgroundColor = '#ffffff';
    this.panelBorderColor = '#000000';
    this.panelBorderWidth = 3;
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

      await this.drawSinglePanel(ctx, panel, {
        x: position.x,
        y: startY + position.y,
        width: position.width,
        height: position.height,
      });
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
   * 単一パネルを描画
   */
  async drawSinglePanel(ctx, panel, bounds) {
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
}

module.exports = ImageGenerationService;
