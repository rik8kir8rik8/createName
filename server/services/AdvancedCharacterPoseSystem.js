/**
 * 高度キャラクターポーズシステム
 * sample.png相当の自然な人体表現・表情・手の動きを実現
 */
class AdvancedCharacterPoseSystem {
  constructor() {
    // 人体比率定義（8頭身基準）
    this.humanProportions = {
      head: { ratio: 1.0, center: { x: 0, y: 7 } },
      neck: { ratio: 0.3, center: { x: 0, y: 6.7 } },
      torso: { ratio: 2.5, center: { x: 0, y: 5.25 } },
      arms: { 
        upper: { ratio: 1.5, width: 0.4 },
        lower: { ratio: 1.2, width: 0.3 },
        hand: { ratio: 0.8, width: 0.25 }
      },
      legs: {
        upper: { ratio: 2.0, width: 0.6 },
        lower: { ratio: 2.0, width: 0.4 },
        foot: { ratio: 0.8, width: 0.3 }
      }
    };

    // ボーン構造定義
    this.skeletonStructure = {
      head: { parent: 'neck', joints: ['jaw', 'eyeL', 'eyeR'] },
      neck: { parent: 'spine', joints: ['head'] },
      spine: { parent: null, joints: ['neck', 'shoulderL', 'shoulderR', 'hip'] },
      shoulderL: { parent: 'spine', joints: ['upperArmL'] },
      shoulderR: { parent: 'spine', joints: ['upperArmR'] },
      upperArmL: { parent: 'shoulderL', joints: ['lowerArmL'] },
      upperArmR: { parent: 'shoulderR', joints: ['lowerArmR'] },
      lowerArmL: { parent: 'upperArmL', joints: ['handL'] },
      lowerArmR: { parent: 'upperArmR', joints: ['handR'] },
      handL: { parent: 'lowerArmL', joints: ['fingersL'] },
      handR: { parent: 'lowerArmR', joints: ['fingersR'] },
      hip: { parent: 'spine', joints: ['upperLegL', 'upperLegR'] },
      upperLegL: { parent: 'hip', joints: ['lowerLegL'] },
      upperLegR: { parent: 'hip', joints: ['lowerLegR'] },
      lowerLegL: { parent: 'upperLegL', joints: ['footL'] },
      lowerLegR: { parent: 'upperLegR', joints: ['footR'] },
      footL: { parent: 'lowerLegL', joints: [] },
      footR: { parent: 'lowerLegR', joints: [] }
    };

    // ポーズライブラリ（sample.png参考）
    this.poseLibrary = {
      // sample.png 1コマ目: 考え込むポーズ
      'thinking': {
        description: '手を顎に当てて考え込む',
        keyframes: {
          spine: { rotation: 0, position: { x: 0, y: 0, z: 0 } },
          head: { rotation: -10, position: { x: 0, y: 0, z: 0 } },
          upperArmR: { rotation: -45, position: { x: 0.2, y: 0, z: 0 } },
          lowerArmR: { rotation: -60, position: { x: 0.3, y: 0.2, z: 0 } },
          handR: { rotation: 0, position: { x: 0.5, y: 1.2, z: 0.2 }, gesture: 'chin_touch' },
          upperArmL: { rotation: 20, position: { x: -0.1, y: 0, z: 0 } },
          lowerArmL: { rotation: 30, position: { x: -0.2, y: -0.1, z: 0 } },
          handL: { rotation: 0, position: { x: -0.3, y: 0.5, z: 0 }, gesture: 'relaxed' }
        },
        facialExpression: {
          eyebrows: 'slightly_furrowed',
          eyes: 'contemplative',
          mouth: 'neutral_closed'
        }
      },

      // sample.png 2コマ目: 驚きのポーズ
      'surprised': {
        description: '驚いて目を見開く',
        keyframes: {
          spine: { rotation: -5, position: { x: 0, y: 0, z: 0 } },
          head: { rotation: 5, position: { x: 0, y: 0.1, z: 0 } },
          upperArmL: { rotation: -30, position: { x: -0.3, y: 0.2, z: 0 } },
          lowerArmL: { rotation: -40, position: { x: -0.4, y: 0.3, z: 0 } },
          handL: { rotation: 0, position: { x: -0.6, y: 1.0, z: 0 }, gesture: 'open_palm' },
          upperArmR: { rotation: -25, position: { x: 0.2, y: 0.1, z: 0 } },
          lowerArmR: { rotation: -35, position: { x: 0.3, y: 0.2, z: 0 } },
          handR: { rotation: 0, position: { x: 0.5, y: 0.8, z: 0 }, gesture: 'open_palm' }
        },
        facialExpression: {
          eyebrows: 'raised_high',
          eyes: 'wide_open',
          mouth: 'open_oval'
        },
        effectsNeeded: ['speed_lines', 'emphasis_marks']
      },

      // sample.png 3コマ目: 座り込みポーズ
      'sitting_floor': {
        description: '床に座り込んでリラックス',
        keyframes: {
          spine: { rotation: 10, position: { x: 0, y: -1.5, z: 0 } },
          head: { rotation: 0, position: { x: 0, y: 0, z: 0 } },
          upperLegL: { rotation: 90, position: { x: -0.3, y: -2, z: 0.5 } },
          lowerLegL: { rotation: 45, position: { x: -0.5, y: -2.5, z: 1.0 } },
          upperLegR: { rotation: 90, position: { x: 0.3, y: -2, z: 0.5 } },
          lowerLegR: { rotation: 45, position: { x: 0.5, y: -2.5, z: 1.0 } },
          upperArmL: { rotation: 15, position: { x: -0.2, y: 0, z: 0 } },
          lowerArmL: { rotation: 20, position: { x: -0.3, y: -0.2, z: 0 } },
          handL: { rotation: 0, position: { x: -0.4, y: -0.3, z: 0.3 }, gesture: 'resting_on_knee' },
          upperArmR: { rotation: 10, position: { x: 0.1, y: 0, z: 0 } },
          lowerArmR: { rotation: 15, position: { x: 0.2, y: -0.1, z: 0 } },
          handR: { rotation: 0, position: { x: 0.3, y: -0.2, z: 0.3 }, gesture: 'resting_on_knee' }
        },
        facialExpression: {
          eyebrows: 'relaxed',
          eyes: 'calm',
          mouth: 'slight_smile'
        }
      },

      // sample.png 4コマ目: 微笑みクローズアップ
      'smiling_closeup': {
        description: '穏やかな微笑み',
        keyframes: {
          spine: { rotation: 0, position: { x: 0, y: 0, z: 0 } },
          head: { rotation: 0, position: { x: 0, y: 0, z: 0 } },
          // 顔のクローズアップなので体の動きは最小限
          upperArmL: { rotation: 5, position: { x: -0.1, y: 0, z: 0 } },
          upperArmR: { rotation: -5, position: { x: 0.1, y: 0, z: 0 } }
        },
        facialExpression: {
          eyebrows: 'relaxed',
          eyes: 'gentle',
          mouth: 'warm_smile'
        },
        focusArea: 'face' // このポーズは顔にフォーカス
      },

      // sample.png 5コマ目: 立ち上がる動作
      'standing_up': {
        description: '床から立ち上がる途中',
        keyframes: {
          spine: { rotation: 15, position: { x: 0, y: -0.8, z: 0 } },
          head: { rotation: -5, position: { x: 0, y: 0, z: 0 } },
          upperLegL: { rotation: 60, position: { x: -0.2, y: -1.5, z: 0.3 } },
          lowerLegL: { rotation: 30, position: { x: -0.3, y: -2, z: 0.6 } },
          upperLegR: { rotation: 75, position: { x: 0.2, y: -1.3, z: 0.2 } },
          lowerLegR: { rotation: 20, position: { x: 0.3, y: -1.8, z: 0.5 } },
          upperArmL: { rotation: -20, position: { x: -0.3, y: 0.1, z: 0 } },
          lowerArmL: { rotation: -30, position: { x: -0.4, y: 0.2, z: 0 } },
          handL: { rotation: 0, position: { x: -0.5, y: 0.3, z: 0 }, gesture: 'balancing' },
          upperArmR: { rotation: -15, position: { x: 0.2, y: 0.1, z: 0 } },
          lowerArmR: { rotation: -25, position: { x: 0.3, y: 0.2, z: 0 } },
          handR: { rotation: 0, position: { x: 0.4, y: 0.3, z: 0 }, gesture: 'balancing' }
        },
        facialExpression: {
          eyebrows: 'slightly_raised',
          eyes: 'focused',
          mouth: 'slight_open'
        },
        motionLines: true // 動きを表現するモーションライン
      }
    };

    // 表情ライブラリ
    this.facialExpressions = {
      // 眉毛のパターン
      eyebrows: {
        'relaxed': { angle: 0, height: 0, curve: 'gentle' },
        'slightly_furrowed': { angle: -5, height: -2, curve: 'slight_v' },
        'raised_high': { angle: 15, height: 8, curve: 'arch' },
        'slightly_raised': { angle: 5, height: 3, curve: 'gentle_arch' }
      },

      // 目のパターン
      eyes: {
        'contemplative': { openness: 0.7, size: 1.0, focus: 'downward' },
        'wide_open': { openness: 1.2, size: 1.1, focus: 'forward', highlights: true },
        'calm': { openness: 0.8, size: 1.0, focus: 'relaxed' },
        'gentle': { openness: 0.9, size: 1.0, focus: 'forward', warmth: true },
        'focused': { openness: 1.0, size: 1.0, focus: 'forward', intensity: true }
      },

      // 口のパターン
      mouth: {
        'neutral_closed': { openness: 0, curve: 0, width: 1.0 },
        'open_oval': { openness: 0.6, curve: 0, width: 0.8, shape: 'oval' },
        'slight_smile': { openness: 0, curve: 3, width: 1.1 },
        'warm_smile': { openness: 0.1, curve: 8, width: 1.2 },
        'slight_open': { openness: 0.2, curve: 0, width: 1.0 }
      }
    };

    // 手のジェスチャーライブラリ
    this.handGestures = {
      'chin_touch': {
        fingers: {
          thumb: { bend: 20, spread: 10 },
          index: { bend: 30, spread: 5 },
          middle: { bend: 35, spread: 0 },
          ring: { bend: 40, spread: -5 },
          pinky: { bend: 45, spread: -10 }
        },
        wrist: { rotation: -15 },
        contact: 'chin'
      },

      'open_palm': {
        fingers: {
          thumb: { bend: 5, spread: 25 },
          index: { bend: 0, spread: 15 },
          middle: { bend: 0, spread: 5 },
          ring: { bend: 0, spread: -5 },
          pinky: { bend: 5, spread: -15 }
        },
        wrist: { rotation: 0 }
      },

      'relaxed': {
        fingers: {
          thumb: { bend: 15, spread: 15 },
          index: { bend: 20, spread: 10 },
          middle: { bend: 25, spread: 5 },
          ring: { bend: 30, spread: 0 },
          pinky: { bend: 35, spread: -5 }
        },
        wrist: { rotation: 5 }
      },

      'resting_on_knee': {
        fingers: {
          thumb: { bend: 25, spread: 20 },
          index: { bend: 30, spread: 10 },
          middle: { bend: 35, spread: 5 },
          ring: { bend: 40, spread: 0 },
          pinky: { bend: 45, spread: -5 }
        },
        wrist: { rotation: -10 },
        contact: 'knee'
      },

      'balancing': {
        fingers: {
          thumb: { bend: 10, spread: 20 },
          index: { bend: 15, spread: 15 },
          middle: { bend: 10, spread: 5 },
          ring: { bend: 15, spread: -5 },
          pinky: { bend: 20, spread: -15 }
        },
        wrist: { rotation: 10 }
      }
    };
  }

