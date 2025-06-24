/**
 * DifyTo3DMapper 使用例とデモンストレーション
 * 実際のDifyServiceから取得したFlow3データを使用してマッピングを実行
 */

const DifyTo3DMapper = require('./DifyTo3DMapper');
const DifyService = require('./difyService');

class DifyTo3DMapperUsageDemo {
  constructor() {
    this.mapper = new DifyTo3DMapper();
    this.difyService = new DifyService();
  }

  /**
   * 基本的な使用例
   */
  async demonstrateBasicUsage() {
    console.log('🚀 DifyTo3DMapper 基本使用例\n');
    console.log('='.repeat(60));

    try {
      // モックデータを使用（Dify APIが利用できない場合）
      const mockFlow3Data = this.difyService.getMockFlow3Output();
      
      console.log('📥 入力データ（Flow3出力）:');
      console.log(JSON.stringify(mockFlow3Data[0], null, 2));
      
      console.log('\n🔄 マッピング実行中...');
      const mapped3DParams = this.mapper.mapTo3DParameters(mockFlow3Data[0]);
      
      console.log('\n📤 出力データ（3Dパラメータ）:');
      console.log(JSON.stringify(mapped3DParams, null, 2));
      
      console.log('\n✅ 基本マッピング完了');
      return mapped3DParams;
    } catch (error) {
      console.error('❌ 基本マッピングエラー:', error.message);
      throw error;
    }
  }

  /**
   * バッチ処理の使用例
   */
  async demonstrateBatchProcessing() {
    console.log('\n🚀 バッチ処理使用例\n');
    console.log('='.repeat(60));

    try {
      const mockFlow3DataArray = this.difyService.getMockFlow3Output();
      
      console.log(`📥 入力データ（${mockFlow3DataArray.length}件のFlow3パネル）`);
      
      console.log('\n🔄 バッチマッピング実行中...');
      const batchResult = this.mapper.batchMapTo3DParameters(mockFlow3DataArray);
      
      console.log('\n📊 バッチ処理結果統計:');
      console.log(JSON.stringify(batchResult.statistics, null, 2));
      
      if (batchResult.errors.length > 0) {
        console.log('\n⚠️ エラー詳細:');
        batchResult.errors.forEach((err, index) => {
          console.log(`${index + 1}. ${err.error}`);
        });
      }
      
      console.log('\n✅ バッチ処理完了');
      return batchResult;
    } catch (error) {
      console.error('❌ バッチ処理エラー:', error.message);
      throw error;
    }
  }

  /**
   * 統計情報生成の使用例
   */
  async demonstrateStatistics() {
    console.log('\n🚀 統計情報生成使用例\n');
    console.log('='.repeat(60));

    try {
      const mockFlow3DataArray = this.difyService.getMockFlow3Output();
      const batchResult = this.mapper.batchMapTo3DParameters(mockFlow3DataArray);
      
      console.log('📊 詳細統計情報生成中...');
      const stats = this.mapper.generateMappingStatistics(batchResult.results);
      
      console.log('\n📈 マッピング統計:');
      console.log(JSON.stringify(stats, null, 2));
      
      // 統計情報の視覚的な表示
      this.displayStatisticsVisually(stats);
      
      console.log('\n✅ 統計情報生成完了');
      return stats;
    } catch (error) {
      console.error('❌ 統計情報生成エラー:', error.message);
      throw error;
    }
  }

  /**
   * Three.js統合の使用例
   */
  async demonstrateThreeJSIntegration() {
    console.log('\n🚀 Three.js統合使用例\n');
    console.log('='.repeat(60));

    try {
      const mockFlow3Data = this.difyService.getMockFlow3Output()[0];
      const mapped3DParams = this.mapper.mapTo3DParameters(mockFlow3Data);
      
      console.log('🎬 Three.jsシーン設定コード生成:');
      const threeJSCode = this.generateThreeJSCode(mapped3DParams);
      
      console.log(threeJSCode);
      
      console.log('\n✅ Three.js統合コード生成完了');
      return threeJSCode;
    } catch (error) {
      console.error('❌ Three.js統合エラー:', error.message);
      throw error;
    }
  }

