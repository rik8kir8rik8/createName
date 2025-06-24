/**
 * Procedural 3D Character Generation Service
 * Three.jsのプリミティブを使用してプロシージャル3Dキャラクターを生成
 */

// Three.jsのサーバーサイド対応のため、headlessな実装を想定
// 実際の環境では three.js, jsdom, canvas などのセットアップが必要

class Procedural3DCharacterService {
  constructor() {
    this.bodyProportions = {
      male: {
        headRadius: 1.0,
        torsoWidth: 2.0,
        torsoHeight: 3.0,
        torsoDepth: 1.0,
        armLength: 2.5,
        armRadius: 0.3,
        legLength: 3.5,
        legRadius: 0.4,
        shoulderWidth: 2.2,
        hipWidth: 1.8
      },
      female: {
        headRadius: 0.95,
        torsoWidth: 1.8,
        torsoHeight: 2.8,
        torsoDepth: 0.9,
        armLength: 2.3,
        armRadius: 0.25,
        legLength: 3.2,
        legRadius: 0.35,
        shoulderWidth: 1.9,
        hipWidth: 2.0
      }
    };

    this.poses = {
      standing: {
        name: 'standing',
        leftArm: { rotation: [0, 0, -0.2] },
        rightArm: { rotation: [0, 0, 0.2] },
        leftLeg: { rotation: [0, 0, 0] },
        rightLeg: { rotation: [0, 0, 0] },
        torso: { rotation: [0, 0, 0] },
        head: { rotation: [0, 0, 0] }
      },
      sitting: {
        name: 'sitting',
        leftArm: { rotation: [0, 0, -0.1] },
        rightArm: { rotation: [0, 0, 0.1] },
        leftLeg: { rotation: [-1.5, 0, 0] },
        rightLeg: { rotation: [-1.5, 0, 0] },
        torso: { rotation: [0.1, 0, 0] },
        head: { rotation: [0, 0, 0] }
      },
      walking: {
        name: 'walking',
        leftArm: { rotation: [0.5, 0, -0.1] },
        rightArm: { rotation: [-0.5, 0, 0.1] },
        leftLeg: { rotation: [0.3, 0, 0] },
        rightLeg: { rotation: [-0.3, 0, 0] },
        torso: { rotation: [0.05, 0.1, 0] },
        head: { rotation: [0, 0, 0] }
      },
      // === 新規追加ポーズ ===
      'sitting-up': {
        name: 'sitting-up',
        description: 'ベッドから体を起こしている',
        leftArm: { rotation: [-0.3, 0, -0.5] }, // 後ろ手で支える
        rightArm: { rotation: [-0.3, 0, 0.5] },
        leftLeg: { rotation: [-0.8, 0, 0] }, // 膝を曲げる
        rightLeg: { rotation: [-0.8, 0, 0] },
        torso: { rotation: [-0.5, 0, 0] }, // 前傾姿勢
        head: { rotation: [0.2, 0, 0] } // やや上向き
      },
      looking: {
        name: 'looking',
        description: '窓を見ている・振り向いている',
        leftArm: { rotation: [0, 0, -0.1] },
        rightArm: { rotation: [0, 0, 0.1] },
        leftLeg: { rotation: [0, 0, 0] },
        rightLeg: { rotation: [0, 0, 0] },
        torso: { rotation: [0, 0.5, 0] }, // 体を回転
        head: { rotation: [0, 0.7, 0] } // 頭を振り向く
      },
      'opening-curtain': {
        name: 'opening-curtain',
        description: 'カーテンを開けている',
        leftArm: { rotation: [1.2, 0, -0.3] }, // 手を上げる
        rightArm: { rotation: [1.2, 0, 0.3] },
        leftLeg: { rotation: [0, 0, 0] },
        rightLeg: { rotation: [0, 0, 0] },
        torso: { rotation: [0, 0, 0] },
        head: { rotation: [0.3, 0, 0] } // 上を見上げる
      },
      reaching: {
        name: 'reaching',
        description: '手を伸ばしている',
        leftArm: { rotation: [0.8, 0, -0.2] },
        rightArm: { rotation: [0.8, 0, 0.2] },
        leftLeg: { rotation: [0, 0, 0] },
        rightLeg: { rotation: [0, 0, 0] },
        torso: { rotation: [0.2, 0, 0] },
        head: { rotation: [0.1, 0, 0] }
      },
      lying: {
        name: 'lying',
        description: '横になっている',
        leftArm: { rotation: [0, 0, -1.5] },
        rightArm: { rotation: [0, 0, 1.5] },
        leftLeg: { rotation: [0, 0, 0] },
        rightLeg: { rotation: [0, 0, 0] },
        torso: { rotation: [1.5, 0, 0] }, // 横倒し
        head: { rotation: [1.5, 0, 0] }
      },
      waving: {
        name: 'waving',
        description: '手を振っている',
        leftArm: { rotation: [1.5, 0, -0.5] },
        rightArm: { rotation: [0, 0, 0.2] },
        leftLeg: { rotation: [0, 0, 0] },
        rightLeg: { rotation: [0, 0, 0] },
        torso: { rotation: [0, 0, 0] },
        head: { rotation: [0, 0, 0] }
      },
      thinking: {
        name: 'thinking',
        description: '考えているポーズ',
        leftArm: { rotation: [0, 0, -0.3] },
        rightArm: { rotation: [1.2, 0, 0.5] }, // 手を顎に
        leftLeg: { rotation: [0, 0, 0] },
        rightLeg: { rotation: [0, 0, 0] },
        torso: { rotation: [0, 0, 0] },
        head: { rotation: [-0.2, 0, 0] } // 少し下向き
      }
    };

    this.emotions = {
      happy: {
        eyeScale: 1.1,
        mouthCurve: 0.3,
        eyebrowAngle: 0.1,
        eyeOpenness: 1.0
      },
      sad: {
        eyeScale: 0.9,
        mouthCurve: -0.3,
        eyebrowAngle: -0.2,
        eyeOpenness: 0.7
      },
      neutral: {
        eyeScale: 1.0,
        mouthCurve: 0,
        eyebrowAngle: 0,
        eyeOpenness: 1.0
      },
      // === 新規追加表情 ===
      sleepy: {
        eyeScale: 0.6,
        mouthCurve: -0.1,
        eyebrowAngle: -0.1,
        eyeOpenness: 0.3, // 目を細める
        description: '眠そうな表情'
      },
      surprised: {
        eyeScale: 1.3,
        mouthCurve: 0.1,
        eyebrowAngle: 0.3,
        eyeOpenness: 1.2,
        description: '驚いた表情'
      },
      angry: {
        eyeScale: 1.0,
        mouthCurve: -0.4,
        eyebrowAngle: -0.4,
        eyeOpenness: 0.8,
        description: '怒った表情'
      },
      smiling: {
        eyeScale: 1.0,
        mouthCurve: 0.5,
        eyebrowAngle: 0.2,
        eyeOpenness: 0.9,
        description: '微笑んでいる表情'
      },
      troubled: {
        eyeScale: 0.9,
        mouthCurve: -0.2,
        eyebrowAngle: -0.3,
        eyeOpenness: 0.8,
        description: '困った表情'
      },
      interested: {
        eyeScale: 1.1,
        mouthCurve: 0.1,
        eyebrowAngle: 0.2,
        eyeOpenness: 1.1,
        description: '興味深そうな表情'
      },
      relaxed: {
        eyeScale: 0.9,
        mouthCurve: 0.2,
        eyebrowAngle: 0.0,
        eyeOpenness: 0.8,
        description: 'リラックスした表情'
      }
    };

    this.clothingStyles = {
      // === 服装スタイル定義 ===
      pajamas: {
        shirt: { color: '#FFB6C1', pattern: 'striped', material: 'soft' },
        pants: { color: '#FFB6C1', pattern: 'striped', material: 'soft' },
        description: 'パジャマ・寝間着'
      },
      casual: {
        shirt: { color: '#4444FF', pattern: 'solid', material: 'cotton' },
        pants: { color: '#222222', pattern: 'solid', material: 'denim' },
        description: 'カジュアルな服装'
      },
      formal: {
        shirt: { color: '#FFFFFF', pattern: 'solid', material: 'dress' },
        pants: { color: '#333333', pattern: 'solid', material: 'suit' },
        description: 'フォーマルな服装'
      },
      uniform: {
        shirt: { color: '#FFFFFF', pattern: 'solid', material: 'uniform' },
        pants: { color: '#000080', pattern: 'solid', material: 'uniform' },
        description: '制服'
      }
    };
    
    this.hairStyles = {
      // === 髪型スタイル定義 ===
      neat: {
        style: 'smooth',
        volume: 1.0,
        messiness: 0.0,
        color: '#4A4A4A',
        description: '整った髪型'
      },
      messy: {
        style: 'disheveled',
        volume: 1.3,
        messiness: 0.8,
        color: '#4A4A4A',
        description: '乱れた髪型'
      },
      short: {
        style: 'short',
        volume: 0.8,
        messiness: 0.2,
        color: '#4A4A4A',
        description: 'ショートヘア'
      },
      long: {
        style: 'long',
        volume: 1.2,
        messiness: 0.1,
        color: '#4A4A4A',
        description: 'ロングヘア'
      }
    };
  }