  /**
   * ポーズ名から自然な人体ポーズを生成
   * @param {string} poseName - ポーズ名
   * @param {Object} options - カスタマイズオプション
   * @returns {Object} 人体ポーズデータ
   */
  generateNaturalPose(poseName, options = {}) {
    try {
      console.log(`🎭 自然なポーズ生成開始: ${poseName}`);

      // ベースポーズの取得
      const basePose = this.poseLibrary[poseName];
      if (!basePose) {
        console.warn(`⚠️ ポーズ "${poseName}" が見つかりません。デフォルトポーズを使用`);
        return this.generateDefaultPose();
      }

      // カスタマイズ適用
      const customizedPose = this.applyPoseCustomization(basePose, options);

      // 人体プロポーション計算
      const proportionalPose = this.calculateHumanProportions(customizedPose);

      // 3D空間座標変換
      const spatial3DPose = this.convertToSpatialCoordinates(proportionalPose, options);

      console.log(`✅ ポーズ生成完了: ${poseName}`);
      return {
        poseName: poseName,
        description: basePose.description,
        skeleton: spatial3DPose.skeleton,
        facialExpression: spatial3DPose.facialExpression,
        handGestures: spatial3DPose.handGestures,
        effects: spatial3DPose.effects,
        metadata: {
          generatedAt: new Date().toISOString(),
          basePose: poseName,
          customizations: options
        }
      };
    } catch (error) {
      console.error('❌ ポーズ生成エラー:', error);
      throw new Error(`ポーズ生成失敗: ${error.message}`);
    }
  }

