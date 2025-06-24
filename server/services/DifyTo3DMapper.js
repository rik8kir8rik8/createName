/**
 * DifyデータからThree.js 3Dパラメーターへのマッピングシステム
 * 
 * Flow3のデータ構造：
 * - index: パネルのインデックス番号
 * - cameraAngle: "near", "middle", "far"
 * - composition: 自然言語による3D空間配置の説明
 * - visualEffects: "normal", "emotional", "deformed", "past"
 * - characterDetails: キャラクターの詳細説明（服装、表情、ポーズ）
 * - background: 0 or 1 (背景の有無)
 * - backgroundDetails: 背景の詳細説明
 * 
 * 更新: 2025-06-23
 * - バッチ処理機能の追加
 * - エラーハンドリングの改善
 * - 統計情報の出力機能の追加
 */

const { DifyCameraAngleEnum, DifyVisualEffectsEnum } = require('../../shared/types/difyTypes');

class DifyTo3DMapper {
  constructor() {
    // キャラクター属性のマッピング辞書
    this.characterAttributeMap = {
      // 服装
      clothing: {
        '寝間着': 'pajamas',
        'パジャマ': 'pajamas',
        'Tシャツ': 't-shirt',
        'シャツ': 'shirt',
        'スーツ': 'suit',
        'ワンピース': 'dress',
        'ジーンズ': 'jeans',
        'スカート': 'skirt',
        '制服': 'uniform',
        'カジュアル': 'casual'
      },
      // 髪型・髪の状態
      hair: {
        '乱れ': 'messy',
        '整っ': 'neat',
        'ぼさぼさ': 'disheveled',
        'さらさら': 'smooth',
        'ショート': 'short',
        'ロング': 'long',
        'ツインテール': 'twin-tails',
        'ポニーテール': 'ponytail'
      },
      // 表情・感情
      expression: {
        '眠そう': 'sleepy',
        '驚': 'surprised',
        '嬉し': 'happy',
        '悲し': 'sad',
        '怒': 'angry',
        '困': 'troubled',
        '笑': 'smiling',
        '泣': 'crying',
        '真剣': 'serious',
        '穏やか': 'calm',
        'リラックス': 'relaxed',
        '興味': 'interested'
      },
      // ポーズ・動作
      pose: {
        '起こし': 'sitting-up',
        '立': 'standing',
        '座': 'sitting',
        '寝': 'lying',
        '歩': 'walking',
        '走': 'running',
        '手を振': 'waving',
        '指差': 'pointing',
        '腕組': 'arms-crossed',
        '考え': 'thinking',
        '見': 'looking',
        '開け': 'opening-curtain',
        '振り向': 'looking',
        '伸ば': 'reaching',
        '眺め': 'looking',
        '凝視': 'looking',
        '手を上げ': 'reaching',
        '体を起こし': 'sitting-up',
        'カーテンを開': 'opening-curtain',
        '窓を見': 'looking'
      }
    };

    // 背景環境のマッピング辞書
    this.backgroundEnvironmentMap = {
      // 場所・環境
      location: {
        '部屋': 'room',
        '寝室': 'bedroom',
        'リビング': 'living-room',
        'キッチン': 'kitchen',
        '学校': 'school',
        '教室': 'classroom',
        '公園': 'park',
        '街': 'street',
        '家': 'house',
        '屋外': 'outdoor',
        '室内': 'indoor'
      },
      // 照明・時間帯
      lighting: {
        '朝': 'morning',
        '昼': 'daytime',
        '夕': 'evening',
        '夜': 'night',
        '明るい': 'bright',
        '暗い': 'dark',
        '陽射し': 'sunlight',
        '光': 'light',
        '影': 'shadow',
        '照らし': 'illuminated'
      },
      // 小道具・オブジェクト
      props: {
        'ベッド': 'bed',
        'カーテン': 'curtain',
        '窓': 'window',
        '机': 'desk',
        '椅子': 'chair',
        '本': 'book',
        'フローリング': 'flooring',
        '床': 'floor',
        '壁': 'wall',
        '天井': 'ceiling',
        '衣類': 'clothes',
        '服': 'clothing'
      }
    };

    // カメラ設定のマッピング
    this.cameraSettingsMap = {
      'near': {
        distance: 2,
        fov: 60,
        angle: 'close-up',
        description: 'クローズアップ撮影'
      },
      'middle': {
        distance: 5,
        fov: 50,
        angle: 'eye-level',
        description: 'ミドルショット撮影'
      },
      'far': {
        distance: 10,
        fov: 40,
        angle: 'wide-shot',
        description: 'ワイドショット撮影'
      }
    };

    // 視覚効果のマッピング
    this.visualEffectsMap = {
      'normal': {
        filter: 'none',
        intensity: 1.0,
        description: '通常の描画'
      },
      'emotional': {
        filter: 'emotional',
        intensity: 1.2,
        description: '感情的な演出'
      },
      'deformed': {
        filter: 'stylized',
        intensity: 1.5,
        description: 'デフォルメ表現'
      },
      'past': {
        filter: 'sepia',
        intensity: 0.8,
        description: '回想シーン'
      }
    };
  }