  /**
   * メインのキャラクター生成メソッド
   * @param {Object} params - 生成パラメータ
   * @param {string} params.gender - 性別 ('male' | 'female')
   * @param {string} params.pose - ポーズ ('standing' | 'sitting' | 'walking')
   * @param {string} params.emotion - 表情 ('happy' | 'sad' | 'neutral')
   * @param {Object|string} params.clothing - 服装スタイル ('pajamas', 'casual', 'formal', 'uniform') または詳細オブジェクト
   * @returns {Object} 3Dキャラクターオブジェクト構造
   */
  generateCharacter(params = {}) {
    const {
      gender = 'male',
      pose = 'standing',
      emotion = 'neutral',
      clothing = { shirt: 'blue', pants: 'black' }
    } = params;

    console.log(`🎨 Generating 3D character: ${gender}, ${pose}, ${emotion}`);

    try {
      // 基本骨格の作成
      const skeleton = this.createBasicSkeleton(gender);
      
      // 表情の適用
      this.applyEmotion(skeleton, emotion);
      
      // 服装スタイルの適用
      this.applyClothing(skeleton, clothing);
      
      // 髪型の適用（clothingオブジェクトにhairStyleが含まれている場合）
      const hairStyle = (typeof clothing === 'object' && clothing.hairStyle) || 'neat';
      this.applyHairStyle(skeleton, hairStyle);
      
      // ポーズの適用
      this.applyPose(skeleton, pose);

      // 最終的な3Dオブジェクト構造を返す
      return {
        type: 'Procedural3DCharacter',
        metadata: {
          gender,
          pose,
          emotion,
          clothing,
          generatedAt: new Date().toISOString()
        },
        structure: skeleton,
        boundingBox: this.calculateBoundingBox(skeleton),
        vertexCount: this.calculateVertexCount(skeleton),
        animations: this.generateBasicAnimations(skeleton, pose)
      };

    } catch (error) {
      console.error('❌ Character generation failed:', error);
      throw new Error(`Character generation failed: ${error.message}`);
    }
  }