  /**
   * エラーハンドリングの使用例
   */
  async demonstrateErrorHandling() {
    console.log('\n🚀 エラーハンドリング使用例\n');
    console.log('='.repeat(60));

    const invalidData = [
      // 必須フィールド不足
      { index: 1 },
      // 無効な値
      {
        index: 2,
        cameraAngle: 'invalid',
        composition: 'test',
        visualEffects: 'invalid',
        characterDetails: 'test',
        background: 2
      }
    ];

    console.log('❌ 無効なデータでのテスト:');
    
    for (let i = 0; i < invalidData.length; i++) {
      try {
        console.log(`\n🔄 テスト ${i + 1}:`);
        const result = this.mapper.mapTo3DParameters(invalidData[i]);
        console.log('⚠️ 予期しない成功:', result);
      } catch (error) {
        console.log(`✅ 期待通りのエラー: ${error.message}`);
      }
    }
    
    console.log('\n✅ エラーハンドリングテスト完了');
  }

  /**
   * パフォーマンステストの使用例
   */
  async demonstratePerformanceTest() {
    console.log('\n🚀 パフォーマンステスト使用例\n');
    console.log('='.repeat(60));

    try {
      const mockFlow3Data = this.difyService.getMockFlow3Output()[0];
      const iterations = 1000;
      
      console.log(`⏱️ ${iterations}回のマッピング実行テスト開始...`);
      
      const startTime = process.hrtime.bigint();
      
      for (let i = 0; i < iterations; i++) {
        this.mapper.mapTo3DParameters(mockFlow3Data);
      }
      
      const endTime = process.hrtime.bigint();
      const executionTime = Number(endTime - startTime) / 1000000; // ナノ秒をミリ秒に変換
      
      console.log(`⏱️ 実行時間: ${executionTime.toFixed(2)}ms`);
      console.log(`⏱️ 平均実行時間: ${(executionTime / iterations).toFixed(4)}ms/回`);
      console.log(`⏱️ スループット: ${(iterations / (executionTime / 1000)).toFixed(0)}回/秒`);
      
      console.log('\n✅ パフォーマンステスト完了');
      
      return {
        totalTime: executionTime,
        averageTime: executionTime / iterations,
        throughput: iterations / (executionTime / 1000)
      };
    } catch (error) {
      console.error('❌ パフォーマンステストエラー:', error.message);
      throw error;
    }
  }

  /**
   * 統計情報の視覚的な表示
   */
  displayStatisticsVisually(stats) {
    console.log('\n📊 視覚的統計表示:');
    console.log('-'.repeat(40));
    
    // カメラ角度分布
    console.log('📷 カメラ角度分布:');
    const totalPanels = stats.totalPanels;
    Object.entries(stats.cameraDistribution).forEach(([angle, count]) => {
      const percentage = ((count / totalPanels) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / totalPanels * 20));
      console.log(`  ${angle.padRight ? angle.padRight(6) : angle}: ${bar} ${count} (${percentage}%)`);
    });
    
    // 視覚効果分布
    console.log('\n✨ 視覚効果分布:');
    Object.entries(stats.visualEffectsDistribution).forEach(([effect, count]) => {
      const percentage = ((count / totalPanels) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(count / totalPanels * 20));
      console.log(`  ${effect.padRight ? effect.padRight(8) : effect}: ${bar} ${count} (${percentage}%)`);
    });
    