  /**
   * Flow3データを3Dパラメータに変換するメイン関数
   * @param {Object} flow3Data - Flow3の出力データ
   * @returns {Object} 3Dレンダリング用パラメータ
   */
  mapTo3DParameters(flow3Data) {
    try {
      // 入力データの検証
      this.validateFlow3Input(flow3Data);

      const result = {
        camera: this.mapCameraSettings(flow3Data.cameraAngle, flow3Data.composition),
        character: this.mapCharacterData(flow3Data.characterDetails, flow3Data.composition),
        background: this.mapBackgroundData(flow3Data.backgroundDetails, flow3Data.background),
        composition: this.parseComposition(flow3Data.composition),
        visualEffects: this.mapVisualEffects(flow3Data.visualEffects),
        metadata: {
          originalData: flow3Data,
          mappedAt: new Date().toISOString(),
          panelIndex: flow3Data.index || 0,
          mappingVersion: '2.0'
        }
      };

      // 結果の検証
      this.validateMappingResult(result);

      console.log('✅ Flow3データを3Dパラメータに変換完了:', JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error('❌ Flow3データの変換中にエラーが発生:', error);
      throw new Error(`Flow3データ変換エラー: ${error.message}`);
    }
  }

  /**
   * 複数のFlow3データを一括で3Dパラメータに変換
   * @param {Array} flow3DataArray - Flow3データの配列
   * @returns {Array} 3Dレンダリング用パラメータの配列
   */
  batchMapTo3DParameters(flow3DataArray) {
    if (!Array.isArray(flow3DataArray)) {
      throw new Error('入力は配列である必要があります');
    }

    const results = [];
    const errors = [];
    let successCount = 0;

    console.log(`🚀 バッチ処理開始: ${flow3DataArray.length}件のFlow3データを変換中...`);

    for (let i = 0; i < flow3DataArray.length; i++) {
      try {
        const result = this.mapTo3DParameters(flow3DataArray[i]);
        results.push(result);
        successCount++;
        console.log(`✅ [${i + 1}/${flow3DataArray.length}] 変換完了`);
      } catch (error) {
        const errorInfo = {
          index: i,
          originalData: flow3DataArray[i],
          error: error.message
        };
        errors.push(errorInfo);
        results.push(null);
        console.error(`❌ [${i + 1}/${flow3DataArray.length}] 変換失敗:`, error.message);
      }
    }

    console.log(`🎯 バッチ処理完了: 成功 ${successCount}件, 失敗 ${errors.length}件`);

    return {
      results: results,
      statistics: {
        total: flow3DataArray.length,
        success: successCount,
        failed: errors.length,
        successRate: (successCount / flow3DataArray.length * 100).toFixed(2) + '%'
      },
      errors: errors
    };
  }

  /**
   * キャラクター詳細を3Dキャラクターパラメータに変換
   * @param {string} characterDetails - キャラクターの詳細説明
   * @returns {Object} 3Dキャラクターパラメータ
   */
  mapCharacterData(characterDetails, composition = '') {
    if (!characterDetails || characterDetails.trim() === '' || characterDetails === 'このコマではキャラクターを描かない。') {
      return {
        visible: false,
        clothing: 'none',
        hair: 'none',
        expression: 'none',
        pose: 'none',
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      };
    }

    // より詳細なキャラクター解析（compositionも考慮）
    const character = {
      visible: true,
      clothing: this.extractClothingStyle(characterDetails),
      hair: this.extractHairStyle(characterDetails),
      expression: this.extractExpression(characterDetails),
      pose: this.extractPose(characterDetails + ' ' + composition),
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      originalDescription: characterDetails,
      // 追加の詳細情報
      detailedAttributes: {
        clothingColor: this.extractClothingColor(characterDetails),
        skinTone: this.extractSkinTone(characterDetails),
        facialDetails: this.extractFacialDetails(characterDetails),
        bodyLanguage: this.extractBodyLanguage(characterDetails)
      }
    };

    // 特定のポーズや表情に基づいた位置調整
    this.adjustCharacterPosition(character, characterDetails);
    
    // 複合的なポーズの解析
    this.analyzeComplexPose(character, characterDetails);

    console.log('🎭 キャラクターデータマッピング結果:', character);
    return character;
  }

  /**
   * 背景詳細を3D背景設定に変換
   * @param {string} backgroundDetails - 背景の詳細説明
   * @param {number} backgroundFlag - 背景の有無フラグ (0 or 1)
   * @returns {Object} 3D背景パラメータ
   */
  mapBackgroundData(backgroundDetails, backgroundFlag) {
    if (backgroundFlag === 0 || !backgroundDetails || backgroundDetails.trim() === '') {
      return {
        visible: false,
        environment: 'none',
        lighting: 'default',
        props: [],
        ambientColor: '#404040',
        lightIntensity: 0.6
      };
    }

    const background = {
      visible: true,
      environment: this.extractAttribute(backgroundDetails, this.backgroundEnvironmentMap.location) || 'room',
      lighting: this.extractAttribute(backgroundDetails, this.backgroundEnvironmentMap.lighting) || 'daytime',
      props: this.extractMultipleAttributes(backgroundDetails, this.backgroundEnvironmentMap.props),
      roomLayout: this.analyzeRoomLayout(backgroundDetails),
      atmosphericEffects: this.extractAtmosphericEffects(backgroundDetails),
      ambientColor: this.determineLightColor(backgroundDetails),
      lightIntensity: this.determineLightIntensity(backgroundDetails),
      originalDescription: backgroundDetails
    };

    console.log('🏠 背景データマッピング結果:', background);
    return background;
  }
  
  /**
   * 部屋のレイアウトを解析
   * @param {string} backgroundDetails - 背景詳細
   * @returns {Object} 部屋のレイアウト情報
   */
  analyzeRoomLayout(backgroundDetails) {
    const layout = {
      roomType: 'bedroom',
      furniture: [],
      floorType: 'flooring',
      lightingSources: []
    };
    
    // 家具の配置
    if (backgroundDetails.includes('ベッド')) {
      layout.furniture.push({ type: 'bed', position: 'center-right' });
    }
    if (backgroundDetails.includes('カーテン')) {
      layout.furniture.push({ type: 'curtain', position: 'left-wall' });
    }
    if (backgroundDetails.includes('窓')) {
      layout.furniture.push({ type: 'window', position: 'left-wall' });
    }
    
    // 床の種類
    if (backgroundDetails.includes('フローリング')) {
      layout.floorType = 'wood-flooring';
    }
    
    // 照明源
    if (backgroundDetails.includes('朝の光')) {
      layout.lightingSources.push({ type: 'natural', source: 'window', intensity: 'soft' });
    }
    
    return layout;
  }
  
  /**
   * 大気効果を抽出
   * @param {string} backgroundDetails - 背景詳細
   * @returns {Object} 大気効果
   */
  extractAtmosphericEffects(backgroundDetails) {
    const effects = {
      lightRays: false,
      dust: false,
      warmth: false,
      softness: false
    };
    
    if (backgroundDetails.includes('朝の光') && backgroundDetails.includes('優しく')) {
      effects.lightRays = true;
      effects.softness = true;
      effects.warmth = true;
    }
    
    if (backgroundDetails.includes('照らし')) {
      effects.lightRays = true;
    }
    
    return effects;
  }

  /**
   * カメラ角度を3Dカメラ設定に変換（構図データも考慮）
   * @param {string} cameraAngle - カメラ角度 ("near", "middle", "far")
   * @param {string} composition - 構図説明
   * @returns {Object} 3Dカメラパラメータ
   */
  mapCameraSettings(cameraAngle, composition = '') {
    const setting = this.cameraSettingsMap[cameraAngle] || this.cameraSettingsMap['middle'];
    
    // 構図説明に基づいてカメラ位置を微調整
    const cameraAdjustment = this.analyzeCameraPositionFromComposition(composition);
    
    const camera = {
      position: {
        x: cameraAdjustment.x,
        y: setting.height + cameraAdjustment.y,
        z: setting.distance + cameraAdjustment.z
      },
      target: cameraAdjustment.target || { x: 0, y: 0, z: 0 },
      fov: setting.fov,
      aspect: 4/3, // パネル比率に合わせて調整
      near: 0.1,
      far: 1000,
      type: setting.angle,
      originalAngle: cameraAngle,
      description: setting.description,
      compositionBased: true,
      adjustment: cameraAdjustment
    };

    console.log('📷 Enhanced カメラ設定マッピング結果:', camera);
    return camera;
  }

  /**
   * 構図説明からカメラ位置の微調整を解析
   * @param {string} composition - 構図説明
   * @returns {Object} カメラ位置の調整値
   */
  analyzeCameraPositionFromComposition(composition) {
    const adjustment = {
      x: 0,  // 左右
      y: 0,  // 上下
      z: 0,  // 前後
      target: null
    };

    // "やや引きの視点"の検出
    if (composition.includes('やや引き') || composition.includes('引きの視点')) {
      adjustment.z += 2; // より後ろに
      adjustment.y += 1; // 少し上から
    }

    // "部屋の中全体が見える"の検出
    if (composition.includes('部屋の中全体') || composition.includes('全体が見える')) {
      adjustment.z += 3; // さらに後ろに
      adjustment.y += 2; // 上から見下ろし
    }

    // "手前に○○がある"の検出
    if (composition.includes('手前に')) {
      adjustment.z -= 1; // 少し前に
    }

    // "奥に○○がある"の検出
    if (composition.includes('奥に')) {
      adjustment.z += 1; // 少し後ろに
    }

    // 視線の方向
    if (composition.includes('カーテンから差し込む')) {
      // カーテン方向を見るカメラ角度
      adjustment.target = { x: -3, y: 4, z: -8 };
    }

    if (composition.includes('窓') && composition.includes('見える')) {
      // 窓方向のターゲット
      adjustment.target = { x: 0, y: 4, z: -9 };
    }

    console.log('🎯 構図ベースのカメラ調整:', adjustment);
    return adjustment;
  }

  /**
   * 構図説明から3D空間配置を解析
   * @param {string} compositionText - 構図の説明テキスト
   * @returns {Object} 3D空間配置パラメータ
   */
  parseComposition(compositionText) {
    const composition = {
      layout: 'default',
      foregroundObjects: [],
      midgroundObjects: [],
      backgroundObjects: [],
      spatialRelationships: [],
      originalText: compositionText
    };

    if (!compositionText) {
      return composition;
    }

    // 空間的な関係性を解析
    const spatialKeywords = {
      '手前': 'foreground',
      '奥': 'background',
      '中央': 'center',
      '左': 'left',
      '右': 'right',
      '上': 'top',
      '下': 'bottom',
      '前': 'front',
      '後': 'back',
      '引きの視点': 'wide-view',
      'やや引き': 'medium-wide',
      '全体': 'full-view',
      '見える': 'visible',
      '配置': 'positioned'
    };

    // オブジェクトの配置を解析
    const objectKeywords = {
      'キャラクター': 'character',
      'ベッド': 'bed',
      'カーテン': 'curtain',
      '窓': 'window',
      '光': 'light',
      '影': 'shadow',
      '部屋': 'room',
      '床': 'floor',
      'フローリング': 'flooring',
      '壁': 'wall',
      '天井': 'ceiling',
      '朝の光': 'morning-light',
      '陽射し': 'sunlight',
      '衣類': 'clothes',
      '服': 'clothing-items'
    };

    // 構図テキストから空間配置を推測
    for (const [keyword, position] of Object.entries(spatialKeywords)) {
      if (compositionText.includes(keyword)) {
        composition.spatialRelationships.push({
          keyword: keyword,
          position: position,
          context: this.extractContext(compositionText, keyword)
        });
      }
    }
    
    // 特殊な構図パターンの解析
    this.analyzeSpecialCompositionPatterns(composition, compositionText);

    // オブジェクトの配置を分析
    for (const [keyword, object] of Object.entries(objectKeywords)) {
      if (compositionText.includes(keyword)) {
        const placement = this.determineObjectPlacement(compositionText, keyword);
        if (placement.depth === 'foreground') {
          composition.foregroundObjects.push({ type: object, position: placement.position });
        } else if (placement.depth === 'background') {
          composition.backgroundObjects.push({ type: object, position: placement.position });
        } else {
          composition.midgroundObjects.push({ type: object, position: placement.position });
        }
      }
    }

    console.log('🎨 構図解析結果:', composition);
    return composition;
  }
  
  /**
   * 特殊な構図パターンを解析
   * @param {Object} composition - 構図オブジェクト
   * @param {string} compositionText - 構図テキスト
   */
  analyzeSpecialCompositionPatterns(composition, compositionText) {
    // 「やや引きの視点で部屋の中全体が見える」パターン
    if (compositionText.includes('引きの視点') && compositionText.includes('全体')) {
      composition.layout = 'wide-room-view';
      composition.cameraDistance = 'far';
      composition.viewType = 'establishing-shot';
    }
    
    // 「手前にベッドがあり奥にカーテンと窓が見える」パターン
    if (compositionText.includes('手前に') && compositionText.includes('奥に')) {
      composition.layout = 'depth-layered';
      composition.depthLayers = {
        foreground: this.extractObjectsInContext(compositionText, '手前'),
        background: this.extractObjectsInContext(compositionText, '奥')
      };
    }
    
    // 視線の方向パターン
    if (compositionText.includes('視線') && compositionText.includes('向けられる')) {
      composition.gazeDirection = this.extractGazeTarget(compositionText);
    }
  }
  
  /**
   * 文脈内のオブジェクトを抽出
   * @param {string} text - テキスト
   * @param {string} context - 文脈キーワード
   * @returns {Array} オブジェクト配列
   */
  extractObjectsInContext(text, context) {
    const objects = [];
    const contextIndex = text.indexOf(context);
    if (contextIndex === -1) return objects;
    
    // 文脈の後の部分を解析
    const afterContext = text.substring(contextIndex + context.length, contextIndex + context.length + 50);
    
    if (afterContext.includes('ベッド')) objects.push('bed');
    if (afterContext.includes('カーテン')) objects.push('curtain');
    if (afterContext.includes('窓')) objects.push('window');
    if (afterContext.includes('キャラクター')) objects.push('character');
    
    return objects;
  }
  
  /**
   * 視線のターゲットを抽出
   * @param {string} text - テキスト
   * @returns {string} 視線のターゲット
   */
  extractGazeTarget(text) {
    if (text.includes('カーテン')) return 'curtain';
    if (text.includes('窓')) return 'window';
    if (text.includes('朝の光')) return 'morning-light';
    if (text.includes('陽射し')) return 'sunlight';
    return 'forward';
  }

  /**
   * 視覚効果を3D表現パラメータに変換
   * @param {string} visualEffects - 視覚効果の種類
   * @returns {Object} 3D視覚効果パラメータ
   */
  mapVisualEffects(visualEffects) {
    const effect = this.visualEffectsMap[visualEffects] || this.visualEffectsMap['normal'];
    
    const result = {
      filter: effect.filter,
      intensity: effect.intensity,
      postProcessing: this.getPostProcessingSettings(visualEffects),
      animation: this.getAnimationSettings(visualEffects),
      originalEffect: visualEffects,
      description: effect.description
    };

    console.log('✨ 視覚効果マッピング結果:', result);
    return result;
  }

  /**
   * テキストから属性を抽出するヘルパー関数
   * @param {string} text - 解析対象のテキスト
   * @param {Object} attributeMap - 属性マッピング辞書
   * @returns {string|null} 抽出された属性値
   */
  extractAttribute(text, attributeMap) {
    for (const [keyword, value] of Object.entries(attributeMap)) {
      if (text.includes(keyword)) {
        return value;
      }
    }
    return null;
  }

  /**
   * テキストから複数の属性を抽出するヘルパー関数
   * @param {string} text - 解析対象のテキスト
   * @param {Object} attributeMap - 属性マッピング辞書
   * @returns {Array} 抽出された属性値の配列
   */
  extractMultipleAttributes(text, attributeMap) {
    const attributes = [];
    for (const [keyword, value] of Object.entries(attributeMap)) {
      if (text.includes(keyword)) {
        attributes.push(value);
      }
    }
    return attributes;
  }

  /**
   * キャラクターの位置を調整するヘルパー関数
   * @param {Object} character - キャラクターオブジェクト
   * @param {string} description - キャラクターの説明
   */
  adjustCharacterPosition(character, description) {
    // ベッドから起き上がる動作の場合
    if (description.includes('ベッド') && (description.includes('起こし') || description.includes('起き上がり'))) {
      character.position.y = -0.5; // ベッドの高さ
      character.position.z = 1; // ベッド上の位置
      character.pose = 'sitting-up';
    }
    
    // 窓辺に立つ・窓を見る場合
    if ((description.includes('窓') && description.includes('見')) || description.includes('窓辺')) {
      character.position.z = -1.5; // 窓に近い位置
      character.rotation.y = 0; // 窓の方向を向く
      character.pose = 'looking';
    }
    
    // カーテンを開ける動作の場合
    if (description.includes('カーテン') && description.includes('開')) {
      character.position.x = -1; // カーテンの位置
      character.position.z = -1;
      character.pose = 'opening-curtain';
    }
    
    // 視線の方向を解析
    if (description.includes('視線')) {
      if (description.includes('カーテン') || description.includes('窓')) {
        character.rotation.y = -0.3; // 左側を向く
      }
      if (description.includes('朝の光') || description.includes('陽射し')) {
        character.rotation.y = -0.2;
        character.rotation.x = 0.1; // 少し上を向く
      }
    }
  }
  
  /**
   * 複合的なポーズを解析
   * @param {Object} character - キャラクターオブジェクト
   * @param {string} description - キャラクターの説明
   */
  analyzeComplexPose(character, description) {
    // 「ベッドから体を起こしている」の詳細解析
    if (description.includes('ベッドから体を起こし')) {
      character.pose = 'sitting-up';
      character.detailedAttributes.bodyLanguage = 'waking-up';
    }
    
    // 「目を細める」動作
    if (description.includes('目を細め')) {
      character.expression = 'sleepy';
      character.detailedAttributes.facialDetails = 'squinting';
    }
    
    // 「視線を向ける」動作
    if (description.includes('視線') && description.includes('向け')) {
      character.pose = 'looking';
      character.detailedAttributes.bodyLanguage = 'focused-gaze';
    }
  }
  
  /**
   * 服装スタイルを抽出
   * @param {string} description - 説明文
   * @returns {string} 服装スタイル
   */
  extractClothingStyle(description) {
    if (description.includes('寝間着') || description.includes('パジャマ')) {
      return 'pajamas';
    }
    if (description.includes('制服')) {
      return 'uniform';
    }
    if (description.includes('スーツ') || description.includes('フォーマル')) {
      return 'formal';
    }
    return 'casual';
  }
  
  /**
   * 髪型スタイルを抽出
   * @param {string} description - 説明文
   * @returns {string} 髪型スタイル
   */
  extractHairStyle(description) {
    if (description.includes('乱れ') || description.includes('ぼさぼさ')) {
      return 'messy';
    }
    if (description.includes('ロング')) {
      return 'long';
    }
    if (description.includes('ショート')) {
      return 'short';
    }
    return 'neat';
  }
  
  /**
   * 表情を抽出
   * @param {string} description - 説明文
   * @returns {string} 表情
   */
  extractExpression(description) {
    if (description.includes('眠そう')) {
      return 'sleepy';
    }
    if (description.includes('驚') || description.includes('びっくり')) {
      return 'surprised';
    }
    if (description.includes('笑') || description.includes('嬉し')) {
      return 'smiling';
    }
    if (description.includes('困') || description.includes('悩')) {
      return 'troubled';
    }
    if (description.includes('興味') || description.includes('関心')) {
      return 'interested';
    }
    if (description.includes('リラックス') || description.includes('穏やか')) {
      return 'relaxed';
    }
    return 'neutral';
  }
  
  /**
   * ポーズを抽出
   * @param {string} description - 説明文
   * @returns {string} ポーズ
   */
  extractPose(description) {
    // より詳細なポーズ解析
    if (description.includes('ベッドから') && description.includes('起こし')) {
      return 'sitting-up';
    }
    if (description.includes('カーテン') && description.includes('開')) {
      return 'opening-curtain';
    }
    if (description.includes('窓') && description.includes('見')) {
      return 'looking';
    }
    if (description.includes('振り向') || description.includes('視線')) {
      return 'looking';
    }
    
    // 基本的なポーズ
    return this.extractAttribute(description, this.characterAttributeMap.pose) || 'standing';
  }
  
  /**
   * 服装の色を抽出
   * @param {string} description - 説明文
   * @returns {Object} 服装の色情報
   */
  extractClothingColor(description) {
    const colors = {
      shirt: '#FFB6C1', // デフォルト（パジャマ色）
      pants: '#FFB6C1'
    };
    
    // 色の情報を解析
    if (description.includes('白')) {
      colors.shirt = '#FFFFFF';
    } else if (description.includes('青')) {
      colors.shirt = '#4444FF';
    } else if (description.includes('赤')) {
      colors.shirt = '#FF4444';
    }
    
    return colors;
  }
  
  /**
   * 肌の色調を抽出
   * @param {string} description - 説明文
   * @returns {string} 肌の色
   */
  extractSkinTone(description) {
    // デフォルトの肌色
    return '#FFDBAC';
  }
  
  /**
   * 顔の詳細を抽出
   * @param {string} description - 説明文
   * @returns {Object} 顔の詳細情報
   */
  extractFacialDetails(description) {
    const details = {
      eyeCondition: 'normal',
      mouthExpression: 'neutral',
      overall: 'normal'
    };
    
    if (description.includes('目を細め')) {
      details.eyeCondition = 'squinting';
    }
    if (description.includes('眠そう')) {
      details.eyeCondition = 'sleepy';
      details.overall = 'drowsy';
    }
    
    return details;
  }
  
  /**
   * 体の言語を抽出
   * @param {string} description - 説明文
   * @returns {string} 体の言語
   */
  extractBodyLanguage(description) {
    if (description.includes('起こし')) {
      return 'waking-up';
    }
    if (description.includes('視線')) {
      return 'focused-attention';
    }
    if (description.includes('リラックス')) {
      return 'relaxed';
    }
    return 'neutral';
  }

  /**
   * 照明の色を決定するヘルパー関数
   * @param {string} description - 背景の説明
   * @returns {string} 照明の色コード
   */
  determineLightColor(description) {
    if (description.includes('朝の光') || description.includes('朝')) {
      return '#FFF8DC'; // 朝の優しい光
    }
    if (description.includes('陽射し')) {
      return '#FFE4B5'; // 暖かい陽射し
    }
    if (description.includes('夕')) return '#FF8C69';
    if (description.includes('夜')) return '#4682B4';
    if (description.includes('暖かい') || description.includes('優しく')) {
      return '#FFEAA7'; // 暖かい光
    }
    if (description.includes('冷た')) return '#B8C6DB';
    return '#FFFFFF'; // デフォルト白色
  }

  /**
   * 照明の強度を決定するヘルパー関数
   * @param {string} description - 背景の説明
   * @returns {number} 照明の強度 (0.0-2.0)
   */
  determineLightIntensity(description) {
    if (description.includes('朝の光') && description.includes('優しく')) {
      return 0.9; // 朝の優しい光
    }
    if (description.includes('明るい') || description.includes('陽射し')) return 1.2;
    if (description.includes('暗い') || description.includes('夜')) return 0.4;
    if (description.includes('優しく') || description.includes('穏やか')) return 0.8;
    if (description.includes('強い') || description.includes('眩し')) return 1.5;
    if (description.includes('照らし')) return 1.0;
    return 0.9; // デフォルト強度（少し抑えめ）
  }

  /**
   * 文脈を抽出するヘルパー関数
   * @param {string} text - 全体テキスト
   * @param {string} keyword - キーワード
   * @returns {string} キーワード周辺の文脈
   */
  extractContext(text, keyword) {
    const index = text.indexOf(keyword);
    if (index === -1) return '';
    
    const start = Math.max(0, index - 10);
    const end = Math.min(text.length, index + keyword.length + 10);
    return text.substring(start, end);
  }

  /**
   * オブジェクトの配置を決定するヘルパー関数
   * @param {string} text - 構図テキスト
   * @param {string} object - オブジェクト名
   * @returns {Object} 配置情報
   */
  determineObjectPlacement(text, object) {
    const placement = {
      depth: 'midground',
      position: { x: 0, y: 0, z: 0 }
    };

    // 奥行きを判定
    if (text.includes('手前') || text.includes('前')) {
      placement.depth = 'foreground';
      placement.position.z = 2;
    } else if (text.includes('奥') || text.includes('背景')) {
      placement.depth = 'background';
      placement.position.z = -2;
    }

    // 左右位置を判定
    if (text.includes('左')) {
      placement.position.x = -2;
    } else if (text.includes('右')) {
      placement.position.x = 2;
    }

    // 上下位置を判定
    if (text.includes('上') || text.includes('天井')) {
      placement.position.y = 2;
    } else if (text.includes('下') || text.includes('床')) {
      placement.position.y = -2;
    }

    return placement;
  }

  /**
   * ポストプロセッシング設定を取得
   * @param {string} visualEffects - 視覚効果
   * @returns {Object} ポストプロセッシング設定
   */
  getPostProcessingSettings(visualEffects) {
    const settings = {
      bloom: false,
      blur: false,
      colorGrading: false,
      vignette: false
    };

    switch (visualEffects) {
      case 'emotional':
        settings.bloom = true;
        settings.colorGrading = true;
        break;
      case 'past':
        settings.blur = true;
        settings.vignette = true;
        settings.colorGrading = true;
        break;
      case 'deformed':
        settings.colorGrading = true;
        break;
    }

    return settings;
  }

  /**
   * アニメーション設定を取得
   * @param {string} visualEffects - 視覚効果
   * @returns {Object} アニメーション設定
   */
  getAnimationSettings(visualEffects) {
    const settings = {
      enabled: false,
      type: 'none',
      duration: 1.0,
      easing: 'linear'
    };

    if (visualEffects === 'emotional') {
      settings.enabled = true;
      settings.type = 'gentle-sway';
      settings.duration = 2.0;
      settings.easing = 'ease-in-out';
    }

    return settings;
  }

  /**
   * Flow3入力データを検証する
   * @param {Object} flow3Data - Flow3データ
   * @throws {Error} 検証失敗時
   */
  validateFlow3Input(flow3Data) {
    if (!flow3Data || typeof flow3Data !== 'object') {
      throw new Error('Flow3データが存在しないか、オブジェクトではありません');
    }

    const requiredFields = ['cameraAngle', 'composition', 'visualEffects', 'characterDetails', 'background'];
    for (const field of requiredFields) {
      if (!(field in flow3Data)) {
        throw new Error(`必須フィールド '${field}' がFlow3データに存在しません`);
      }
    }

    // カメラ角度の検証
    const validCameraAngles = ['near', 'middle', 'far'];
    if (!validCameraAngles.includes(flow3Data.cameraAngle)) {
      throw new Error(`無効なカメラ角度: ${flow3Data.cameraAngle}. 有効な値: ${validCameraAngles.join(', ')}`);
    }

    // 視覚効果の検証
    const validVisualEffects = ['normal', 'emotional', 'deformed', 'past'];
    if (!validVisualEffects.includes(flow3Data.visualEffects)) {
      throw new Error(`無効な視覚効果: ${flow3Data.visualEffects}. 有効な値: ${validVisualEffects.join(', ')}`);
    }

    // 背景フラグの検証
    if (![0, 1].includes(flow3Data.background)) {
      throw new Error(`無効な背景フラグ: ${flow3Data.background}. 有効な値: 0, 1`);
    }
  }

  /**
   * マッピング結果を検証する
   * @param {Object} mappedData - マッピング結果
   * @returns {boolean} 検証結果
   */
  validateMappingResult(mappedData) {
    try {
      // 必須フィールドの確認
      const requiredFields = ['camera', 'character', 'background', 'composition', 'visualEffects'];
      for (const field of requiredFields) {
        if (!mappedData[field]) {
          throw new Error(`必須フィールド '${field}' が存在しません`);
        }
      }

      // カメラ設定の確認
      if (!mappedData.camera.position || !mappedData.camera.fov) {
        throw new Error('カメラ設定が不完全です');
      }

      // キャラクター設定の確認
      if (mappedData.character.visible && !mappedData.character.pose) {
        throw new Error('キャラクターが表示されるのにポーズが設定されていません');
      }

      // 数値範囲の確認
      if (mappedData.camera.fov < 10 || mappedData.camera.fov > 120) {
        throw new Error(`カメラのFOVが範囲外です: ${mappedData.camera.fov}. 有効範囲: 10-120`);
      }

      console.log('✅ マッピング結果の検証成功');
      return true;
    } catch (error) {
      console.error('❌ マッピング結果の検証失敗:', error.message);
      throw error;
    }
  }

  /**
   * マッピング統計情報を生成
   * @param {Array} mappingResults - マッピング結果の配列
   * @returns {Object} 統計情報
   */
  generateMappingStatistics(mappingResults) {
    const stats = {
      totalPanels: mappingResults.length,
      cameraDistribution: { near: 0, middle: 0, far: 0 },
      visualEffectsDistribution: { normal: 0, emotional: 0, deformed: 0, past: 0 },
      charactersVisible: 0,
      backgroundsVisible: 0,
      averageCompositionComplexity: 0
    };

    mappingResults.forEach(result => {
      if (!result) return; // null結果をスキップ

      // カメラ角度の分布
      const cameraType = result.camera.originalAngle;
      if (stats.cameraDistribution[cameraType] !== undefined) {
        stats.cameraDistribution[cameraType]++;
      }

      // 視覚効果の分布
      const effectType = result.visualEffects.originalEffect;
      if (stats.visualEffectsDistribution[effectType] !== undefined) {
        stats.visualEffectsDistribution[effectType]++;
      }

      // キャラクター・背景の可視性
      if (result.character.visible) stats.charactersVisible++;
      if (result.background.visible) stats.backgroundsVisible++;

      // 構図の複雑度（オブジェクト数で測定）
      const compositionComplexity = 
        result.composition.foregroundObjects.length +
        result.composition.midgroundObjects.length +
        result.composition.backgroundObjects.length;
      stats.averageCompositionComplexity += compositionComplexity;
    });

    stats.averageCompositionComplexity = 
      (stats.averageCompositionComplexity / mappingResults.filter(r => r !== null).length).toFixed(2);

    return stats;
  }
}

module.exports = DifyTo3DMapper;