  /**
   * 基本的な人体骨格を作成
   * @param {string} gender - 性別
   * @returns {Object} 骨格オブジェクト
   */
  createBasicSkeleton(gender) {
    console.log(`🦴 Creating basic skeleton for ${gender}`);
    
    const proportions = this.bodyProportions[gender];
    
    const skeleton = {
      name: 'CharacterSkeleton',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      children: []
    };

    // 頭部の作成
    const head = this.createHead(proportions);
    skeleton.children.push(head);

    // 胴体の作成
    const torso = this.createTorso(proportions);
    skeleton.children.push(torso);

    // 腕の作成
    const leftArm = this.createArm('left', proportions);
    const rightArm = this.createArm('right', proportions);
    skeleton.children.push(leftArm, rightArm);

    // 脚の作成
    const leftLeg = this.createLeg('left', proportions);
    const rightLeg = this.createLeg('right', proportions);
    skeleton.children.push(leftLeg, rightLeg);

    return skeleton;
  }

  /**
   * 頭部を作成
   */
  createHead(proportions) {
    return {
      name: 'Head',
      type: 'Group',
      position: [0, proportions.torsoHeight + proportions.headRadius, 0],
      rotation: [0, 0, 0],
      children: [
        {
          name: 'HeadMesh',
          type: 'Mesh',
          geometry: {
            type: 'SphereGeometry',
            radius: proportions.headRadius,
            widthSegments: 16,
            heightSegments: 12
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#FFDBAC' // 肌色
          },
          position: [0, 0, 0]
        },
        // 目
        {
          name: 'LeftEye',
          type: 'Mesh',
          geometry: {
            type: 'SphereGeometry',
            radius: 0.15,
            widthSegments: 8,
            heightSegments: 6
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#000000'
          },
          position: [-0.3, 0.2, 0.8]
        },
        {
          name: 'RightEye',
          type: 'Mesh',
          geometry: {
            type: 'SphereGeometry',
            radius: 0.15,
            widthSegments: 8,
            heightSegments: 6
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#000000'
          },
          position: [0.3, 0.2, 0.8]
        },
        // 鼻
        {
          name: 'Nose',
          type: 'Mesh',
          geometry: {
            type: 'ConeGeometry',
            radius: 0.1,
            height: 0.2,
            radialSegments: 6
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#FFDBAC'
          },
          position: [0, 0, 0.9],
          rotation: [Math.PI / 2, 0, 0]
        },
        // 眉毛
        {
          name: 'LeftEyebrow',
          type: 'Mesh',
          geometry: {
            type: 'CylinderGeometry',
            radiusTop: 0.02,
            radiusBottom: 0.02,
            height: 0.3,
            radialSegments: 6
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#4A4A4A'
          },
          position: [-0.3, 0.4, 0.8],
          rotation: [0, 0, Math.PI / 2]
        },
        {
          name: 'RightEyebrow',
          type: 'Mesh',
          geometry: {
            type: 'CylinderGeometry',
            radiusTop: 0.02,
            radiusBottom: 0.02,
            height: 0.3,
            radialSegments: 6
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#4A4A4A'
          },
          position: [0.3, 0.4, 0.8],
          rotation: [0, 0, Math.PI / 2]
        },
        // 髪の毛
        {
          name: 'Hair',
          type: 'Mesh',
          geometry: {
            type: 'SphereGeometry',
            radius: proportions.headRadius * 1.1,
            widthSegments: 12,
            heightSegments: 10
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#4A4A4A'
          },
          position: [0, 0.2, 0]
        },
        // 口
        {
          name: 'Mouth',
          type: 'Mesh',
          geometry: {
            type: 'CylinderGeometry',
            radiusTop: 0.02,
            radiusBottom: 0.02,
            height: 0.3,
            radialSegments: 8
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#AA0000'
          },
          position: [0, -0.3, 0.8],
          rotation: [0, 0, Math.PI / 2]
        }
      ]
    };
  }

