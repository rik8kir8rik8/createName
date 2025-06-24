const MangaStyleRenderer = require('./MangaStyleRenderer');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

/**
 * MangaStyleRendererのテストとデモンストレーション
 */
async function runTests() {
  console.log('=== MangaStyleRenderer テスト開始 ===\n');
  
  try {
    // レンダラーインスタンスを作成
    const renderer = new MangaStyleRenderer({
      width: 400,
      height: 300,
      edgeThreshold: 45,
      shadowStrength: 1.8
    });

    // 1. 基本テストの実行
    console.log('1. 基本テストの実行...');
    const testResults = await renderer.runBasicTests();
    
    console.log(`テスト結果: ${testResults.passed}件成功, ${testResults.failed}件失敗`);
    testResults.tests.forEach(test => {
      console.log(`  - ${test.name}: ${test.passed ? '✓' : '✗'}`);
      if (test.details) console.log(`    ${test.details}`);
      if (test.error) console.log(`    エラー: ${test.error}`);
    });
    console.log('');

    // 2. サンプル画像の生成とテスト
    console.log('2. サンプル画像での変換テスト...');
    const sampleImage = await createSampleImage();
    const mangaResult = await renderer.renderToMangaStyle(sampleImage);
    
    // 結果を保存
    const outputPath = path.join(__dirname, '../../manga_style_output.png');
    fs.writeFileSync(outputPath, mangaResult);
    console.log(`漫画風変換結果を保存: ${outputPath}`);
    console.log(`出力ファイルサイズ: ${mangaResult.length} bytes`);
    console.log('');

    // 3. 異なる設定での変換テスト
    console.log('3. 異なる設定での変換テスト...');
    
    // 強いエッジ検出設定
    renderer.updateSettings({
      edgeThreshold: 25,
      shadowStrength: 2.5
    });
    
    const strongEdgeResult = await renderer.renderToMangaStyle(sampleImage);
    const strongEdgePath = path.join(__dirname, '../../manga_style_strong_edge.png');
    fs.writeFileSync(strongEdgePath, strongEdgeResult);
    console.log(`強いエッジ検出結果を保存: ${strongEdgePath}`);
    
    // 柔らかいエッジ検出設定
    renderer.updateSettings({
      edgeThreshold: 70,
      shadowStrength: 1.2
    });
    
    const softEdgeResult = await renderer.renderToMangaStyle(sampleImage);
    const softEdgePath = path.join(__dirname, '../../manga_style_soft_edge.png');
    fs.writeFileSync(softEdgePath, softEdgeResult);
    console.log(`柔らかいエッジ検出結果を保存: ${softEdgePath}`);
    console.log('');

    // 4. 効果の説明
    console.log('4. 変換フィルターの効果説明:');
    console.log('  ✓ グレースケール変換: カラー画像を白黒に変換');
    console.log('  ✓ トーン分離: 4段階（黒/濃灰/薄灰/白）に色調を分離');
    console.log('  ✓ エッジ検出: Sobelオペレータで輪郭線を抽出');
    console.log('  ✓ セル調シェーディング: 漫画的な影の強調');
    console.log('  ✓ 合成処理: エッジとシェーディングを組み合わせ');
    console.log('');

    // 5. パフォーマンス測定
    console.log('5. パフォーマンス測定...');
    const startTime = Date.now();
    await renderer.renderToMangaStyle(sampleImage);
    const endTime = Date.now();
    console.log(`処理時間: ${endTime - startTime}ms`);
    console.log('');

    console.log('=== テスト完了 ===');
    return true;

  } catch (error) {
    console.error('テストエラー:', error);
    return false;
  }
}

/**
 * テスト用のサンプル画像を生成
 * @returns {Buffer} 画像Buffer
 */
async function createSampleImage() {
  const canvas = createCanvas(400, 300);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, 400, 300);

  // 円形オブジェクト（3D球体風）
  const centerX = 150;
  const centerY = 150;
  const radius = 60;
  
  const gradient = ctx.createRadialGradient(
    centerX - 20, centerY - 20, 0,
    centerX, centerY, radius
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.7, '#808080');
  gradient.addColorStop(1, '#404040');
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // 立方体風オブジェクト
  ctx.fillStyle = '#d0d0d0';
  ctx.fillRect(250, 100, 80, 80);
  
  // 立方体の影
  ctx.fillStyle = '#808080';
  ctx.fillRect(260, 110, 80, 80);
  
  // 立方体の面
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(250, 100, 80, 80);

  // 地面の影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.ellipse(150, 230, 50, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillRect(280, 240, 60, 10);

  return canvas.toBuffer();
}

// テストの実行
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runTests, createSampleImage };