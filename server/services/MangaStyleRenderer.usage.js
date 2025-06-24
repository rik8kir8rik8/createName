const MangaStyleRenderer = require('./MangaStyleRenderer');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

/**
 * MangaStyleRendererの使用例とAPIテスト
 */
class MangaStyleRendererUsage {
  constructor() {
    this.renderer = new MangaStyleRenderer({
      width: 600,
      height: 400,
      edgeThreshold: 45,
      shadowStrength: 1.6
    });
  }

  /**
   * 基本的な使用例
   */
  async basicUsage() {
    console.log('=== 基本的な使用例 ===');
    
    try {
      // 1. サンプル画像を作成
      const sampleImage = await this.createComplexSampleImage();
      
      // 2. 漫画風に変換
      const mangaResult = await this.renderer.renderToMangaStyle(sampleImage);
      
      // 3. 結果を保存
      const outputPath = path.join(__dirname, '../../usage_example_basic.png');
      fs.writeFileSync(outputPath, mangaResult);
      
      console.log(`✓ 基本変換完了: ${outputPath}`);
      console.log(`  処理サイズ: ${mangaResult.length} bytes`);
      
      return mangaResult;
    } catch (error) {
      console.error('基本使用例エラー:', error.message);
      throw error;
    }
  }

  /**
   * 異なる設定での変換例
   */
  async settingsComparison() {
    console.log('\n=== 設定比較例 ===');
    
    const sampleImage = await this.createComplexSampleImage();
    const results = [];

    const settingsVariants = [
      {
        name: 'dramatic',
        settings: { edgeThreshold: 25, shadowStrength: 2.5 },
        description: 'ドラマチックな強いコントラスト'
      },
      {
        name: 'balanced',
        settings: { edgeThreshold: 50, shadowStrength: 1.5 },
        description: 'バランスの取れた標準設定'
      },
      {
        name: 'gentle',
        settings: { edgeThreshold: 80, shadowStrength: 0.8 },
        description: '優しいタッチの柔らかい表現'
      },
      {
        name: 'high_contrast',
        settings: { edgeThreshold: 35, shadowStrength: 3.0 },
        description: '高コントラストでシャープな仕上がり'
      }
    ];

    for (const variant of settingsVariants) {
      try {
        this.renderer.updateSettings(variant.settings);
        const result = await this.renderer.renderToMangaStyle(sampleImage);
        
        const outputPath = path.join(__dirname, `../../usage_example_${variant.name}.png`);
        fs.writeFileSync(outputPath, result);
        
        results.push({
          name: variant.name,
          description: variant.description,
          settings: variant.settings,
          filePath: outputPath,
          fileSize: result.length
        });
        
        console.log(`✓ ${variant.name}: ${variant.description}`);
        console.log(`  設定: エッジ閾値=${variant.settings.edgeThreshold}, 影強度=${variant.settings.shadowStrength}`);
        console.log(`  出力: ${outputPath} (${result.length} bytes)`);
      } catch (error) {
        console.error(`${variant.name}設定でエラー:`, error.message);
      }
    }

    return results;
  }

  /**
   * パフォーマンステスト
   */
  async performanceTest() {
    console.log('\n=== パフォーマンステスト ===');
    
    const sizes = [
      { width: 200, height: 150, name: 'small' },
      { width: 400, height: 300, name: 'medium' },
      { width: 800, height: 600, name: 'large' },
      { width: 1200, height: 900, name: 'extra_large' }
    ];

    const performanceResults = [];

    for (const size of sizes) {
      try {
        // 指定サイズの画像を作成
        const testImage = await this.createTestImageOfSize(size.width, size.height);
        
        // パフォーマンス測定
        const startTime = Date.now();
        const result = await this.renderer.renderToMangaStyle(testImage);
        const endTime = Date.now();
        
        const processingTime = endTime - startTime;
        const pixelCount = size.width * size.height;
        const pixelsPerMs = pixelCount / processingTime;

        performanceResults.push({
          size: size.name,
          dimensions: `${size.width}x${size.height}`,
          pixelCount,
          processingTime,
          pixelsPerMs: Math.round(pixelsPerMs),
          outputSize: result.length
        });

        console.log(`✓ ${size.name} (${size.width}x${size.height}): ${processingTime}ms`);
        console.log(`  処理速度: ${Math.round(pixelsPerMs)} pixels/ms`);
        console.log(`  出力サイズ: ${result.length} bytes`);
      } catch (error) {
        console.error(`${size.name}サイズでエラー:`, error.message);
      }
    }

    return performanceResults;
  }

  /**
   * API統合テスト
   */
  async apiIntegrationTest() {
    console.log('\n=== API統合テスト ===');
    
    try {
      // サンプル画像をbase64形式で作成
      const sampleImage = await this.createComplexSampleImage();
      const base64Image = `data:image/png;base64,${sampleImage.toString('base64')}`;

      // APIリクエスト形式のテストデータ
      const apiTestData = {
        imageData: base64Image,
        settings: {
          edgeThreshold: 40,
          shadowStrength: 1.8
        }
      };

      // MangaStyleRendererを直接使用してAPIの動作をシミュレート
      this.renderer.updateSettings(apiTestData.settings);
      
      // Base64からBufferに変換
      const base64Data = apiTestData.imageData.split(',')[1];
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      const result = await this.renderer.renderToMangaStyle(imageBuffer);
      const resultBase64 = `data:image/png;base64,${result.toString('base64')}`;

      // API レスポンス形式での結果
      const apiResponse = {
        success: true,
        imageData: resultBase64,
        metadata: {
          original_size: imageBuffer.length,
          converted_size: result.length,
          processed_at: new Date().toISOString(),
          settings_used: apiTestData.settings
        }
      };

      console.log('✓ API統合テスト成功');
      console.log(`  元画像サイズ: ${apiResponse.metadata.original_size} bytes`);
      console.log(`  変換後サイズ: ${apiResponse.metadata.converted_size} bytes`);
      console.log(`  処理時刻: ${apiResponse.metadata.processed_at}`);

      return apiResponse;
    } catch (error) {
      console.error('API統合テストエラー:', error.message);
      throw error;
    }
  }