  /**
   * 胴体を作成
   */
  createTorso(proportions) {
    return {
      name: 'Torso',
      type: 'Mesh',
      geometry: {
        type: 'BoxGeometry',
        width: proportions.torsoWidth,
        height: proportions.torsoHeight,
        depth: proportions.torsoDepth
      },
      material: {
        type: 'MeshBasicMaterial',
        color: '#4444FF' // デフォルトシャツ色
      },
      position: [0, proportions.torsoHeight / 2, 0],
      rotation: [0, 0, 0]
    };
  }

  /**
   * 腕を作成
   */
  createArm(side, proportions) {
    const isLeft = side === 'left';
    const xOffset = isLeft ? -proportions.shoulderWidth / 2 : proportions.shoulderWidth / 2;
    
    return {
      name: `${side}Arm`,
      type: 'Group',
      position: [xOffset, proportions.torsoHeight - 0.5, 0],
      rotation: [0, 0, 0],
      children: [
        {
          name: `${side}UpperArm`,
          type: 'Mesh',
          geometry: {
            type: 'CylinderGeometry',
            radiusTop: proportions.armRadius,
            radiusBottom: proportions.armRadius,
            height: proportions.armLength,
            radialSegments: 8
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#FFDBAC'
          },
          position: [0, -proportions.armLength / 2, 0]
        },
        {
          name: `${side}Hand`,
          type: 'Mesh',
          geometry: {
            type: 'SphereGeometry',
            radius: proportions.armRadius * 1.2,
            widthSegments: 8,
            heightSegments: 6
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#FFDBAC'
          },
          position: [0, -proportions.armLength, 0]
        }
      ]
    };
  }

