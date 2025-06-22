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
    ctx.fillText(`レイアウト: ${scene.layout_template}`, this.pageWidth - 20, 50);

    return headerHeight;
  }

  /**
   * パネルを描画
   */
  async drawPanels(ctx, panels, layoutTemplate) {
    const startY = 90; // ヘッダー後の開始位置
    const availableHeight = this.pageHeight - 170; // ヘッダーとフッターを除いた高さ
    const panelPositions = this.calculatePanelPositions(panels, layoutTemplate, availableHeight);

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const position = panelPositions[i];
      
      await this.drawSinglePanel(ctx, panel, {
        x: position.x,
        y: startY + position.y,
        width: position.width,
        height: position.height
      });
    }
  }

  /**
   * レイアウトテンプレートに基づいてパネル位置を計算
   */
  calculatePanelPositions(panels, layoutTemplate, availableHeight) {
    const positions = [];
    const totalWidth = this.pageWidth - (this.panelMargin * 2);

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

    const panelWidth = (totalWidth - (this.panelMargin * (cols - 1))) / cols;
    const panelHeight = (availableHeight - (this.panelMargin * (rows - 1))) / rows;

    for (let i = 0; i < panelCount; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      positions.push({
        x: this.panelMargin + col * (panelWidth + this.panelMargin),
        y: row * (panelHeight + this.panelMargin),
        width: panelWidth,
        height: panelHeight
      });
    }

    return positions;
  }

  /**
   * 単一パネルを描画
   */
  async drawSinglePanel(ctx, panel, bounds) {
    // パネル枠を描画（漫画風の太い黒枠）
    ctx.strokeStyle = this.panelBorderColor;
    ctx.lineWidth = this.panelBorderWidth;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // パネル内部を白で塗りつぶし
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(bounds.x + this.panelBorderWidth/2, bounds.y + this.panelBorderWidth/2, 
                bounds.width - this.panelBorderWidth, bounds.height - this.panelBorderWidth);

    // パネル内容を描画
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
    ctx.fillText(`${panel.panel_number}`, contentArea.x + contentArea.width - 5, contentArea.y + 15);

    // キャラクターを描画
    if (panel.content.characters && panel.content.characters.length > 0) {
      await this.drawCharacters(ctx, panel.content.characters, contentArea);
    }

    // セリフを描画
    if (panel.content.dialogue && panel.content.dialogue.length > 0) {
      await this.drawDialogue(ctx, panel.content.dialogue, contentArea);
    }


    // 背景説明を描画
    if (panel.content.background) {
      await this.drawBackground(ctx, panel.content.background, contentArea);
    }

    // 視覚的ノートを描画
    if (panel.visual_notes) {
      await this.drawVisualNotes(ctx, panel.visual_notes, contentArea);
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
    ctx.ellipse(bubbleX + bubbleWidth/2, dialogueY + bubbleHeight/2, 
                bubbleWidth/2, bubbleHeight/2, 0, 0, 2 * Math.PI);
    ctx.fill();
    
    // 吹き出しの枠線（黒い楕円）
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(bubbleX + bubbleWidth/2, dialogueY + bubbleHeight/2, 
                bubbleWidth/2, bubbleHeight/2, 0, 0, 2 * Math.PI);
    ctx.stroke();
    
    // 吹き出しのしっぽ
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bubbleX + bubbleWidth/2 - 10, dialogueY + bubbleHeight - 5);
    ctx.lineTo(bubbleX + bubbleWidth/2, dialogueY + bubbleHeight + 15);
    ctx.lineTo(bubbleX + bubbleWidth/2 + 10, dialogueY + bubbleHeight - 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // セリフテキスト
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    
    const wrappedText = this.wrapText(ctx, text, bubbleWidth - 20);
    const lineHeight = 15;
    const startY = dialogueY + bubbleHeight/2 - (wrappedText.length * lineHeight)/2 + lineHeight/2;
    
    wrappedText.forEach((line, index) => {
      ctx.fillText(line, bubbleX + bubbleWidth/2, startY + (index * lineHeight));
    });
  }


  /**
   * 背景を描画
   */
  async drawBackground(ctx, background, contentArea) {
    ctx.fillStyle = '#e8e8e8';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`背景: ${background}`, contentArea.x + contentArea.width, contentArea.y + 25);
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
    ctx.translate(contentArea.x + contentArea.width/2, contentArea.y + 30);
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
        ctx.fillText(`• ${rule.description}`, 20, footerY + 35 + (index * 12));
      });
    }
  }

  /**
   * 感情に基づく色を取得
   */
  getEmotionColor(emotion) {
    const emotionColors = {
      'happy': '#FFD700',
      'sad': '#4169E1',
      'angry': '#FF4500',
      'surprised': '#FF69B4',
      'neutral': '#808080',
      'excited': '#FF6347'
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
    
    for (let i = 0; i < storyboard.scenes.length; i++) {
      const scene = storyboard.scenes[i];
      const pageImage = await this.generatePageImage(scene, i + 1);
      
      images.push({
        pageNumber: i + 1,
        imageBuffer: pageImage,
        sceneInfo: {
          description: scene.description,
          emotion_tone: scene.emotion_tone,
          layout_template: scene.layout_template,
          panels_count: scene.panels.length
        }
      });
    }
    
    return images;
  }
}

module.exports = ImageGenerationService;