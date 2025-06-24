const { createCanvas, loadImage, ImageData } = require('canvas');
const sharp = require('sharp');

/**
 * 3Dレンダリング結果を漫画風白黒表示に変換するフィルターシステム
 */
class MangaStyleRenderer {
  constructor(options = {}) {
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.canvas = createCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext('2d');
    
    // 漫画風レンダリング設定
    this.toneSteps = options.toneSteps || 4; // 白/薄灰/濃灰/黒
    this.edgeThreshold = options.edgeThreshold || 50;
    this.shadowStrength = options.shadowStrength || 1.5;
    
    // トーンマッピング設定
    this.toneLevels = [
      { min: 0, max: 63, value: 0 },      // 黒
      { min: 64, max: 127, value: 85 },   // 濃灰
      { min: 128, max: 191, value: 170 }, // 薄灰
      { min: 192, max: 255, value: 255 }  // 白
    ];
  }

  /**
   * 入力画像を漫画風にレンダリング
   * @param {string|Buffer} input - 画像ファイルパスまたはBuffer
   * @returns {Promise<Buffer>} PNG形式の漫画風画像
   */
  async renderToMangaStyle(input) {
    try {
      // 入力画像の読み込み
      const image = await this.loadInputImage(input);
      
      // Canvas上に描画
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.drawImage(image, 0, 0, this.width, this.height);
      
      // 画像データを取得
      const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
      
      // 漫画風フィルターを適用
      const mangaImageData = await this.applyMangaFilters(imageData);
      
      // 結果をcanvasに描画
      this.ctx.putImageData(mangaImageData, 0, 0);
      
      // PNG形式で出力
      return this.canvas.toBuffer('image/png');
    } catch (error) {
      throw new Error(`漫画風レンダリングエラー: ${error.message}`);
    }
  }

  /**
   * 入力画像を読み込み
   * @param {string|Buffer} input - 画像ファイルパスまたはBuffer
   * @returns {Promise<Image>} 読み込み済み画像
   */
  async loadInputImage(input) {
    if (Buffer.isBuffer(input)) {
      // Bufferから画像を生成
      return await loadImage(input);
    } else if (typeof input === 'string') {
      // ファイルパスから画像を読み込み
      return await loadImage(input);
    } else {
      throw new Error('サポートされていない入力形式');
    }
  }

  /**
   * 漫画風フィルターを適用
   * @param {ImageData} imageData - 元画像データ
   * @returns {Promise<ImageData>} 処理済み画像データ
   */
  async applyMangaFilters(imageData) {
    // 1. グレースケール変換
    const grayData = this.convertToGrayscale(imageData);
    
    // 2. トーン分離処理
    const toneMappedData = this.applyToneMapping(grayData);
    
    // 3. エッジ検出
    const edgeData = this.applyEdgeDetection(grayData);
    
    // 4. セル調シェーディング効果
    const cellShadedData = this.applyCellShading(toneMappedData);
    
    // 5. エッジとセル調シェーディングを合成
    const finalData = this.combineEdgeAndShading(edgeData, cellShadedData);
    
    return finalData;
  }

  /**
   * グレースケール変換
   * @param {ImageData} imageData - 元画像データ
   * @returns {ImageData} グレースケール画像データ
   */
  convertToGrayscale(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < data.length; i += 4) {
      // 人間の目の感度を考慮した輝度計算
      const gray = Math.round(
        data[i] * 0.299 +     // R
        data[i + 1] * 0.587 + // G
        data[i + 2] * 0.114   // B
      );
      
      data[i] = gray;     // R
      data[i + 1] = gray; // G
      data[i + 2] = gray; // B
      // data[i + 3] = alpha (変更なし)
    }
    
    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * トーン分離処理（4段階）
   * @param {ImageData} imageData - グレースケール画像データ
   * @returns {ImageData} トーン分離済み画像データ
   */
  applyToneMapping(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i];
      
      // 適切なトーンレベルを見つける
      const toneLevel = this.toneLevels.find(level => 
        gray >= level.min && gray <= level.max
      );
      
      const mappedValue = toneLevel ? toneLevel.value : gray;
      