  /**
   * 脚を作成
   */
  createLeg(side, proportions) {
    const isLeft = side === 'left';
    const xOffset = isLeft ? -proportions.hipWidth / 2 : proportions.hipWidth / 2;
    
    return {
      name: `${side}Leg`,
      type: 'Group',
      position: [xOffset, 0, 0],
      rotation: [0, 0, 0],
      children: [
        {
          name: `${side}UpperLeg`,
          type: 'Mesh',
          geometry: {
            type: 'CylinderGeometry',
            radiusTop: proportions.legRadius,
            radiusBottom: proportions.legRadius,
            height: proportions.legLength,
            radialSegments: 8
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#222222' // デフォルトパンツ色
          },
          position: [0, -proportions.legLength / 2, 0]
        },
        {
          name: `${side}Foot`,
          type: 'Mesh',
          geometry: {
            type: 'BoxGeometry',
            width: 0.6,
            height: 0.3,
            depth: 1.2
          },
          material: {
            type: 'MeshBasicMaterial',
            color: '#8B4513'
          },
          position: [0, -proportions.legLength - 0.15, 0.3]
        }
      ]
    };
  }

  /**
   * ポーズを適用
   * @param {Object} skeleton - 骨格オブジェクト
   * @param {string} poseName - ポーズ名
   */
  applyPose(skeleton, poseName) {
    console.log(`🤸 Applying pose: ${poseName}`);
    
    const pose = this.poses[poseName];
    if (!pose) {
      console.warn(`⚠️ Unknown pose: ${poseName}`);
      return;
    }

    // 各部位にポーズを適用
    skeleton.children.forEach(child => {
      switch (child.name) {
        case 'leftArm':
          if (pose.leftArm) {
            child.rotation = pose.leftArm.rotation;
          }
          break;
        case 'rightArm':
          if (pose.rightArm) {
            child.rotation = pose.rightArm.rotation;
          }
          break;
        case 'leftLeg':
          if (pose.leftLeg) {
            child.rotation = pose.leftLeg.rotation;
          }
          break;
        case 'rightLeg':
          if (pose.rightLeg) {
            child.rotation = pose.rightLeg.rotation;
          }
          break;
        case 'Torso':
          if (pose.torso) {
            child.rotation = pose.torso.rotation;
          }
          break;
        case 'Head':
          if (pose.head) {
            child.rotation = pose.head.rotation;
          }
          break;
      }
    });
  }