  /**
   * ポーズのカスタマイズ適用
   * @param {Object} basePose - ベースポーズ
   * @param {Object} options - カスタマイズオプション
   * @returns {Object} カスタマイズ済みポーズ
   */
  applyPoseCustomization(basePose, options) {
    const customized = JSON.parse(JSON.stringify(basePose)); // ディープコピー

    // 感情による調整
    if (options.emotion) {
      customized.facialExpression = this.adjustForEmotion(
        customized.facialExpression, 
        options.emotion
      );
    }

    // 体型による調整
    if (options.bodyType) {
      customized.keyframes = this.adjustForBodyType(
        customized.keyframes, 
        options.bodyType
      );
    }

    // 年齢による調整
    if (options.age) {
      customized.keyframes = this.adjustForAge(
        customized.keyframes, 
        options.age
      );
    }

    return customized;
  }

  /**
   * 感情に基づく表情調整
   * @param {Object} baseFacialExpression - ベース表情
   * @param {string} emotion - 感情
   * @returns {Object} 調整済み表情
   */
  adjustForEmotion(baseFacialExpression, emotion) {
    const adjusted = { ...baseFacialExpression };

    switch (emotion) {
      case 'happy':
        adjusted.eyebrows = 'relaxed';
        adjusted.eyes = 'gentle';
        adjusted.mouth = 'warm_smile';
        break;
      case 'sad':
        adjusted.eyebrows = 'slightly_furrowed';
        adjusted.eyes = 'contemplative';
        adjusted.mouth = 'neutral_closed';
        break;
      case 'angry':
        adjusted.eyebrows = 'furrowed_deep';
        adjusted.eyes = 'intense';
        adjusted.mouth = 'tight_line';
        break;
      case 'surprised':
        adjusted.eyebrows = 'raised_high';
        adjusted.eyes = 'wide_open';
        adjusted.mouth = 'open_oval';
        break;
    }

    return adjusted;
  }

