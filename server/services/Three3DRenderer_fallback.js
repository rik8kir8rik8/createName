/**
 * Three.js 3Dレンダリングシステム（フォールバック版）
 * headless-glが利用できない環境向けの代替実装
 * Canvas APIを使って3Dライクな表現を行う
 */

const { createCanvas, loadImage } = require('canvas');

class Three3DRenderer {
  constructor(options = {}) {
    this.width = options.width || 400;
    this.height = options.height || 300;
    this.pixelRatio = options.pixelRatio || 1;
    
    console.log('🎨 Three3DRenderer (Fallback Mode) initialized');
    console.log('⚠️ Using Canvas-based 3D simulation instead of true WebGL');
  }

  /**
   * Difyデータから3Dシーンを構築しレンダリング（フォールバック版）
   * @param {Object} sceneData - DifyTo3DMapperからの出力データ
   * @returns {Buffer} PNG画像バッファ
   */
  async render3DScene(sceneData) {
    try {
      console.log('🎬 Starting 3D scene rendering (fallback mode)...');
      
      // Canvasを作成
      const canvas = createCanvas(this.width, this.height);
      const ctx = canvas.getContext('2d');
      
      // 背景を白で塗りつぶし
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.width, this.height);
      
      // 3D風の表現でシーンをレンダリング
      await this.render3DLikeScene(ctx, sceneData);
      
      // Canvasをバッファに変換
      const imageBuffer = canvas.toBuffer('image/png');
      
      console.log('✅ 3D scene rendered successfully (fallback mode)');
      return imageBuffer;
      
    } catch (error) {
      console.error('❌ 3D rendering failed (fallback mode):', error);
      throw new Error(`3D rendering error: ${error.message}`);
    }
  }

  /**
   * 3D風のシーンをCanvasでレンダリング
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} sceneData - シーンデータ
   */
  async render3DLikeScene(ctx, sceneData) {
    const { camera, character, background } = sceneData;
    
    // カメラ距離に基づくスケール計算
    const cameraDistance = camera.position.z;
    const scale = Math.max(0.3, Math.min(1.5, 10 / cameraDistance));
    
    console.log(`📹 Camera distance: ${cameraDistance}, Scale: ${scale.toFixed(2)}`);
    
    // 背景環境のレンダリング
    await this.renderEnvironment(ctx, background, scale);
    
    // キャラクターのレンダリング
    if (character.visible) {
      await this.renderCharacter(ctx, character, scale, camera);
    }
    
    // ライティング効果
    await this.applyLightingEffects(ctx, background.lighting);
  }

  /**
   * 環境のレンダリング
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} background - 背景データ
   * @param {number} scale - スケール
   */
  async renderEnvironment(ctx, background, scale) {
    const { environment, props } = background;
    
    if (environment === 'bedroom') {
      await this.renderBedroom(ctx, scale);
    }
    
    // 小道具の配置
    for (const prop of props) {
      await this.renderProp(ctx, prop, scale);
    }
  }

  /**
   * 寝室環境のレンダリング
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} scale - スケール
   */
  async renderBedroom(ctx, scale) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // パースペクティブを考慮した床
    ctx.fillStyle = '#d2b48c';
    ctx.beginPath();
    const floorY = centerY + 80 * scale;
    const floorWidth = 300 * scale;
    const floorDepth = 150 * scale;
    
    // 床を台形で描画（パースペクティブ効果）
    ctx.moveTo(centerX - floorWidth / 2, floorY);
    ctx.lineTo(centerX + floorWidth / 2, floorY);
    ctx.lineTo(centerX + floorWidth / 3, floorY + floorDepth);
    ctx.lineTo(centerX - floorWidth / 3, floorY + floorDepth);
    ctx.closePath();
    ctx.fill();
    
    // 後ろの壁
    ctx.fillStyle = '#f5f5dc';
    ctx.fillRect(
      centerX - 150 * scale,
      centerY - 100 * scale,
      300 * scale,
      100 * scale
    );
    
    console.log('🏠 Bedroom environment rendered');
  }

  /**
   * 小道具のレンダリング
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {string} prop - 小道具タイプ
   * @param {number} scale - スケール
   */
  async renderProp(ctx, prop, scale) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    switch (prop) {
      case 'bed':
        await this.renderBed(ctx, centerX - 60 * scale, centerY + 20 * scale, scale);
        break;
      case 'window':
        await this.renderWindow(ctx, centerX - 120 * scale, centerY - 50 * scale, scale);
        break;
      case 'curtain':
        await this.renderCurtain(ctx, centerX - 130 * scale, centerY - 50 * scale, scale);
        break;
    }
  }

  /**
   * ベッドのレンダリング
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X座標
   * @param {number} y - Y座標
   * @param {number} scale - スケール
   */
  async renderBed(ctx, x, y, scale) {
    // ベッドフレーム
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x, y, 100 * scale, 60 * scale);
    
    // マットレス
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 5 * scale, y - 5 * scale, 90 * scale, 60 * scale);
    
    // 枕
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(x + 10 * scale, y - 3 * scale, 25 * scale, 15 * scale);
    
    console.log('🛏️ Bed rendered');
  }

  /**
   * 窓のレンダリング
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X座標
   * @param {number} y - Y座標
   * @param {number} scale - スケール
   */
  async renderWindow(ctx, x, y, scale) {
    // 窓枠
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3 * scale;
    ctx.strokeRect(x, y, 60 * scale, 80 * scale);
    
    // ガラス部分（空色）
    ctx.fillStyle = '#87ceeb';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(x + 3 * scale, y + 3 * scale, 54 * scale, 74 * scale);
    ctx.globalAlpha = 1.0;
    
    // 十字の仕切り
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + 30 * scale, y);
    ctx.lineTo(x + 30 * scale, y + 80 * scale);
    ctx.moveTo(x, y + 40 * scale);
    ctx.lineTo(x + 60 * scale, y + 40 * scale);
    ctx.stroke();
    
    console.log('🪟 Window rendered');
  }

  /**
   * カーテンのレンダリング
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X座標
   * @param {number} y - Y座標
   * @param {number} scale - スケール
   */
  async renderCurtain(ctx, x, y, scale) {
    // 左カーテン
    ctx.fillStyle = '#4169e1';
    ctx.fillRect(x - 15 * scale, y, 25 * scale, 80 * scale);
    
    // 右カーテン
    ctx.fillStyle = '#4169e1';
    ctx.fillRect(x + 50 * scale, y, 25 * scale, 80 * scale);
    
    // カーテンの襞表現
    ctx.strokeStyle = '#1e3a8a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 10 * scale + i * 5 * scale, y);
      ctx.lineTo(x - 10 * scale + i * 5 * scale, y + 80 * scale);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(x + 55 * scale + i * 4 * scale, y);
      ctx.lineTo(x + 55 * scale + i * 4 * scale, y + 80 * scale);
      ctx.stroke();
    }
    
    console.log('🪟 Curtains rendered');
  }

  /**
   * キャラクターのレンダリング
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} character - キャラクターデータ
   * @param {number} scale - スケール
   * @param {Object} camera - カメラデータ
   */
  async renderCharacter(ctx, character, scale, camera) {
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // ポーズに基づく位置調整
    let charX = centerX;
    let charY = centerY + 10 * scale;
    
    switch (character.pose) {
      case 'sitting-up':
        charX = centerX - 40 * scale; // ベッド上
        charY = centerY + 20 * scale;
        break;
      case 'looking':
        charX = centerX - 20 * scale;
        charY = centerY + 10 * scale;
        break;
      case 'opening-curtain':
        charX = centerX - 100 * scale; // 窓際
        charY = centerY + 10 * scale;
        break;
    }
    
    await this.renderCharacterBody(ctx, charX, charY, scale, character);
    
    console.log(`👤 Character rendered with pose: ${character.pose}`);
  }

  /**
   * キャラクターの体の描画
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X座標
   * @param {number} y - Y座標
   * @param {number} scale - スケール
   * @param {Object} character - キャラクターデータ
   */
  async renderCharacterBody(ctx, x, y, scale, character) {
    const headSize = 20 * scale;
    const bodyHeight = 40 * scale;
    
    // 頭部
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(x, y - bodyHeight - headSize, headSize, 0, 2 * Math.PI);
    ctx.fill();
    
    // 胴体
    const clothingColor = this.getClothingColor(character.clothing);
    ctx.fillStyle = clothingColor;
    ctx.fillRect(
      x - 15 * scale,
      y - bodyHeight,
      30 * scale,
      bodyHeight
    );
    
    // ポーズに応じた腕の描画
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3 * scale;
    
    switch (character.pose) {
      case 'sitting-up':
        this.drawSittingArms(ctx, x, y, scale);
        break;
      case 'opening-curtain':
        this.drawReachingArms(ctx, x, y, scale);
        break;
      default:
        this.drawNormalArms(ctx, x, y, scale);
        break;
    }
    
    // 表情の描画
    this.drawFace(ctx, x, y - bodyHeight - headSize, scale, character.expression);
  }

  /**
   * 服装に基づく色の取得
   * @param {string} clothing - 服装タイプ
   */
  getClothingColor(clothing) {
    const colors = {
      'pajamas': '#ffb6c1',
      't-shirt': '#87ceeb',
      'shirt': '#ffffff',
      'suit': '#2f4f4f',
      'casual': '#32cd32'
    };
    
    return colors[clothing] || '#87ceeb';
  }

  /**
   * 座り込みの腕を描画
   */
  drawSittingArms(ctx, x, y, scale) {
    // 支える腕
    ctx.beginPath();
    ctx.moveTo(x - 10 * scale, y - 25 * scale);
    ctx.lineTo(x - 25 * scale, y - 5 * scale);
    ctx.moveTo(x + 10 * scale, y - 25 * scale);
    ctx.lineTo(x + 25 * scale, y - 5 * scale);
    ctx.stroke();
  }

  /**
   * 手を伸ばす腕を描画
   */
  drawReachingArms(ctx, x, y, scale) {
    // 伸ばした腕
    ctx.beginPath();
    ctx.moveTo(x - 10 * scale, y - 30 * scale);
    ctx.lineTo(x - 40 * scale, y - 45 * scale);
    ctx.moveTo(x + 10 * scale, y - 30 * scale);
    ctx.lineTo(x + 15 * scale, y - 35 * scale);
    ctx.stroke();
  }

  /**
   * 通常の腕を描画
   */
  drawNormalArms(ctx, x, y, scale) {
    ctx.beginPath();
    ctx.moveTo(x - 10 * scale, y - 30 * scale);
    ctx.lineTo(x - 20 * scale, y - 10 * scale);
    ctx.moveTo(x + 10 * scale, y - 30 * scale);
    ctx.lineTo(x + 20 * scale, y - 10 * scale);
    ctx.stroke();
  }

  /**
   * 表情を描画
   */
  drawFace(ctx, x, y, scale, expression) {
    // 目
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x - 6 * scale, y - 3 * scale, 2 * scale, 0, 2 * Math.PI);
    ctx.arc(x + 6 * scale, y - 3 * scale, 2 * scale, 0, 2 * Math.PI);
    ctx.fill();
    
    // 口
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    
    switch (expression) {
      case 'sleepy':
        // 半開きの目と小さな口
        ctx.moveTo(x - 3 * scale, y + 5 * scale);
        ctx.lineTo(x + 3 * scale, y + 5 * scale);
        break;
      case 'happy':
        // 笑顔
        ctx.arc(x, y + 3 * scale, 5 * scale, 0, Math.PI);
        break;
      default:
        // 通常
        ctx.moveTo(x - 2 * scale, y + 5 * scale);
        ctx.lineTo(x + 2 * scale, y + 5 * scale);
        break;
    }
    ctx.stroke();
  }

  /**
   * ライティング効果を適用
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Object} lighting - ライティングデータ
   */
  async applyLightingEffects(ctx, lighting) {
    if (lighting.sunlight && lighting.sunlight.intensity > 0) {
      // 朝の光の効果
      const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(255, 248, 220, 0.2)');
      
      ctx.fillStyle = gradient;
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    
    console.log('💡 Lighting effects applied');
  }

  /**
   * リソースのクリーンアップ
   */
  dispose() {
    console.log('🧹 Three3DRenderer (Fallback) disposed');
  }

  /**
   * カメラ設定の取得（編集用）
   */
  getCameraSettings() {
    return {
      position: { x: 0, y: 0, z: 10 },
      rotation: { x: 0, y: 0, z: 0 },
      fov: 75
    };
  }

  /**
   * カメラ設定の更新（編集用）
   */
  updateCameraSettings(settings) {
    console.log('📹 Camera settings updated (fallback mode):', settings);
  }
}

module.exports = Three3DRenderer;