  /**
   * 表情を適用
   * @param {Object} skeleton - 骨格オブジェクト
   * @param {string} emotionName - 表情名
   */
  applyEmotion(skeleton, emotionName) {
    console.log(`😊 Applying emotion: ${emotionName}`);
    
    const emotion = this.emotions[emotionName];
    if (!emotion) {
      console.warn(`⚠️ Unknown emotion: ${emotionName}`);
      return;
    }

    // 頭部の子要素（目、口など）を調整
    const head = skeleton.children.find(child => child.name === 'Head');
    if (head && head.children) {
      head.children.forEach(child => {
        switch (child.name) {
          case 'LeftEye':
          case 'RightEye':
            // 目のスケール調整と開き具合
            child.scale = [emotion.eyeScale, emotion.eyeScale * emotion.eyeOpenness, emotion.eyeScale];
            break;
          case 'Mouth':
            // 口の形状調整（回転で表現）
            child.rotation[2] = emotion.mouthCurve;
            break;
          case 'LeftEyebrow':
          case 'RightEyebrow':
            // 眉毛の角度調整
            if (child.rotation) {
              child.rotation[2] = emotion.eyebrowAngle;
            }
            break;
        }
      });
    }
  }

  /**
   * 服装スタイルを適用
   * @param {Object} skeleton - 骨格オブジェクト
   * @param {Object|string} clothing - 服装設定
   */
  applyClothing(skeleton, clothing) {
    console.log(`👕 Applying clothing style:`, clothing);
    
    let clothingStyle;
    if (typeof clothing === 'string') {
      clothingStyle = this.clothingStyles[clothing] || this.clothingStyles.casual;
    } else {
      clothingStyle = this.clothingStyles.casual;
    }
    
    skeleton.children.forEach(child => {
      switch (child.name) {
        case 'Torso':
          child.material.color = clothingStyle.shirt.color;
          // 材質やパターンのメタデータを追加
          child.materialMetadata = {
            pattern: clothingStyle.shirt.pattern,
            material: clothingStyle.shirt.material,
            description: clothingStyle.description
          };
          break;
        case 'leftLeg':
        case 'rightLeg':
          // 脚の上部（パンツ部分）にスタイルを適用
          const upperLeg = child.children.find(c => c.name.includes('UpperLeg'));
          if (upperLeg) {
            upperLeg.material.color = clothingStyle.pants.color;
            upperLeg.materialMetadata = {
              pattern: clothingStyle.pants.pattern,
              material: clothingStyle.pants.material
            };
          }
          break;
      }
    });
  }
  
  /**
   * 髪型スタイルを適用
   * @param {Object} skeleton - 骨格オブジェクト
   * @param {string} hairStyle - 髪型スタイル
   */
  applyHairStyle(skeleton, hairStyle) {
    console.log(`💇 Applying hair style:`, hairStyle);
    
    const style = this.hairStyles[hairStyle] || this.hairStyles.neat;
    
    // 頭部の髪の毛部分を見つけて調整
    const head = skeleton.children.find(child => child.name === 'Head');
    if (head && head.children) {
      const hair = head.children.find(child => child.name === 'Hair');
      if (hair) {
        // 髪の色を適用
        hair.material.color = style.color;
        
        // 髪のボリュームと乱れ具合を適用
        hair.scale = [style.volume, style.volume, style.volume];
        
        // 乱れ具合による位置のランダム化
        if (style.messiness > 0) {
          hair.position[0] += (Math.random() - 0.5) * style.messiness * 0.2;
          hair.position[1] += (Math.random() - 0.5) * style.messiness * 0.1;
          hair.rotation[2] += (Math.random() - 0.5) * style.messiness * 0.3;
        }
        
        // メタデータを追加
        hair.styleMetadata = {
          style: style.style,
          messiness: style.messiness,
          description: style.description
        };
      }
    }
  }

  /**
   * バウンディングボックスを計算
   * @param {Object} skeleton - 骨格オブジェクト
   * @returns {Object} バウンディングボックス
   */
  calculateBoundingBox(skeleton) {
    // 簡易的なバウンディングボックス計算
    return {
      min: { x: -2.5, y: -4.0, z: -1.5 },
      max: { x: 2.5, y: 5.0, z: 1.5 },
      center: { x: 0, y: 0.5, z: 0 },
      size: { x: 5.0, y: 9.0, z: 3.0 }
    };
  }