  /**
   * 体型による姿勢調整
   * @param {Object} keyframes - キーフレーム
   * @param {string} bodyType - 体型
   * @returns {Object} 調整済みキーフレーム
   */
  adjustForBodyType(keyframes, bodyType) {
    const adjusted = JSON.parse(JSON.stringify(keyframes));

    switch (bodyType) {
      case 'slim':
        // 細身の場合は関節角度を少し鋭く
        Object.keys(adjusted).forEach(bone => {
          if (adjusted[bone].rotation) {
            adjusted[bone].rotation *= 1.1;
          }
        });
        break;
      case 'stocky':
        // がっしり体型は関節角度を穏やかに
        Object.keys(adjusted).forEach(bone => {
          if (adjusted[bone].rotation) {
            adjusted[bone].rotation *= 0.9;
          }
        });
        break;
    }

    return adjusted;
  }

  /**
   * 年齢による姿勢調整
   * @param {Object} keyframes - キーフレーム
   * @param {number} age - 年齢
   * @returns {Object} 調整済みキーフレーム
   */
  adjustForAge(keyframes, age) {
    const adjusted = JSON.parse(JSON.stringify(keyframes));

    if (age > 50) {
      // 高齢の場合は背中を少し丸める
      if (adjusted.spine) {
        adjusted.spine.rotation += 5;
        adjusted.spine.position.y -= 0.1;
      }
    } else if (age < 20) {
      // 若い場合は姿勢を真っ直ぐに
      if (adjusted.spine) {
        adjusted.spine.rotation -= 2;
      }
    }

    return adjusted;
  }

