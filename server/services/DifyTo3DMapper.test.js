/**
 * DifyTo3DMapper のテストファイル
 * Flow3データから3Dパラメータへのマッピング機能をテスト
 */

const DifyTo3DMapper = require('./DifyTo3DMapper');

class DifyTo3DMapperTester {
  constructor() {
    this.mapper = new DifyTo3DMapper();
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  /**
   * テスト用のモックFlow3データを生成
   */
  getMockFlow3Data() {
    return [
      {
        "index": 1,
        "cameraAngle": "middle",
        "composition": "キャラクターである太郎がベッドから体を起こしている姿を、やや引きの視点で部屋の中全体が見えるように配置。視線はカーテンから差し込む朝の光に向けられる。手前にベッドがあり奥にカーテンと窓が見える。太郎の表情はまだ眠そうだが、朝の光に少しだけほころぶ。",
        "visualEffects": "normal",
        "characterDetails": "太郎は寝間着姿で、髪の毛はやや乱れている。表情は少し眠そうだが、朝の陽射しに目を細める。",
        "background": 1,
        "backgroundDetails": "室内にはベッド、カーテン、窓、フローリングの床が描かれ、所々に衣類などの脱いだ服が見えている。朝の光が優しく部屋を照らしている様子が伝わる。"
      },
      {
        "index": 2,
        "cameraAngle": "middle",
        "composition": "太郎の腰から上の半身が見える構図で、太郎がカーテンを開けて外を見ている動作がはっきりと描かれる。カーテンは揺れており、外の光が部屋に差し込んでいる。",
        "visualEffects": "normal",
        "characterDetails": "太郎はややリラックスした姿勢でカーテンを引いており、顔には外の景色に興味を持っているような穏やかな表情が浮かんでいる。",
        "background": 0,
        "backgroundDetails": ""
      },
      {
        "index": 3,
        "cameraAngle": "far",
        "composition": "窓を正面からのアングルで捉え、広がる街並みを高い位置から俯瞰的に描く。手前には太郎の部屋の窓枠をぼんやりと見せ、遠景として建物や街路樹などが続く構図。",
        "visualEffects": "normal",
        "characterDetails": "このコマではキャラクターを描かない。",
        "background": 1,
        "backgroundDetails": "背景に穏やかな朝の空が広がり、街灯に照らされた歩道、並んだ家々、遠くに見える山並みなど、平和で静かな都会の朝を描写。"
      }
    ];
  }

  /**
   * 不正なFlow3データを生成（エラーテスト用）
   */
  getInvalidFlow3Data() {
    return [
      // 必須フィールド不足
      {
        "index": 1,
        "cameraAngle": "middle"
        // composition, visualEffects, characterDetails, background が不足
      },
      // 無効なカメラ角度
      {
        "index": 2,
        "cameraAngle": "invalid_angle",
        "composition": "Test composition",
        "visualEffects": "normal",
        "characterDetails": "Test character",
        "background": 1,
        "backgroundDetails": "Test background"
      },
      // 無効な視覚効果
      {
        "index": 3,
        "cameraAngle": "near",
        "composition": "Test composition",
        "visualEffects": "invalid_effect",
        "characterDetails": "Test character",
        "background": 1,
        "backgroundDetails": "Test background"
      }
    ];
  }

  /**
   * 個別テストを実行
   */
  runTest(testName, testFunction) {
    this.totalTests++;
    try {
      const result = testFunction();
      if (result) {
        this.passedTests++;
        console.log(`✅ ${testName}: PASSED`);
        this.testResults.push({ name: testName, status: 'PASSED', error: null });
      } else {
        console.log(`❌ ${testName}: FAILED`);
        this.testResults.push({ name: testName, status: 'FAILED', error: 'Test returned false' });
      }
    } catch (error) {
      console.log(`❌ ${testName}: ERROR - ${error.message}`);
      this.testResults.push({ name: testName, status: 'ERROR', error: error.message });
    }
  }

  /**
   * 基本マッピング機能のテスト
   */
  testBasicMapping() {
    const mockData = this.getMockFlow3Data()[0];
    const result = this.mapper.mapTo3DParameters(mockData);

    // 基本構造の確認
    const hasRequiredFields = 
      result.camera &&
      result.character &&
      result.background &&
      result.composition &&
      result.visualEffects &&
      result.metadata;

    // カメラ設定の確認
    const cameraValid = 
      result.camera.position &&
      typeof result.camera.fov === 'number' &&
      result.camera.originalAngle === 'middle';

    // キャラクター設定の確認
    const characterValid = 
      result.character.visible === true &&
      result.character.clothing === 'pajamas' &&
      result.character.expression === 'sleepy';

    // 背景設定の確認
    const backgroundValid = 
      result.background.visible === true &&
      result.background.environment === 'room' &&
      result.background.lighting === 'morning';

    return hasRequiredFields && cameraValid && characterValid && backgroundValid;
  }

  /**
   * キャラクター不可視の場合のテスト
   */
  testInvisibleCharacter() {
    const mockData = this.getMockFlow3Data()[2]; // キャラクターを描かないパネル
    const result = this.mapper.mapTo3DParameters(mockData);

    return result.character.visible === false &&
           result.character.clothing === 'none' &&
           result.character.pose === 'none';
  }

  /**
   * 背景不可視の場合のテスト
   */
  testInvisibleBackground() {
    const mockData = this.getMockFlow3Data()[1]; // 背景なしのパネル
    const result = this.mapper.mapTo3DParameters(mockData);

    return result.background.visible === false &&
           result.background.environment === 'none';
  }

  /**
   * カメラ設定のテスト
   */
  testCameraSettings() {
    const testCases = [
      { angle: 'near', expectedDistance: 2, expectedFov: 60 },
      { angle: 'middle', expectedDistance: 5, expectedFov: 50 },
      { angle: 'far', expectedDistance: 10, expectedFov: 40 }
    ];

    return testCases.every(testCase => {
      const mockData = { ...this.getMockFlow3Data()[0], cameraAngle: testCase.angle };
      const result = this.mapper.mapTo3DParameters(mockData);
      
      return result.camera.position.z === testCase.expectedDistance &&
             result.camera.fov === testCase.expectedFov;
    });
  }

  /**
   * 視覚効果のテスト
   */
  testVisualEffects() {
    const testCases = [
      { effect: 'normal', expectedFilter: 'none', expectedIntensity: 1.0 },
      { effect: 'emotional', expectedFilter: 'emotional', expectedIntensity: 1.2 },
      { effect: 'deformed', expectedFilter: 'stylized', expectedIntensity: 1.5 },
      { effect: 'past', expectedFilter: 'sepia', expectedIntensity: 0.8 }
    ];

    return testCases.every(testCase => {
      const mockData = { ...this.getMockFlow3Data()[0], visualEffects: testCase.effect };
      const result = this.mapper.mapTo3DParameters(mockData);
      
      return result.visualEffects.filter === testCase.expectedFilter &&
             result.visualEffects.intensity === testCase.expectedIntensity;
    });
  }

  /**
   * バッチ処理のテスト
   */
  testBatchProcessing() {
    const mockDataArray = this.getMockFlow3Data();
    const batchResult = this.mapper.batchMapTo3DParameters(mockDataArray);

    return batchResult.results.length === 3 &&
           batchResult.statistics.total === 3 &&
           batchResult.statistics.success === 3 &&
           batchResult.statistics.failed === 0;
  }

  /**
   * エラーハンドリングのテスト
   */
  testErrorHandling() {
    const invalidData = this.getInvalidFlow3Data();
    let errorCount = 0;

    invalidData.forEach(data => {
      try {
        this.mapper.mapTo3DParameters(data);
      } catch (error) {
        errorCount++;
      }
    });

    return errorCount === invalidData.length;
  }

  /**
   * 構図解析のテスト
   */
  testCompositionParsing() {
    const mockData = this.getMockFlow3Data()[0];
    const result = this.mapper.mapTo3DParameters(mockData);

    // 空間関係の解析確認
    const hasHandForeground = result.composition.spatialRelationships.some(rel => rel.keyword === '手前');
    const hasOkuBackground = result.composition.spatialRelationships.some(rel => rel.keyword === '奥');
    
    // オブジェクトの配置確認
    const hasObjects = 
      result.composition.foregroundObjects.length > 0 ||
      result.composition.backgroundObjects.length > 0;

    return hasHandForeground && hasOkuBackground && hasObjects;
  }

  /**
   * バリデーション機能のテスト
   */
  testValidation() {
    const validData = this.getMockFlow3Data()[0];
    const result = this.mapper.mapTo3DParameters(validData);
    
    // 検証が成功することを確認
    return this.mapper.validateMappingResult(result);
  }

  /**
   * 統計情報生成のテスト
   */
  testStatisticsGeneration() {
    const mockDataArray = this.getMockFlow3Data();
    const batchResult = this.mapper.batchMapTo3DParameters(mockDataArray);
    const stats = this.mapper.generateMappingStatistics(batchResult.results);

    return stats.totalPanels === 3 &&
           stats.cameraDistribution.middle === 2 &&
           stats.cameraDistribution.far === 1 &&
           stats.charactersVisible === 2 &&
           stats.backgroundsVisible === 2;
  }

  /**
   * すべてのテストを実行
   */
  runAllTests() {
    console.log('🧪 DifyTo3DMapper テスト開始\n');

    this.runTest('基本マッピング機能', () => this.testBasicMapping());
    this.runTest('キャラクター不可視', () => this.testInvisibleCharacter());
    this.runTest('背景不可視', () => this.testInvisibleBackground());
    this.runTest('カメラ設定', () => this.testCameraSettings());
    this.runTest('視覚効果', () => this.testVisualEffects());
    this.runTest('バッチ処理', () => this.testBatchProcessing());
    this.runTest('エラーハンドリング', () => this.testErrorHandling());
    this.runTest('構図解析', () => this.testCompositionParsing());
    this.runTest('バリデーション', () => this.testValidation());
    this.runTest('統計情報生成', () => this.testStatisticsGeneration());

    this.printTestResults();
  }

  /**
   * テスト結果を出力
   */
  printTestResults() {
    console.log('\n📊 テスト結果サマリー');
    console.log('='.repeat(50));
    console.log(`総テスト数: ${this.totalTests}`);
    console.log(`成功: ${this.passedTests}`);
    console.log(`失敗: ${this.totalTests - this.passedTests}`);
    console.log(`成功率: ${(this.passedTests / this.totalTests * 100).toFixed(2)}%`);
    
    console.log('\n📝 詳細結果:');
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.name}`);
      if (result.error) {
        console.log(`   エラー: ${result.error}`);
      }
    });

    console.log('\n🎯 テスト完了');
  }

  /**
   * デモンストレーション用のマッピング例を実行
   */
  runDemonstration() {
    console.log('\n🎨 DifyTo3DMapper デモンストレーション');
    console.log('='.repeat(50));

    const mockData = this.getMockFlow3Data();
    console.log('📥 入力データ（Flow3）:');
    console.log(JSON.stringify(mockData[0], null, 2));

    console.log('\n🔄 マッピング実行中...');
    const result = this.mapper.mapTo3DParameters(mockData[0]);

    console.log('\n📤 出力データ（3Dパラメータ）:');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n📊 バッチ処理デモ:');
    const batchResult = this.mapper.batchMapTo3DParameters(mockData);
    console.log('統計情報:', JSON.stringify(batchResult.statistics, null, 2));

    const stats = this.mapper.generateMappingStatistics(batchResult.results);
    console.log('詳細統計:', JSON.stringify(stats, null, 2));
  }
}

// テスト実行（このファイルが直接実行された場合）
if (require.main === module) {
  const tester = new DifyTo3DMapperTester();
  tester.runAllTests();
  tester.runDemonstration();
}

module.exports = DifyTo3DMapperTester;