      data[i] = mappedValue;     // R
      data[i + 1] = mappedValue; // G
      data[i + 2] = mappedValue; // B
    }
    
    return new ImageData(data, imageData.width, imageData.height);
  }

  /**
   * エッジ検出フィルター（Sobelオペレータ）
   * @param {ImageData} imageData - 入力画像データ
   * @returns {ImageData} エッジ検出結果
   */
  applyEdgeDetection(imageData) {
    const { width, height, data } = imageData;
    const edgeData = new Uint8ClampedArray(data.length);
    
    // Sobelオペレータ
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];
    
    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1]
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        // 3x3カーネルを適用
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelIndex = ((y + ky) * width + (x + kx)) * 4;
            const pixelValue = data[pixelIndex]; // グレースケール値
            
            gx += pixelValue * sobelX[ky + 1][kx + 1];
            gy += pixelValue * sobelY[ky + 1][kx + 1];
          }
        }
        
        // エッジ強度を計算
        const magnitude = Math.sqrt(gx * gx + gy * gy);
        const edgeValue = magnitude > this.edgeThreshold ? 0 : 255;
        
        const index = (y * width + x) * 4;
        edgeData[index] = edgeValue;     // R
        edgeData[index + 1] = edgeValue; // G
        edgeData[index + 2] = edgeValue; // B
        edgeData[index + 3] = 255;       // A
      }
    }
    
    return new ImageData(edgeData, width, height);
  }

  /**
   * セル調シェーディング効果
   * @param {ImageData} imageData - トーン分離済み画像データ
   * @returns {ImageData} セル調シェーディング適用済み画像データ
   */
  applyCellShading(imageData) {
    const data = new Uint8ClampedArray(imageData.data);
    const { width, height } = imageData;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        const gray = data[index];
        
        // 影の強調処理
        let enhancedGray = gray;
        
        // 暗い部分をより暗く
        if (gray < 128) {
          enhancedGray = Math.max(0, gray - (128 - gray) * this.shadowStrength * 0.3);
        }
        
        // 明るい部分はそのまま、または少し明るく
        if (gray > 192) {
          enhancedGray = Math.min(255, gray + 10);
        }
        
        data[index] = enhancedGray;     // R
        data[index + 1] = enhancedGray; // G
        data[index + 2] = enhancedGray; // B
      }
    }
    
    return new ImageData(data, width, height);
  }

  /**
   * エッジとセル調シェーディングを合成
   * @param {ImageData} edgeData - エッジ検出結果
   * @param {ImageData} shadingData - セル調シェーディング結果
   * @returns {ImageData} 合成結果
   */
  combineEdgeAndShading(edgeData, shadingData) {
    const combinedData = new Uint8ClampedArray(shadingData.data);
    
    for (let i = 0; i < combinedData.length; i += 4) {
      // エッジが検出された場所（黒い部分）を優先
      if (edgeData.data[i] === 0) {
        combinedData[i] = 0;     // R
        combinedData[i + 1] = 0; // G
        combinedData[i + 2] = 0; // B
      }
      // それ以外はセル調シェーディング結果を使用
    }
    
    return new ImageData(combinedData, shadingData.width, shadingData.height);
  }

  /**
   * レンダリング設定を更新
   * @param {Object} options - 新しい設定
   */
  updateSettings(options) {
    if (options.toneSteps) this.toneSteps = options.toneSteps;
    if (options.edgeThreshold) this.edgeThreshold = options.edgeThreshold;
    if (options.shadowStrength) this.shadowStrength = options.shadowStrength;
    
    if (options.toneLevels) {
      this.toneLevels = options.toneLevels;
    }
  }

  /**
   * 基本的なテスト用メソッド
   * @returns {Promise<Object>} テスト結果
   */
  async runBasicTests() {
    const testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };

    // テスト1: 基本的な画像処理
    try {
      // 簡単なテスト画像を作成
      const testCanvas = createCanvas(100, 100);
      const testCtx = testCanvas.getContext('2d');
      
      // グラデーション描画
      const gradient = testCtx.createLinearGradient(0, 0, 100, 100);
      gradient.addColorStop(0, '#000000');
      gradient.addColorStop(1, '#ffffff');
      testCtx.fillStyle = gradient;
      testCtx.fillRect(0, 0, 100, 100);
      
      const testBuffer = testCanvas.toBuffer();
      const result = await this.renderToMangaStyle(testBuffer);
      
      testResults.tests.push({
        name: '基本的な画像処理',
        passed: Buffer.isBuffer(result) && result.length > 0,
        details: `出力サイズ: ${result.length} bytes`
      });
      testResults.passed++;
    } catch (error) {
      testResults.tests.push({
        name: '基本的な画像処理',
        passed: false,
        error: error.message
      });
      testResults.failed++;
    }

    // テスト2: 設定変更
    try {
      this.updateSettings({ edgeThreshold: 30, shadowStrength: 2.0 });
      testResults.tests.push({
        name: '設定変更',
        passed: this.edgeThreshold === 30 && this.shadowStrength === 2.0,
        details: `エッジ閾値: ${this.edgeThreshold}, 影強度: ${this.shadowStrength}`
      });
      testResults.passed++;
    } catch (error) {
      testResults.tests.push({
        name: '設定変更',
        passed: false,
        error: error.message
      });
      testResults.failed++;
    }

    return testResults;
  }
}

module.exports = MangaStyleRenderer;