  /**
   * 人体プロポーション計算
   * @param {Object} pose - ポーズデータ
   * @returns {Object} プロポーション適用済みポーズ
   */
  calculateHumanProportions(pose) {
    const proportional = JSON.parse(JSON.stringify(pose));

    // 各ボーンに人体比率を適用
    Object.keys(proportional.keyframes).forEach(boneName => {
      const bone = proportional.keyframes[boneName];
      const proportion = this.getBodyPartProportion(boneName);
      
      if (proportion) {
        // サイズと比率の調整
        bone.scale = proportion.ratio;
        bone.proportionalSize = proportion;
      }
    });

    return proportional;
  }

  /**
   * 身体部位の比率取得
   * @param {string} boneName - ボーン名
   * @returns {Object} 比率情報
   */
  getBodyPartProportion(boneName) {
    if (boneName.includes('head')) {
      return this.humanProportions.head;
    } else if (boneName.includes('torso') || boneName.includes('spine')) {
      return this.humanProportions.torso;
    } else if (boneName.includes('Arm')) {
      if (boneName.includes('upper')) {
        return this.humanProportions.arms.upper;
      } else if (boneName.includes('lower')) {
        return this.humanProportions.arms.lower;
      }
    } else if (boneName.includes('Leg')) {
      if (boneName.includes('upper')) {
        return this.humanProportions.legs.upper;
      } else if (boneName.includes('lower')) {
        return this.humanProportions.legs.lower;
      }
    }
    return null;
  }

  /**
   * 3D空間座標への変換
   * @param {Object} pose - ポーズデータ
   * @param {Object} options - オプション
   * @returns {Object} 3D座標ポーズ
   */
  convertToSpatialCoordinates(pose, options = {}) {
    const scale = options.scale || 1.0;
    const offset = options.offset || { x: 0, y: 0, z: 0 };

    const spatialPose = {
      skeleton: {},
      facialExpression: pose.facialExpression,
      handGestures: {},
      effects: []
    };

    // 各ボーンの3D座標計算
    Object.keys(pose.keyframes).forEach(boneName => {
      const bone = pose.keyframes[boneName];
      
      spatialPose.skeleton[boneName] = {
        position: {
          x: (bone.position.x * scale) + offset.x,
          y: (bone.position.y * scale) + offset.y,
          z: (bone.position.z * scale) + offset.z
        },
        rotation: {
          x: bone.rotation || 0,
          y: 0,
          z: 0
        },
        scale: bone.scale || 1.0
      };
    });

    // 手のジェスチャー処理
    ['handL', 'handR'].forEach(handBone => {
      if (pose.keyframes[handBone] && pose.keyframes[handBone].gesture) {
        const gestureName = pose.keyframes[handBone].gesture;
        spatialPose.handGestures[handBone] = this.handGestures[gestureName];
      }
    });

    // 特殊効果の追加
    if (pose.effectsNeeded) {
      spatialPose.effects = pose.effectsNeeded;
    }

    return spatialPose;
  }

  /**
   * デフォルトポーズ生成
   * @returns {Object} デフォルトポーズ
   */
  generateDefaultPose() {
    return {
      poseName: 'default_standing',
      description: 'デフォルト立ちポーズ',
      skeleton: {
        spine: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1.0 },
        head: { position: { x: 0, y: 7, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1.0 }
      },
      facialExpression: {
        eyebrows: 'relaxed',
        eyes: 'calm',
        mouth: 'neutral_closed'
      },
      handGestures: {},
      effects: []
    };
  }

  /**
   * 複数ポーズのバッチ生成
   * @param {Array} poseRequests - ポーズリクエスト配列
   * @returns {Array} 生成されたポーズ配列
   */
  batchGeneratePoses(poseRequests) {
    console.log(`🎭 バッチポーズ生成開始: ${poseRequests.length}件`);
    
    const results = [];
    
    poseRequests.forEach((request, index) => {
      try {
        const pose = this.generateNaturalPose(request.poseName, request.options);
        results.push(pose);
        console.log(`✅ [${index + 1}/${poseRequests.length}] ${request.poseName} 生成完了`);
      } catch (error) {
        console.error(`❌ [${index + 1}/${poseRequests.length}] ${request.poseName} 生成失敗:`, error.message);
        results.push(null);
      }
    });

    console.log(`🎭 バッチポーズ生成完了: ${results.filter(r => r !== null).length}/${poseRequests.length}件成功`);
    return results;
  }
}

module.exports = AdvancedCharacterPoseSystem;