    console.log(`\n👥 キャラクター表示: ${stats.charactersVisible}/${totalPanels} パネル`);
    console.log(`🏠 背景表示: ${stats.backgroundsVisible}/${totalPanels} パネル`);
    console.log(`🎨 平均構図複雑度: ${stats.averageCompositionComplexity} オブジェクト/パネル`);
  }

  /**
   * Three.jsコード生成
   */
  generateThreeJSCode(mapped3DParams) {
    const { camera, character, background, visualEffects } = mapped3DParams;
    
    return `
// Three.js シーン設定コード
const scene = new THREE.Scene();

// カメラ設定
const camera = new THREE.PerspectiveCamera(
  ${camera.fov}, // FOV
  ${camera.aspect}, // アスペクト比
  ${camera.near}, // near
  ${camera.far}  // far
);
camera.position.set(${camera.position.x}, ${camera.position.y}, ${camera.position.z});
camera.lookAt(${camera.target.x}, ${camera.target.y}, ${camera.target.z});

// レンダラー設定
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

${background.visible ? `
// 背景設定
scene.background = new THREE.Color('${background.ambientColor}');

// 環境光
const ambientLight = new THREE.AmbientLight('${background.ambientColor}', ${background.lightIntensity});
scene.add(ambientLight);

// 背景オブジェクト (${background.environment})
// TODO: ${background.environment} 環境のオブジェクトを追加
${background.props.map(prop => `// - ${prop}`).join('\n')}
` : '// 背景なし'}

${character.visible ? `
// キャラクター設定
// TODO: キャラクターモデルを読み込み
// - 服装: ${character.clothing}
// - 髪型: ${character.hair}
// - 表情: ${character.expression}
// - ポーズ: ${character.pose}
const characterGroup = new THREE.Group();
characterGroup.position.set(${character.position.x}, ${character.position.y}, ${character.position.z});
characterGroup.rotation.set(${character.rotation.x}, ${character.rotation.y}, ${character.rotation.z});
characterGroup.scale.set(${character.scale.x}, ${character.scale.y}, ${character.scale.z});
scene.add(characterGroup);
` : '// キャラクター非表示'}

// 視覚効果: ${visualEffects.originalEffect}
// フィルター: ${visualEffects.filter}
// 強度: ${visualEffects.intensity}
${visualEffects.postProcessing.bloom ? '// ブルーム効果を追加' : ''}
${visualEffects.postProcessing.blur ? '// ブラー効果を追加' : ''}
${visualEffects.postProcessing.colorGrading ? '// カラーグレーディングを追加' : ''}

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  
  ${visualEffects.animation.enabled ? `
  // アニメーション: ${visualEffects.animation.type}
  // 継続時間: ${visualEffects.animation.duration}秒
  // イージング: ${visualEffects.animation.easing}
  ` : '// アニメーションなし'}
  
  renderer.render(scene, camera);
}

animate();
`;
  }

  /**
   * すべてのデモンストレーションを実行
   */
  async runAllDemonstrations() {
    console.log('🎯 DifyTo3DMapper 完全デモンストレーション開始');
    console.log('='.repeat(80));

    try {
      await this.demonstrateBasicUsage();
      await this.demonstrateBatchProcessing();
      await this.demonstrateStatistics();
      await this.demonstrateThreeJSIntegration();
      await this.demonstrateErrorHandling();
      await this.demonstratePerformanceTest();
      
      console.log('\n🎉 すべてのデモンストレーション完了！');
      console.log('='.repeat(80));
      
    } catch (error) {
      console.error('❌ デモンストレーション中にエラーが発生:', error.message);
      throw error;
    }
  }

  /**
   * 実用的な統合例
   */
  async demonstratePracticalIntegration() {
    console.log('\n🏗️ 実用的な統合例\n');
    console.log('='.repeat(60));

    try {
      // 1. Difyサービスからの実際のデータ取得をシミュレート
      console.log('1️⃣ Flow3データ取得中...');
      const flow3DataArray = this.difyService.getMockFlow3Output();
      
      // 2. バッチマッピング実行
      console.log('2️⃣ 3Dパラメータマッピング中...');
      const batchResult = this.mapper.batchMapTo3DParameters(flow3DataArray);
      
      // 3. 統計情報生成
      console.log('3️⃣ 統計情報生成中...');
      const stats = this.mapper.generateMappingStatistics(batchResult.results);
      
      // 4. 実用的な出力フォーマット
      console.log('4️⃣ 実用的なデータ構造生成中...');
      const practicalOutput = {
        metadata: {
          generatedAt: new Date().toISOString(),
          totalPanels: batchResult.statistics.total,
          successfulMappings: batchResult.statistics.success,
          mappingVersion: '2.0'
        },
        panels: batchResult.results.filter(result => result !== null),
        statistics: stats,
        errors: batchResult.errors
      };
      
      console.log('\n📋 実用的な出力例:');
      console.log('```json');
      console.log(JSON.stringify({
        metadata: practicalOutput.metadata,
        panelsCount: practicalOutput.panels.length,
        statisticsSummary: {
          cameraDistribution: stats.cameraDistribution,
          visualEffectsDistribution: stats.visualEffectsDistribution,
          averageComplexity: stats.averageCompositionComplexity
        }
      }, null, 2));
      console.log('```');
      
      console.log('\n✅ 実用的統合例完了');
      return practicalOutput;
      
    } catch (error) {
      console.error('❌ 実用的統合エラー:', error.message);
      throw error;
    }
  }
}

// デモンストレーション実行（このファイルが直接実行された場合）
if (require.main === module) {
  const demo = new DifyTo3DMapperUsageDemo();
  
  (async () => {
    try {
      await demo.runAllDemonstrations();
      await demo.demonstratePracticalIntegration();
    } catch (error) {
      console.error('❌ デモンストレーション失敗:', error);
      process.exit(1);
    }
  })();
}

module.exports = DifyTo3DMapperUsageDemo;