  /**
   * 頂点数を計算
   * @param {Object} skeleton - 骨格オブジェクト
   * @returns {number} 推定頂点数
   */
  calculateVertexCount(skeleton) {
    // 各プリミティブの頂点数を推定
    let vertexCount = 0;
    
    // 頭部（球体）: 約290頂点
    vertexCount += 290;
    
    // 胴体（箱）: 24頂点
    vertexCount += 24;
    
    // 腕（円柱×2 + 球×2）: 約320頂点
    vertexCount += 320;
    
    // 脚（円柱×2 + 箱×2）: 約200頂点
    vertexCount += 200;
    
    // 顔のパーツ（目、鼻、口）: 約150頂点
    vertexCount += 150;
    
    return vertexCount;
  }

  /**
   * 基本的なアニメーションを生成
   * @param {Object} skeleton - 骨格オブジェクト
   * @param {string} pose - 現在のポーズ
   * @returns {Array} アニメーション配列
   */
  generateBasicAnimations(skeleton, pose) {
    const animations = [];
    
    // 待機アニメーション
    animations.push({
      name: 'idle',
      duration: 2.0,
      loop: true,
      tracks: [
        {
          name: 'Head.rotation',
          times: [0, 1, 2],
          values: [0, 0, 0, 0.1, 0, 0, 0, 0, 0]
        }
      ]
    });
    
    // 歩行アニメーション（walkingポーズの場合）
    if (pose === 'walking') {
      animations.push({
        name: 'walk',
        duration: 1.0,
        loop: true,
        tracks: [
          {
            name: 'leftLeg.rotation',
            times: [0, 0.5, 1.0],
            values: [0.3, 0, 0, -0.3, 0, 0, 0.3, 0, 0]
          },
          {
            name: 'rightLeg.rotation',
            times: [0, 0.5, 1.0],
            values: [-0.3, 0, 0, 0.3, 0, 0, -0.3, 0, 0]
          }
        ]
      });
    }
    
    return animations;
  }

  /**
   * 利用可能なオプションを取得
   * @returns {Object} 利用可能なオプション一覧
   */
  getAvailableOptions() {
    return {
      genders: Object.keys(this.bodyProportions),
      poses: Object.keys(this.poses),
      emotions: Object.keys(this.emotions),
      clothingColors: this.clothingColors
    };
  }

  /**
   * デモ用のテストキャラクターを生成
   * @returns {Array} テストキャラクター一覧
   */
  generateTestCharacters() {
    console.log('🧪 Generating test characters...');
    
    const testConfigs = [
      {
        name: 'Male Standing Happy',
        params: {
          gender: 'male',
          pose: 'standing',
          emotion: 'happy',
          clothing: { shirt: 'blue', pants: 'black' }
        }
      },
      {
        name: 'Female Sitting Sad',
        params: {
          gender: 'female',
          pose: 'sitting',
          emotion: 'sad',
          clothing: { shirt: 'red', pants: 'blue' }
        }
      },
      {
        name: 'Male Walking Neutral',
        params: {
          gender: 'male',
          pose: 'walking',
          emotion: 'neutral',
          clothing: { shirt: 'green', pants: 'brown' }
        }
      }
    ];

    const testCharacters = [];
    
    testConfigs.forEach(config => {
      try {
        const character = this.generateCharacter(config.params);
        testCharacters.push({
          name: config.name,
          config: config.params,
          character: character,
          success: true
        });
        console.log(`✅ Generated: ${config.name}`);
      } catch (error) {
        testCharacters.push({
          name: config.name,
          config: config.params,
          character: null,
          success: false,
          error: error.message
        });
        console.log(`❌ Failed: ${config.name} - ${error.message}`);
      }
    });

    return testCharacters;
  }
}

module.exports = Procedural3DCharacterService;