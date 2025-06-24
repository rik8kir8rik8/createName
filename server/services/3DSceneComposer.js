/**
 * 3Dシーン構成システム
 * Difyの構図データから実際の3D空間を構成する
 * 
 * 機能：
 * - 背景環境の3Dオブジェクト配置
 * - 小道具の生成と配置
 * - ライティングシステム
 * - 空間的関係性の実現
 * - カメラワークの制御
 */

class SceneComposer3D {
  constructor() {
    // === 3Dオブジェクトテンプレート ===
    this.sceneObjects = {
      bed: {
        type: 'Group',
        name: 'Bed',
        components: [
          {
            name: 'BedFrame',
            type: 'Mesh',
            geometry: {
              type: 'BoxGeometry',
              width: 4,
              height: 0.8,
              depth: 6
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#8B4513' // 茶色のベッドフレーム
            },
            position: [0, 0.4, 0]
          },
          {
            name: 'Mattress',
            type: 'Mesh',
            geometry: {
              type: 'BoxGeometry',
              width: 3.8,
              height: 0.4,
              depth: 5.8
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#FFFFFF' // 白いマットレス
            },
            position: [0, 1.0, 0]
          },
          {
            name: 'Pillow',
            type: 'Mesh',
            geometry: {
              type: 'BoxGeometry',
              width: 1.5,
              height: 0.3,
              depth: 1.0
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#F0F8FF' // 薄い青の枕
            },
            position: [0, 1.35, -2.0]
          },
          {
            name: 'Blanket',
            type: 'Mesh',
            geometry: {
              type: 'BoxGeometry',
              width: 3.5,
              height: 0.2,
              depth: 4.0
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#FFB6C1' // ピンクの毛布
            },
            position: [0, 1.3, 0.5]
          }
        ],
        defaultPosition: [2, 0, 1],
        boundingBox: { width: 4, height: 1.5, depth: 6 }
      },

      curtain: {
        type: 'Group',
        name: 'Curtain',
        components: [
          {
            name: 'CurtainLeft',
            type: 'Mesh',
            geometry: {
              type: 'PlaneGeometry',
              width: 1.5,
              height: 4
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#87CEEB', // 薄い青のカーテン
              transparent: true,
              opacity: 0.8
            },
            position: [-0.8, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            name: 'CurtainRight',
            type: 'Mesh',
            geometry: {
              type: 'PlaneGeometry',
              width: 1.5,
              height: 4
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#87CEEB',
              transparent: true,
              opacity: 0.8
            },
            position: [0.8, 2, 0],
            rotation: [0, 0, 0]
          },
          {
            name: 'CurtainRod',
            type: 'Mesh',
            geometry: {
              type: 'CylinderGeometry',
              radiusTop: 0.05,
              radiusBottom: 0.05,
              height: 3.5,
              radialSegments: 8
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#C0C0C0' // シルバーのカーテンロッド
            },
            position: [0, 4, 0],
            rotation: [0, 0, Math.PI / 2]
          }
        ],
        defaultPosition: [-3, 0, -2],
        boundingBox: { width: 3.5, height: 4, depth: 0.2 }
      },

      window: {
        type: 'Group',
        name: 'Window',
        components: [
          {
            name: 'WindowFrame',
            type: 'Mesh',
            geometry: {
              type: 'BoxGeometry',
              width: 3,
              height: 3,
              depth: 0.2
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#FFFFFF' // 白い窓枠
            },
            position: [0, 2, 0]
          },
          {
            name: 'WindowGlass',
            type: 'Mesh',
            geometry: {
              type: 'PlaneGeometry',
              width: 2.6,
              height: 2.6
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#E6F3FF', // 薄い青のガラス
              transparent: true,
              opacity: 0.3
            },
            position: [0, 2, 0.1]
          },
          {
            name: 'WindowCross',
            type: 'Group',
            children: [
              {
                name: 'VerticalBar',
                type: 'Mesh',
                geometry: {
                  type: 'BoxGeometry',
                  width: 0.1,
                  height: 2.6,
                  depth: 0.05
                },
                material: {
                  type: 'MeshBasicMaterial',
                  color: '#FFFFFF'
                },
                position: [0, 2, 0.15]
              },
              {
                name: 'HorizontalBar',
                type: 'Mesh',
                geometry: {
                  type: 'BoxGeometry',
                  width: 2.6,
                  height: 0.1,
                  depth: 0.05
                },
                material: {
                  type: 'MeshBasicMaterial',
                  color: '#FFFFFF'
                },
                position: [0, 2, 0.15]
              }
            ]
          }
        ],
        defaultPosition: [-3, 0, -2.5],
        boundingBox: { width: 3, height: 3, depth: 0.2 }
      },

      room: {
        type: 'Group',
        name: 'Room',
        components: [
          {
            name: 'Floor',
            type: 'Mesh',
            geometry: {
              type: 'PlaneGeometry',
              width: 12,
              height: 12
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#DEB887' // ベージュのフローリング
            },
            position: [0, 0, 0],
            rotation: [-Math.PI / 2, 0, 0]
          },
          {
            name: 'BackWall',
            type: 'Mesh',
            geometry: {
              type: 'PlaneGeometry',
              width: 12,
              height: 8
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#F5F5DC' // ベージュの壁
            },
            position: [0, 4, -6],
            rotation: [0, 0, 0]
          },
          {
            name: 'LeftWall',
            type: 'Mesh',
            geometry: {
              type: 'PlaneGeometry',
              width: 12,
              height: 8
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#F5F5DC'
            },
            position: [-6, 4, 0],
            rotation: [0, Math.PI / 2, 0]
          },
          {
            name: 'RightWall',
            type: 'Mesh',
            geometry: {
              type: 'PlaneGeometry',
              width: 12,
              height: 8
            },
            material: {
              type: 'MeshBasicMaterial',
              color: '#F5F5DC'
            },
            position: [6, 4, 0],
            rotation: [0, -Math.PI / 2, 0]
          }
        ],
        defaultPosition: [0, 0, 0],
        boundingBox: { width: 12, height: 8, depth: 12 }
      }
    };

    // === ライティングプリセット ===
    this.lightingPresets = {
      'morning-light': {
        type: 'directional',
        color: '#FFF8DC',
        intensity: 0.9,
        position: [-2, 3, -1],
        target: [1, 0, 1],
        shadows: true,
        description: '朝の優しい光'
      },
      'sunlight': {
        type: 'directional',
        color: '#FFE4B5',
        intensity: 1.1,
        position: [-3, 4, -2],
        target: [2, 0, 2],
        shadows: true,
        description: '陽射し'
      },
      'ambient-soft': {
        type: 'ambient',
        color: '#F5F5DC',
        intensity: 0.4,
        description: '柔らかい環境光'
      }
    };

    // === カメラプリセット ===
    this.cameraPresets = {
      'wide-room-view': {
        position: [4, 3, 5],
        target: [0, 1, 0],
        fov: 60,
        description: '部屋全体を見渡すワイドビュー'
      },
      'character-focus': {
        position: [1, 2, 3],
        target: [0, 1, 1],
        fov: 50,
        description: 'キャラクターにフォーカス'
      },
      'bed-angle': {
        position: [-1, 2, 4],
        target: [2, 1, 1],
        fov: 55,
        description: 'ベッドを中心とした角度'
      }
    };
  }

  /**
   * 3Dシーンを構成するメイン関数
   * @param {Object} sceneData - DifyTo3DMapperからの出力データ
   * @returns {Object} 完全な3Dシーン構造
   */
  composeScene(sceneData) {
    console.log('🎬 3Dシーン構成開始...');

    try {
      const scene = {
        type: 'Scene',
        name: 'MangaPanel3DScene',
        children: [],
        lighting: [],
        camera: {},
        metadata: {
          sceneType: 'bedroom-morning',
          composedAt: new Date().toISOString(),
          originalData: sceneData
        }
      };

      // 1. ベースルームの構築
      this.buildBaseRoom(scene, sceneData.background);

      // 2. 家具・小道具の配置
      this.placeFurniture(scene, sceneData.background, sceneData.composition);

      // 3. キャラクターの配置
      this.placeCharacter(scene, sceneData.character, sceneData.composition);

      // 4. ライティングの設定
      this.setupLighting(scene, sceneData.background);

      // 5. カメラの設定
      this.setupCamera(scene, sceneData.camera, sceneData.composition);

      // 6. 特殊効果の追加
      this.addSpecialEffects(scene, sceneData.visualEffects);

      console.log('✅ 3Dシーン構成完了');
      return scene;

    } catch (error) {
      console.error('❌ 3Dシーン構成エラー:', error);
      throw new Error(`3Dシーン構成失敗: ${error.message}`);
    }
  }

  /**
   * ベースルームを構築
   * @param {Object} scene - シーンオブジェクト
   * @param {Object} backgroundData - 背景データ
   */
  buildBaseRoom(scene, backgroundData) {
    console.log('🏠 ベースルーム構築中...');

    // 基本的な部屋構造を追加
    const room = JSON.parse(JSON.stringify(this.sceneObjects.room));
    room.position = [0, 0, 0];

    // 床のマテリアルを背景データに基づいて調整
    if (backgroundData.props.includes('flooring')) {
      const floor = room.components.find(c => c.name === 'Floor');
      if (floor) {
        floor.material.color = '#DEB887'; // フローリング色
      }
    }

    scene.children.push(room);
    console.log('✅ ベースルーム構築完了');
  }

  /**
   * 家具・小道具を配置
   * @param {Object} scene - シーンオブジェクト
   * @param {Object} backgroundData - 背景データ
   * @param {Object} compositionData - 構図データ
   */
  placeFurniture(scene, backgroundData, compositionData) {
    console.log('🛏️ 家具配置中...');

    // ベッドの配置
    if (backgroundData.props.includes('bed')) {
      const bed = this.createBed(compositionData);
      scene.children.push(bed);
    }

    // カーテンの配置
    if (backgroundData.props.includes('curtain')) {
      const curtain = this.createCurtain(compositionData);
      scene.children.push(curtain);
    }

    // 窓の配置
    if (backgroundData.props.includes('window')) {
      const window = this.createWindow(compositionData);
      scene.children.push(window);
    }

    // 衣類の散らばり
    if (backgroundData.props.includes('clothes')) {
      const clothes = this.createScatteredClothes();
      scene.children.push(...clothes);
    }

    console.log('✅ 家具配置完了');
  }

  /**
   * ベッドを作成・配置
   * @param {Object} compositionData - 構図データ
   * @returns {Object} ベッドオブジェクト
   */
  createBed(compositionData) {
    const bed = JSON.parse(JSON.stringify(this.sceneObjects.bed));
    
    // 構図に基づく位置調整
    if (compositionData.foregroundObjects.some(obj => obj.type === 'bed')) {
      bed.position = [1, 0, 2]; // 手前に配置
    } else {
      bed.position = [2, 0, 0]; // デフォルト位置
    }

    return {
      ...bed,
      position: bed.position
    };
  }

  /**
   * カーテンを作成・配置
   * @param {Object} compositionData - 構図データ
   * @returns {Object} カーテンオブジェクト
   */
  createCurtain(compositionData) {
    const curtain = JSON.parse(JSON.stringify(this.sceneObjects.curtain));
    
    // 構図に基づく位置調整
    if (compositionData.backgroundObjects.some(obj => obj.type === 'curtain')) {
      curtain.position = [-4, 0, -3]; // 奥の左側に配置
    } else {
      curtain.position = [-3, 0, -2]; // デフォルト位置
    }

    // カーテンが開いている状態の調整
    if (compositionData.originalText && compositionData.originalText.includes('開け')) {
      curtain.components.forEach(component => {
        if (component.name === 'CurtainLeft') {
          component.position[0] -= 0.5; // 左に移動
        }
        if (component.name === 'CurtainRight') {
          component.position[0] += 0.5; // 右に移動
        }
      });
    }

    return {
      ...curtain,
      position: curtain.position
    };
  }

  /**
   * 窓を作成・配置
   * @param {Object} compositionData - 構図データ
   * @returns {Object} 窓オブジェクト
   */
  createWindow(compositionData) {
    const window = JSON.parse(JSON.stringify(this.sceneObjects.window));
    
    // 左壁に配置（カーテンと同じ位置）
    window.position = [-5.9, 0, -2];

    return {
      ...window,
      position: window.position
    };
  }

  /**
   * 散らかった衣類を作成
   * @returns {Array} 衣類オブジェクトの配列
   */
  createScatteredClothes() {
    const clothes = [];
    
    // いくつかの衣類を床に配置
    for (let i = 0; i < 3; i++) {
      const clothItem = {
        type: 'Mesh',
        name: `ClothItem${i}`,
        geometry: {
          type: 'BoxGeometry',
          width: 0.8,
          height: 0.1,
          depth: 0.6
        },
        material: {
          type: 'MeshBasicMaterial',
          color: ['#FF6B6B', '#4ECDC4', '#45B7D1'][i] // ランダムな色
        },
        position: [
          Math.random() * 4 - 2, // -2 to 2
          0.05,
          Math.random() * 2 + 1  // 1 to 3
        ],
        rotation: [0, Math.random() * Math.PI, 0]
      };
      clothes.push(clothItem);
    }
    
    return clothes;
  }

  /**
   * キャラクターを配置
   * @param {Object} scene - シーンオブジェクト
   * @param {Object} characterData - キャラクターデータ
   * @param {Object} compositionData - 構図データ
   */
  placeCharacter(scene, characterData, compositionData) {
    console.log('🎭 キャラクター配置中...');

    if (!characterData.visible) {
      console.log('👻 キャラクター非表示のためスキップ');
      return;
    }

    // キャラクタープレースホルダー（実際のキャラクターは別のサービスで生成）
    const characterPlaceholder = {
      type: 'Group',
      name: 'CharacterPlaceholder',
      position: [
        characterData.position.x,
        characterData.position.y,
        characterData.position.z
      ],
      rotation: [
        characterData.rotation.x,
        characterData.rotation.y,
        characterData.rotation.z
      ],
      metadata: {
        characterData: characterData,
        renderWith: 'Procedural3DCharacterService'
      }
    };

    scene.children.push(characterPlaceholder);
    console.log('✅ キャラクター配置完了');
  }

  /**
   * ライティングを設定
   * @param {Object} scene - シーンオブジェクト
   * @param {Object} backgroundData - 背景データ
   */
  setupLighting(scene, backgroundData) {
    console.log('💡 ライティング設定中...');

    // 環境光を追加
    scene.lighting.push({
      type: 'AmbientLight',
      color: backgroundData.ambientColor || '#F5F5DC',
      intensity: 0.4
    });

    // 朝の光の設定
    if (backgroundData.lighting === 'morning') {
      const morningLight = JSON.parse(JSON.stringify(this.lightingPresets['morning-light']));
      scene.lighting.push({
        type: 'DirectionalLight',
        ...morningLight
      });

      // 窓からの光のエフェクト
      scene.lighting.push({
        type: 'SpotLight',
        color: '#FFF8DC',
        intensity: 0.6,
        position: [-4, 3, -2],
        target: [1, 0, 1],
        angle: Math.PI / 4,
        penumbra: 0.5,
        description: '窓からの朝の光'
      });
    }

    // 陽射しの設定
    if (backgroundData.originalDescription && 
        backgroundData.originalDescription.includes('陽射し')) {
      const sunlight = JSON.parse(JSON.stringify(this.lightingPresets['sunlight']));
      scene.lighting.push({
        type: 'DirectionalLight',
        ...sunlight
      });
    }

    console.log('✅ ライティング設定完了');
  }

  /**
   * カメラを設定
   * @param {Object} scene - シーンオブジェクト
   * @param {Object} cameraData - カメラデータ
   * @param {Object} compositionData - 構図データ
   */
  setupCamera(scene, cameraData, compositionData) {
    console.log('📷 カメラ設定中...');

    let cameraConfig;

    // 構図に基づくカメラ選択
    if (compositionData.layout === 'wide-room-view') {
      cameraConfig = this.cameraPresets['wide-room-view'];
    } else if (compositionData.originalText && 
               compositionData.originalText.includes('ベッド')) {
      cameraConfig = this.cameraPresets['bed-angle'];
    } else {
      cameraConfig = this.cameraPresets['character-focus'];
    }

    // カメラ距離の調整
    const distance = cameraData.position.z || cameraConfig.position[2];
    const adjustedPosition = [
      cameraConfig.position[0],
      cameraConfig.position[1],
      distance
    ];

    scene.camera = {
      type: 'PerspectiveCamera',
      position: adjustedPosition,
      target: cameraConfig.target,
      fov: cameraData.fov || cameraConfig.fov,
      aspect: cameraData.aspect || 16/9,
      near: cameraData.near || 0.1,
      far: cameraData.far || 1000,
      metadata: {
        originalCameraData: cameraData,
        presetUsed: cameraConfig.description
      }
    };

    console.log('✅ カメラ設定完了');
  }

  /**
   * 特殊効果を追加
   * @param {Object} scene - シーンオブジェクト
   * @param {Object} visualEffectsData - 視覚効果データ
   */
  addSpecialEffects(scene, visualEffectsData) {
    console.log('✨ 特殊効果追加中...');

    scene.postProcessing = {
      enabled: true,
      effects: []
    };

    // エフェクトに基づく後処理設定
    if (visualEffectsData.filter === 'emotional') {
      scene.postProcessing.effects.push({
        type: 'bloom',
        strength: 0.8,
        radius: 0.4
      });
    }

    if (visualEffectsData.filter === 'past') {
      scene.postProcessing.effects.push({
        type: 'sepia',
        amount: 0.6
      });
      scene.postProcessing.effects.push({
        type: 'vignette',
        amount: 0.3
      });
    }

    // 朝の光のパーティクル効果
    if (scene.lighting.some(light => 
        light.description && light.description.includes('朝'))) {
      scene.children.push({
        type: 'ParticleSystem',
        name: 'DustParticles',
        particles: {
          count: 50,
          size: 0.02,
          color: '#FFF8DC',
          opacity: 0.3,
          movement: 'gentle-float'
        },
        position: [-2, 2, -1],
        area: { width: 3, height: 2, depth: 2 }
      });
    }

    console.log('✅ 特殊効果追加完了');
  }

  /**
   * シーンの統計情報を生成
   * @param {Object} scene - 完成したシーン
   * @returns {Object} 統計情報
   */
  generateSceneStatistics(scene) {
    const stats = {
      totalObjects: scene.children.length,
      lightSources: scene.lighting.length,
      postProcessingEffects: scene.postProcessing ? scene.postProcessing.effects.length : 0,
      estimatedVertices: this.estimateVertexCount(scene),
      sceneComplexity: 'medium',
      renderingNotes: []
    };

    // 複雑度の判定
    if (stats.totalObjects > 15) {
      stats.sceneComplexity = 'high';
      stats.renderingNotes.push('高い複雑度 - 最適化推奨');
    } else if (stats.totalObjects < 8) {
      stats.sceneComplexity = 'low';
    }

    // ライティングに関する注意事項
    if (stats.lightSources > 3) {
      stats.renderingNotes.push('多数の光源 - パフォーマンスに注意');
    }

    return stats;
  }

  /**
   * 頂点数の推定
   * @param {Object} scene - シーン
   * @returns {number} 推定頂点数
   */
  estimateVertexCount(scene) {
    // 簡易的な頂点数推定
    const baseVertices = {
      'BoxGeometry': 24,
      'PlaneGeometry': 4,
      'SphereGeometry': 382,
      'CylinderGeometry': 64,
      'ConeGeometry': 48
    };

    let totalVertices = 0;
    
    // 再帰的にシーンを走査（簡略化）
    scene.children.forEach(child => {
      if (child.components) {
        child.components.forEach(component => {
          if (component.geometry && baseVertices[component.geometry.type]) {
            totalVertices += baseVertices[component.geometry.type];
          }
        });
      }
      // 基本的なオブジェクトも計算に含める
      totalVertices += 50; // 平均的な頂点数
    });

    return totalVertices;
  }

  /**
   * デバッグ用のシーン情報出力
   * @param {Object} scene - シーン
   */
  debugSceneInfo(scene) {
    console.log('🔍 === 3Dシーン デバッグ情報 ===');
    console.log(`オブジェクト数: ${scene.children.length}`);
    console.log(`光源数: ${scene.lighting.length}`);
    console.log(`カメラ位置: [${scene.camera.position.join(', ')}]`);
    
    console.log('\n📦 オブジェクト一覧:');
    scene.children.forEach((child, index) => {
      console.log(`  ${index + 1}. ${child.name || 'Unnamed'} (${child.type})`);
    });

    console.log('\n💡 光源一覧:');
    scene.lighting.forEach((light, index) => {
      console.log(`  ${index + 1}. ${light.type} - ${light.description || '説明なし'}`);
    });

    const stats = this.generateSceneStatistics(scene);
    console.log(`\n📊 統計: 複雑度=${stats.sceneComplexity}, 推定頂点数=${stats.estimatedVertices}`);
    console.log('🔍 === デバッグ情報終了 ===\n');
  }

  /**
   * シーンの検証
   * @param {Object} scene - シーン
   * @returns {Object} 検証結果
   */
  validateScene(scene) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // 必須要素の確認
    if (!scene.children || scene.children.length === 0) {
      validation.errors.push('シーンにオブジェクトが存在しません');
      validation.isValid = false;
    }

    if (!scene.lighting || scene.lighting.length === 0) {
      validation.warnings.push('光源が設定されていません');
    }

    if (!scene.camera) {
      validation.errors.push('カメラが設定されていません');
      validation.isValid = false;
    }

    // オブジェクトの重複チェック
    const objectNames = scene.children.map(child => child.name).filter(name => name);
    const duplicateNames = objectNames.filter((name, index) => objectNames.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      validation.warnings.push(`重複したオブジェクト名: ${duplicateNames.join(', ')}`);
    }

    return validation;
  }
}

module.exports = SceneComposer3D;