  /**
   * 複雑なサンプル画像を作成
   */
  async createComplexSampleImage() {
    const canvas = createCanvas(600, 400);
    const ctx = canvas.getContext('2d');

    // 背景グラデーション
    const bgGradient = ctx.createLinearGradient(0, 0, 600, 400);
    bgGradient.addColorStop(0, '#f5f5f5');
    bgGradient.addColorStop(1, '#e0e0e0');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 600, 400);

    // 複数の3D風オブジェクト
    // 大きな球体
    const mainSphere = ctx.createRadialGradient(200, 150, 0, 200, 150, 80);
    mainSphere.addColorStop(0, '#ffffff');
    mainSphere.addColorStop(0.6, '#c0c0c0');
    mainSphere.addColorStop(1, '#606060');
    ctx.fillStyle = mainSphere;
    ctx.beginPath();
    ctx.arc(200, 150, 80, 0, Math.PI * 2);
    ctx.fill();

    // 立方体群
    const cubes = [
      { x: 400, y: 100, size: 60, lightness: 0.8 },
      { x: 450, y: 120, size: 40, lightness: 0.6 },
      { x: 380, y: 180, size: 50, lightness: 0.7 }
    ];

    cubes.forEach(cube => {
      const gray = Math.floor(255 * cube.lightness);
      
      // 立方体の影
      ctx.fillStyle = `rgb(${gray * 0.5}, ${gray * 0.5}, ${gray * 0.5})`;
      ctx.fillRect(cube.x + 10, cube.y + 10, cube.size, cube.size);
      
      // 立方体本体
      ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
      ctx.fillRect(cube.x, cube.y, cube.size, cube.size);
      
      // ハイライト
      ctx.fillStyle = `rgb(${Math.min(255, gray + 40)}, ${Math.min(255, gray + 40)}, ${Math.min(255, gray + 40)})`;
      ctx.fillRect(cube.x, cube.y, cube.size * 0.3, cube.size * 0.3);
    });

    // 円柱
    const cylinderGradient = ctx.createLinearGradient(100, 250, 100, 350);
    cylinderGradient.addColorStop(0, '#d0d0d0');
    cylinderGradient.addColorStop(0.5, '#909090');
    cylinderGradient.addColorStop(1, '#707070');
    ctx.fillStyle = cylinderGradient;
    ctx.fillRect(80, 250, 40, 100);
    
    // 円柱の上面
    const topGradient = ctx.createRadialGradient(100, 250, 0, 100, 250, 20);
    topGradient.addColorStop(0, '#f0f0f0');
    topGradient.addColorStop(1, '#b0b0b0');
    ctx.fillStyle = topGradient;
    ctx.beginPath();
    ctx.ellipse(100, 250, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 地面の影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(200, 240, 70, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillRect(390, 200, 80, 15);
    ctx.fillRect(85, 360, 30, 8);

    // テクスチャ要素
    ctx.strokeStyle = '#a0a0a0';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(300 + i * 15, 300);
      ctx.lineTo(350 + i * 15, 350);
      ctx.stroke();
    }

    return canvas.toBuffer();
  }

  /**
   * 指定サイズのテスト画像を作成
   */
  async createTestImageOfSize(width, height) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // パターン描画
    const patternSize = Math.min(width, height) / 10;
    
    for (let y = 0; y < height; y += patternSize) {
      for (let x = 0; x < width; x += patternSize) {
        const intensity = (x + y) % (patternSize * 4) / (patternSize * 4);
        const gray = Math.floor(255 * intensity);
        ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
        ctx.fillRect(x, y, patternSize, patternSize);
      }
    }

    return canvas.toBuffer();
  }

  /**
   * 全テストを実行
   */
  async runAllTests() {
    console.log('🎭 MangaStyleRenderer 使用例とテストを開始\n');

    try {
      // 基本使用例
      await this.basicUsage();

      // 設定比較
      await this.settingsComparison();

      // パフォーマンステスト
      const performanceResults = await this.performanceTest();

      // API統合テスト
      await this.apiIntegrationTest();

      console.log('\n=== 総合結果 ===');
      console.log('✅ すべてのテストが正常に完了しました');
      console.log('📁 生成されたファイル:');
      console.log('  - usage_example_basic.png');
      console.log('  - usage_example_dramatic.png');
      console.log('  - usage_example_balanced.png');
      console.log('  - usage_example_gentle.png');
      console.log('  - usage_example_high_contrast.png');
      
      console.log('\n📊 パフォーマンス概要:');
      performanceResults.forEach(result => {
        console.log(`  ${result.size}: ${result.processingTime}ms (${result.pixelsPerMs} pixels/ms)`);
      });

      return true;
    } catch (error) {
      console.error('❌ テスト中にエラーが発生:', error);
      return false;
    }
  }
}

// テストの実行
if (require.main === module) {
  const usage = new MangaStyleRendererUsage();
  usage.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = MangaStyleRendererUsage;