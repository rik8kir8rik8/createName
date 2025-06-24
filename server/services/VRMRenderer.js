/**
 * VRMレンダリングシステム
 * three.js + @pixiv/three-vrmを使用してVRMモデルの高品質レンダリングを実現
 */

// Node.js環境での three.js モック実装
// 実際のWebアプリでは import * as THREE from 'three' を使用
const createThreeMock = () => {
  return {
    Scene: function() {
      this.children = [];
      this.add = (object) => this.children.push(object);
      this.remove = (object) => {
        const index = this.children.indexOf(object);
        if (index > -1) this.children.splice(index, 1);
      };
    },
    PerspectiveCamera: function(fov, aspect, near, far) {
      this.fov = fov;
      this.aspect = aspect;
      this.near = near;
      this.far = far;
      this.position = { x: 0, y: 0, z: 5 };
      this.rotation = { x: 0, y: 0, z: 0 };
      this.lookAt = () => {};
    },
    WebGLRenderer: function(options = {}) {
      this.domElement = { width: 800, height: 600 };
      this.setSize = (width, height) => {
        this.domElement.width = width;
        this.domElement.height = height;
      };
      this.render = () => {};
      this.setClearColor = () => {};
    },
    DirectionalLight: function(color, intensity) {
      this.color = color;
      this.intensity = intensity;
      this.position = { x: 0, y: 1, z: 0 };
      this.castShadow = false;
    },
    AmbientLight: function(color, intensity) {
      this.color = color;
      this.intensity = intensity;
    },
    Vector3: function(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    },
    Clock: function() {
      this.getDelta = () => 0.016; // 60fps
    },
    GLTFLoader: function() {
      this.load = (url, onLoad, onProgress, onError) => {
        // モックGLTF/VRMデータ
        const mockVRM = {
          scene: {
            name: 'VRMModel',
            children: [],
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 }
          },
          animations: [],
          userData: { vrm: true }
        };
        setTimeout(() => onLoad(mockVRM), 100);
      };
    }
  };
};

// VRM モック実装
const createVRMMock = () => {
  return {
    VRMLoaderPlugin: function() {
      this.name = 'VRMLoaderPlugin';
    },
    VRMUtils: {
      removeUnnecessaryVertices: (scene) => scene,
      removeUnnecessaryJoints: (scene) => scene
    },
    VRMHumanBoneName: {
      Head: 'head',
      Neck: 'neck',
      Spine: 'spine',
      LeftUpperArm: 'leftUpperArm',
      LeftLowerArm: 'leftLowerArm',
      LeftHand: 'leftHand',
      RightUpperArm: 'rightUpperArm',
      RightLowerArm: 'rightLowerArm',
      RightHand: 'rightHand',
      LeftUpperLeg: 'leftUpperLeg',
      LeftLowerLeg: 'leftLowerLeg',
      LeftFoot: 'leftFoot',
      RightUpperLeg: 'rightUpperLeg',
      RightLowerLeg: 'rightLowerLeg',
      RightFoot: 'rightFoot'
    },
    VRMExpressionPresetName: {
      Happy: 'happy',
      Angry: 'angry',
      Sad: 'sad',
      Relaxed: 'relaxed',
      Surprised: 'surprised'
    }
  };
};

// Node.js環境用のモック
const THREE = createThreeMock();
const VRM = createVRMMock();

class VRMRenderer {
  constructor(options = {}) {
    this.options = {
      width: options.width || 800,
      height: options.height || 600,
      antialias: options.antialias !== false,
      alpha: options.alpha !== false,
      preserveDrawingBuffer: options.preserveDrawingBuffer !== false
    };

    // Three.js基本要素
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    
    // VRM関連
    this.vrmModel = null;
    this.mixer = null;
    this.currentVRMUrl = null;
    
    // ライティング
    this.lights = {
      directional: null,
      ambient: null,
      rim: null
    };
    
    // アニメーション
    this.animationLoop = null;
    this.isPlaying = false;
    
    // 表情制御
    this.expressions = new Map();
    this.currentExpression = 'neutral';
    
    // ポーズ制御
    this.humanoidBones = new Map();
    this.currentPose = 'default';
    
    console.log('🎮 VRMRenderer初期化完了');
  }

  /**
   * VRMレンダリングシステムの初期化
   * @param {HTMLElement} container - レンダリング対象のHTML要素
   */
  async initialize(container = null) {
    try {
      console.log('🔧 VRMレンダリングシステム初期化開始...');

      // Three.jsシーン初期化
      await this.initializeThreeJS(container);
      
      // VRMローダー設定
      await this.setupVRMLoader();
      
      // ライティング設定
      await this.setupLighting();
      
      // 初期カメラ設定
      this.setupCamera();
      
      console.log('✅ VRMレンダリングシステム初期化完了');
      
      return {
        success: true,
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera
      };
    } catch (error) {
      console.error('❌ VRMレンダリングシステム初期化エラー:', error);
      throw error;
    }
  }

  /**
   * Three.jsの基本設定
   * @param {HTMLElement} container - コンテナ要素
   */
  async initializeThreeJS(container) {
    console.log('🌍 Three.jsシーン初期化...');
    
    // シーン作成
    this.scene = new THREE.Scene();
    
    // カメラ作成
    this.camera = new THREE.PerspectiveCamera(
      50, // FOV
      this.options.width / this.options.height, // アスペクト比
      0.1, // Near
      100 // Far
    );
    
    // レンダラー作成
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.options.antialias,
      alpha: this.options.alpha,
      preserveDrawingBuffer: this.options.preserveDrawingBuffer
    });
    
    this.renderer.setSize(this.options.width, this.options.height);
    this.renderer.setClearColor(0xf0f0f0, 1.0);
    
    // コンテナに追加（ブラウザ環境の場合）
    if (container && this.renderer.domElement) {
      container.appendChild(this.renderer.domElement);
    }
    
    console.log('✅ Three.jsシーン初期化完了');
  }

  /**
   * VRMローダーの設定
   */
  async setupVRMLoader() {
    console.log('🤖 VRMローダー設定中...');
    
    try {
      // GLTFローダーにVRMプラグインを追加
      this.loader = new THREE.GLTFLoader();
      
      // VRMローダープラグイン（実際の実装）
      if (typeof VRM.VRMLoaderPlugin !== 'undefined') {
        this.loader.register((parser) => new VRM.VRMLoaderPlugin(parser));
      }
      
      console.log('✅ VRMローダー設定完了');
    } catch (error) {
      console.warn('⚠️ VRMローダー設定で警告（開発環境用モック使用）:', error.message);
      this.loader = new THREE.GLTFLoader();
    }
  }

  /**
   * VRMモデルの読み込み
   * @param {string} vrmUrl - VRMファイルのURL
   * @param {Object} options - 読み込みオプション
   */
  async loadVRMModel(vrmUrl, options = {}) {
    try {
      console.log(`🤖 VRMモデル読み込み開始: ${vrmUrl}`);

      return new Promise((resolve, reject) => {
        this.loader.load(
          vrmUrl,
          (gltf) => this.onVRMLoaded(gltf, options, resolve),
          (progress) => this.onVRMProgress(progress),
          (error) => reject(error)
        );
      });
    } catch (error) {
      console.error('❌ VRMモデル読み込みエラー:', error);
      throw error;
    }
  }

  /**
   * VRM読み込み完了時の処理
   * @param {Object} gltf - 読み込まれたGLTFデータ
   * @param {Object} options - オプション
   * @param {Function} resolve - Promise resolve
   */
  async onVRMLoaded(gltf, options, resolve) {
    try {
      console.log('🎭 VRMモデル読み込み完了、設定中...');

      // 既存のVRMモデルを削除
      if (this.vrmModel) {
        this.scene.remove(this.vrmModel.scene);
      }

      // VRMデータの取得
      this.vrmModel = gltf.userData?.vrm || this.createMockVRM(gltf);
      
      // シーンに追加
      this.scene.add(this.vrmModel.scene || gltf.scene);
      
      // VRMの最適化
      await this.optimizeVRM();
      
      // ボーン情報の取得
      this.extractHumanoidBones();
      
      // 表情情報の取得
      this.extractExpressions();
      
      // 初期設定
      this.setupInitialPose();
      this.setupInitialExpression();
      
      console.log('✅ VRMモデル設定完了');
      
      resolve({
        success: true,
        vrm: this.vrmModel,
        scene: this.vrmModel.scene,
        bones: Object.keys(this.humanoidBones.size || 0),
        expressions: Array.from(this.expressions.keys())
      });
    } catch (error) {
      console.error('❌ VRM設定エラー:', error);
      throw error;
    }
  }

  /**
   * VRM読み込み進捗
   * @param {ProgressEvent} progress - 進捗情報
   */
  onVRMProgress(progress) {
    if (progress.lengthComputable) {
      const percentage = (progress.loaded / progress.total) * 100;
      console.log(`📦 VRM読み込み進捗: ${percentage.toFixed(1)}%`);
    }
  }

  /**
   * モックVRMデータ作成（開発用）
   * @param {Object} gltf - GLTFデータ
   */
  createMockVRM(gltf) {
    console.log('🔧 モックVRMデータ作成...');
    
    return {
      scene: gltf.scene,
      humanoid: {
        getBoneNode: (boneName) => this.getMockBoneNode(boneName),
        getBone: (boneName) => this.getMockBone(boneName)
      },
      expressionManager: {
        setValue: (expressionName, value) => {
          console.log(`😊 表情設定: ${expressionName} = ${value}`);
        },
        getValue: (expressionName) => 0,
        getExpressionTrackName: (expressionName) => `expressions.${expressionName}`
      },
      lookAt: {
        target: new THREE.Vector3(0, 0, -1),
        update: () => {}
      },
      springBoneManager: {
        reset: () => {},
        update: () => {}
      },
      update: (deltaTime) => {
        // VRMの更新処理
      }
    };
  }

  /**
   * モックボーンノード取得
   * @param {string} boneName - ボーン名
   */
  getMockBoneNode(boneName) {
    return {
      name: boneName,
      position: new THREE.Vector3(0, 0, 0),
      rotation: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      scale: new THREE.Vector3(1, 1, 1)
    };
  }

  /**
   * モックボーン取得
   * @param {string} boneName - ボーン名
   */
  getMockBone(boneName) {
    return {
      node: this.getMockBoneNode(boneName)
    };
  }

  /**
   * VRMモデルの最適化
   */
  async optimizeVRM() {
    console.log('⚡ VRMモデル最適化中...');
    
    try {
      if (this.vrmModel && VRM.VRMUtils) {
        // 不要な頂点の削除
        VRM.VRMUtils.removeUnnecessaryVertices(this.vrmModel.scene);
        
        // 不要なジョイントの削除
        VRM.VRMUtils.removeUnnecessaryJoints(this.vrmModel.scene);
      }
      
      console.log('✅ VRMモデル最適化完了');
    } catch (error) {
      console.warn('⚠️ VRM最適化でエラー（続行）:', error.message);
    }
  }

  /**
   * ヒューマノイドボーンの抽出
   */
  extractHumanoidBones() {
    console.log('🦴 ヒューマノイドボーン情報抽出中...');
    
    this.humanoidBones.clear();
    
    if (!this.vrmModel || !this.vrmModel.humanoid) {
      console.warn('⚠️ VRMヒューマノイド情報が見つかりません');
      return;
    }

    // 主要ボーンの取得
    const mainBones = [
      'Head', 'Neck', 'Spine',
      'LeftUpperArm', 'LeftLowerArm', 'LeftHand',
      'RightUpperArm', 'RightLowerArm', 'RightHand',
      'LeftUpperLeg', 'LeftLowerLeg', 'LeftFoot',
      'RightUpperLeg', 'RightLowerLeg', 'RightFoot'
    ];

    mainBones.forEach(boneName => {
      try {
        const bone = this.vrmModel.humanoid.getBone(boneName);
        if (bone) {
          this.humanoidBones.set(boneName, bone);
          console.log(`  🦴 ボーン登録: ${boneName}`);
        }
      } catch (error) {
        console.warn(`  ⚠️ ボーン取得失敗: ${boneName}`);
      }
    });

    console.log(`✅ ヒューマノイドボーン抽出完了: ${this.humanoidBones.size}個`);
  }

  /**
   * 表情情報の抽出
   */
  extractExpressions() {
    console.log('😊 表情情報抽出中...');
    
    this.expressions.clear();
    
    if (!this.vrmModel || !this.vrmModel.expressionManager) {
      console.warn('⚠️ VRM表情マネージャーが見つかりません');
      return;
    }

    // 基本表情の登録
    const basicExpressions = ['happy', 'angry', 'sad', 'relaxed', 'surprised'];
    
    basicExpressions.forEach(expressionName => {
      try {
        // 表情の存在確認
        const trackName = this.vrmModel.expressionManager.getExpressionTrackName(expressionName);
        if (trackName) {
          this.expressions.set(expressionName, {
            name: expressionName,
            trackName: trackName,
            value: 0
          });
          console.log(`  😊 表情登録: ${expressionName}`);
        }
      } catch (error) {
        console.warn(`  ⚠️ 表情取得失敗: ${expressionName}`);
      }
    });

    console.log(`✅ 表情情報抽出完了: ${this.expressions.size}個`);
  }

  /**
   * 初期ポーズ設定
   */
  setupInitialPose() {
    console.log('🧍 初期ポーズ設定中...');
    
    try {
      // ニュートラルポーズ
      this.applyPose('neutral');
      
      console.log('✅ 初期ポーズ設定完了');
    } catch (error) {
      console.warn('⚠️ 初期ポーズ設定エラー:', error.message);
    }
  }

  /**
   * 初期表情設定
   */
  setupInitialExpression() {
    console.log('😐 初期表情設定中...');
    
    try {
      // ニュートラル表情
      this.setExpression('relaxed', 0.3);
      
      console.log('✅ 初期表情設定完了');
    } catch (error) {
      console.warn('⚠️ 初期表情設定エラー:', error.message);
    }
  }

  /**
   * ポーズの適用
   * @param {string} poseName - ポーズ名
   * @param {Object} options - オプション
   */
  applyPose(poseName, options = {}) {
    console.log(`🤸 ポーズ適用: ${poseName}`);
    
    try {
      const poseData = this.getPoseData(poseName);
      if (!poseData) {
        console.warn(`⚠️ ポーズデータが見つかりません: ${poseName}`);
        return false;
      }

      // 各ボーンにポーズを適用
      Object.keys(poseData.bones).forEach(boneName => {
        const bone = this.humanoidBones.get(boneName);
        const boneData = poseData.bones[boneName];
        
        if (bone && bone.node) {
          // 回転の適用
          if (boneData.rotation) {
            bone.node.rotation.x = boneData.rotation.x || 0;
            bone.node.rotation.y = boneData.rotation.y || 0;
            bone.node.rotation.z = boneData.rotation.z || 0;
          }
          
          // 位置の適用
          if (boneData.position) {
            bone.node.position.x = boneData.position.x || 0;
            bone.node.position.y = boneData.position.y || 0;
            bone.node.position.z = boneData.position.z || 0;
          }
        }
      });

      this.currentPose = poseName;
      console.log(`✅ ポーズ適用完了: ${poseName}`);
      return true;
    } catch (error) {
      console.error(`❌ ポーズ適用エラー: ${poseName}`, error);
      return false;
    }
  }

  /**
   * 表情の設定
   * @param {string} expressionName - 表情名
   * @param {number} value - 強度 (0-1)
   */
  setExpression(expressionName, value = 1.0) {
    console.log(`😊 表情設定: ${expressionName} = ${value}`);
    
    try {
      if (!this.vrmModel || !this.vrmModel.expressionManager) {
        console.warn('⚠️ 表情マネージャーが利用できません');
        return false;
      }

      // 他の表情をリセット
      this.expressions.forEach((expression, name) => {
        if (name !== expressionName) {
          this.vrmModel.expressionManager.setValue(name, 0);
        }
      });

      // 指定した表情を設定
      this.vrmModel.expressionManager.setValue(expressionName, value);
      this.currentExpression = expressionName;

      console.log(`✅ 表情設定完了: ${expressionName}`);
      return true;
    } catch (error) {
      console.error(`❌ 表情設定エラー: ${expressionName}`, error);
      return false;
    }
  }

  /**
   * ポーズデータの取得
   * @param {string} poseName - ポーズ名
   */
  getPoseData(poseName) {
    const poses = {
      neutral: {
        bones: {
          Head: { rotation: { x: 0, y: 0, z: 0 } },
          Spine: { rotation: { x: 0, y: 0, z: 0 } },
          LeftUpperArm: { rotation: { x: 0, y: 0, z: 0 } },
          RightUpperArm: { rotation: { x: 0, y: 0, z: 0 } }
        }
      },
      thinking: {
        bones: {
          Head: { rotation: { x: -0.1, y: 0.05, z: 0 } },
          RightUpperArm: { rotation: { x: -0.8, y: 0, z: 0.3 } },
          RightLowerArm: { rotation: { x: -1.0, y: 0, z: 0 } },
          RightHand: { position: { x: 0.1, y: 0.2, z: 0.1 } }
        }
      },
      surprised: {
        bones: {
          Head: { rotation: { x: 0.1, y: 0, z: 0 } },
          LeftUpperArm: { rotation: { x: -0.5, y: 0, z: -0.2 } },
          RightUpperArm: { rotation: { x: -0.5, y: 0, z: 0.2 } },
          Spine: { rotation: { x: -0.1, y: 0, z: 0 } }
        }
      },
      sitting: {
        bones: {
          Spine: { rotation: { x: 0.2, y: 0, z: 0 } },
          LeftUpperLeg: { rotation: { x: 1.5, y: 0, z: 0 } },
          RightUpperLeg: { rotation: { x: 1.5, y: 0, z: 0 } },
          LeftLowerLeg: { rotation: { x: -1.2, y: 0, z: 0 } },
          RightLowerLeg: { rotation: { x: -1.2, y: 0, z: 0 } }
        }
      }
    };

    return poses[poseName] || poses.neutral;
  }

  /**
   * ライティング設定
   */
  async setupLighting() {
    console.log('💡 ライティング設定中...');
    
    // メインライト（太陽光）
    this.lights.directional = new THREE.DirectionalLight(0xffffff, 1.0);
    this.lights.directional.position.set(1, 1, 1);
    this.lights.directional.castShadow = true;
    this.scene.add(this.lights.directional);
    
    // 環境光
    this.lights.ambient = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(this.lights.ambient);
    
    // リムライト
    this.lights.rim = new THREE.DirectionalLight(0x8080ff, 0.5);
    this.lights.rim.position.set(-1, 1, -1);
    this.scene.add(this.lights.rim);
    
    console.log('✅ ライティング設定完了');
  }

  /**
   * カメラ設定
   */
  setupCamera() {
    console.log('📷 カメラ設定中...');
    
    // 初期カメラ位置
    this.camera.position.set(0, 1.6, 3);
    this.camera.lookAt(0, 1.2, 0);
    
    console.log('✅ カメラ設定完了');
  }

  /**
   * アニメーションループ開始
   */
  startAnimation() {
    if (this.isPlaying) return;
    
    console.log('▶️ アニメーション開始');
    this.isPlaying = true;
    
    const animate = () => {
      if (!this.isPlaying) return;
      
      const deltaTime = this.clock.getDelta();
      
      // VRMモデルの更新
      if (this.vrmModel && this.vrmModel.update) {
        this.vrmModel.update(deltaTime);
      }
      
      // レンダリング
      this.renderer.render(this.scene, this.camera);
      
      // 次のフレーム
      this.animationLoop = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * アニメーションループ停止
   */
  stopAnimation() {
    console.log('⏹️ アニメーション停止');
    this.isPlaying = false;
    
    if (this.animationLoop) {
      cancelAnimationFrame(this.animationLoop);
      this.animationLoop = null;
    }
  }

  /**
   * キャンバスにレンダリング
   * @param {Object} ctx - Canvas 2D context
   * @param {Object} panel - パネル情報
   */
  async renderToCanvas(ctx, panel) {
    console.log('🖼️ Canvasにレンダリング...');
    
    try {
      // 一度レンダリング実行
      this.renderer.render(this.scene, this.camera);
      
      // Canvas 2D contextに描画（モック実装）
      await this.mockCanvasRender(ctx, panel);
      
      console.log('✅ Canvasレンダリング完了');
      return true;
    } catch (error) {
      console.error('❌ Canvasレンダリングエラー:', error);
      return false;
    }
  }

  /**
   * モックCanvas描画（Node.js環境用）
   * @param {Object} ctx - Canvas context
   * @param {Object} panel - パネル情報
   */
  async mockCanvasRender(ctx, panel) {
    const centerX = panel.x + panel.width / 2;
    const centerY = panel.y + panel.height / 2;
    const scale = Math.min(panel.width, panel.height) / 400;
    
    // 高品質描画設定
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // VRMキャラクター風の描画
    await this.drawVRMStyleCharacter(ctx, centerX, centerY, scale);
  }

  /**
   * VRMスタイルキャラクター描画
   * @param {Object} ctx - Canvas context
   * @param {number} centerX - 中心X座標
   * @param {number} centerY - 中心Y座標
   * @param {number} scale - スケール
   */
  async drawVRMStyleCharacter(ctx, centerX, centerY, scale) {
    // VRMスタイルの高品質頭部
    const headRadius = 35 * scale;
    const headGradient = ctx.createRadialGradient(
      centerX - headRadius * 0.2, centerY - 50 * scale - headRadius * 0.2, 0,
      centerX, centerY - 50 * scale, headRadius
    );
    headGradient.addColorStop(0, '#fff8f0');
    headGradient.addColorStop(0.7, '#ffdbac');
    headGradient.addColorStop(1, '#d4a574');
    
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY - 50 * scale, headRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // VRMスタイルの胴体
    const bodyGradient = ctx.createLinearGradient(
      centerX - 40 * scale, centerY,
      centerX + 40 * scale, centerY
    );
    bodyGradient.addColorStop(0, '#a8d3f0');
    bodyGradient.addColorStop(0.5, '#87ceeb');
    bodyGradient.addColorStop(1, '#6bb6d6');
    
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 10 * scale, 35 * scale, 60 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // VRMスタイルの表情
    await this.drawVRMFacialFeatures(ctx, centerX, centerY - 50 * scale, scale);
    
    // VRMスタイルの腕・脚
    await this.drawVRMLimbs(ctx, centerX, centerY, scale);
    
    // 輪郭線
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 2 * scale;
    
    // 頭部輪郭
    ctx.beginPath();
    ctx.arc(centerX, centerY - 50 * scale, headRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // 胴体輪郭
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 10 * scale, 35 * scale, 60 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * VRM表情特徴描画
   * @param {Object} ctx - Canvas context
   * @param {number} faceX - 顔X座標
   * @param {number} faceY - 顔Y座標
   * @param {number} scale - スケール
   */
  async drawVRMFacialFeatures(ctx, faceX, faceY, scale) {
    // VRMスタイルの目
    const eyeStyle = this.getExpressionEyeStyle();
    
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#2c2c2c';
    ctx.lineWidth = 1.5 * scale;
    
    // 左目
    ctx.beginPath();
    ctx.ellipse(
      faceX - 15 * scale, faceY - 5 * scale,
      10 * scale * eyeStyle.width, 8 * scale * eyeStyle.height,
      0, 0, Math.PI * 2
    );
    ctx.stroke();
    
    // 右目
    ctx.beginPath();
    ctx.ellipse(
      faceX + 15 * scale, faceY - 5 * scale,
      10 * scale * eyeStyle.width, 8 * scale * eyeStyle.height,
      0, 0, Math.PI * 2
    );
    ctx.stroke();
    
    // 瞳孔
    if (eyeStyle.openness > 0.3) {
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(faceX - 15 * scale, faceY - 5 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(faceX + 15 * scale, faceY - 5 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // VRMスタイルのハイライト
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(faceX - 12 * scale, faceY - 7 * scale, 2 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(faceX + 18 * scale, faceY - 7 * scale, 2 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // VRMスタイルの口
    const mouthStyle = this.getExpressionMouthStyle();
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 1.5 * scale;
    
    const mouthY = faceY + 12 * scale;
    const mouthWidth = 15 * scale * mouthStyle.width;
    
    if (mouthStyle.openness > 0) {
      // 開いた口
      ctx.beginPath();
      ctx.ellipse(
        faceX, mouthY,
        mouthWidth / 2, 4 * scale * mouthStyle.openness,
        0, 0, Math.PI * 2
      );
      ctx.stroke();
    } else {
      // 閉じた口（カーブ）
      ctx.beginPath();
      ctx.moveTo(faceX - mouthWidth / 2, mouthY);
      ctx.quadraticCurveTo(
        faceX, mouthY - mouthStyle.curve * scale,
        faceX + mouthWidth / 2, mouthY
      );
      ctx.stroke();
    }
  }

  /**
   * VRM四肢描画
   * @param {Object} ctx - Canvas context
   * @param {number} centerX - 中心X座標
   * @param {number} centerY - 中心Y座標
   * @param {number} scale - スケール
   */
  async drawVRMLimbs(ctx, centerX, centerY, scale) {
    ctx.strokeStyle = '#8b7355';
    ctx.lineWidth = 4 * scale;
    ctx.lineCap = 'round';
    
    // ポーズに応じた調整
    const poseAdjustment = this.getPoseAdjustment();
    
    // 腕
    this.drawVRMArm(ctx, 'left', centerX, centerY, scale, poseAdjustment);
    this.drawVRMArm(ctx, 'right', centerX, centerY, scale, poseAdjustment);
    
    // 脚
    this.drawVRMLeg(ctx, 'left', centerX, centerY, scale, poseAdjustment);
    this.drawVRMLeg(ctx, 'right', centerX, centerY, scale, poseAdjustment);
  }

  /**
   * VRM腕描画
   * @param {Object} ctx - Canvas context
   * @param {string} side - 'left' または 'right'
   * @param {number} centerX - 中心X座標
   * @param {number} centerY - 中心Y座標
   * @param {number} scale - スケール
   * @param {Object} poseAdjustment - ポーズ調整
   */
  drawVRMArm(ctx, side, centerX, centerY, scale, poseAdjustment) {
    const isLeft = side === 'left';
    const shoulderX = centerX + (isLeft ? -35 : 35) * scale;
    const shoulderY = centerY - 20 * scale;
    
    const armAdjustment = poseAdjustment.arms[side];
    
    // 上腕
    const upperArmX = shoulderX + armAdjustment.upperArm.x * scale;
    const upperArmY = shoulderY + armAdjustment.upperArm.y * scale;
    
    // 前腕
    const lowerArmX = upperArmX + armAdjustment.lowerArm.x * scale;
    const lowerArmY = upperArmY + armAdjustment.lowerArm.y * scale;
    
    // 手
    const handX = lowerArmX + armAdjustment.hand.x * scale;
    const handY = lowerArmY + armAdjustment.hand.y * scale;
    
    // 腕の描画
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(upperArmX, upperArmY);
    ctx.lineTo(lowerArmX, lowerArmY);
    ctx.lineTo(handX, handY);
    ctx.stroke();
    
    // 手の詳細
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(handX, handY, 8 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * VRM脚描画
   * @param {Object} ctx - Canvas context
   * @param {string} side - 'left' または 'right'
   * @param {number} centerX - 中心X座標
   * @param {number} centerY - 中心Y座標
   * @param {number} scale - スケール
   * @param {Object} poseAdjustment - ポーズ調整
   */
  drawVRMLeg(ctx, side, centerX, centerY, scale, poseAdjustment) {
    const isLeft = side === 'left';
    const hipX = centerX + (isLeft ? -15 : 15) * scale;
    const hipY = centerY + 70 * scale;
    
    const legAdjustment = poseAdjustment.legs[side];
    
    // 太もも
    const upperLegX = hipX + legAdjustment.upperLeg.x * scale;
    const upperLegY = hipY + legAdjustment.upperLeg.y * scale;
    
    // すね
    const lowerLegX = upperLegX + legAdjustment.lowerLeg.x * scale;
    const lowerLegY = upperLegY + legAdjustment.lowerLeg.y * scale;
    
    // 足
    const footX = lowerLegX + legAdjustment.foot.x * scale;
    const footY = lowerLegY + legAdjustment.foot.y * scale;
    
    // 脚の描画
    ctx.strokeStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(upperLegX, upperLegY);
    ctx.lineTo(lowerLegX, lowerLegY);
    ctx.lineTo(footX, footY);
    ctx.stroke();
  }

  /**
   * 現在の表情に基づく目のスタイル取得
   */
  getExpressionEyeStyle() {
    switch (this.currentExpression) {
      case 'happy':
        return { width: 0.8, height: 0.7, openness: 0.8 };
      case 'surprised':
        return { width: 1.2, height: 1.3, openness: 1.0 };
      case 'sad':
        return { width: 0.9, height: 0.6, openness: 0.5 };
      case 'angry':
        return { width: 1.1, height: 0.8, openness: 0.9 };
      default:
        return { width: 1.0, height: 1.0, openness: 1.0 };
    }
  }

  /**
   * 現在の表情に基づく口のスタイル取得
   */
  getExpressionMouthStyle() {
    switch (this.currentExpression) {
      case 'happy':
        return { width: 1.2, openness: 0.1, curve: 8 };
      case 'surprised':
        return { width: 0.8, openness: 0.6, curve: 0 };
      case 'sad':
        return { width: 1.0, openness: 0, curve: -5 };
      case 'angry':
        return { width: 1.1, openness: 0.2, curve: -3 };
      default:
        return { width: 1.0, openness: 0, curve: 1 };
    }
  }

  /**
   * 現在のポーズに基づく調整値取得
   */
  getPoseAdjustment() {
    const adjustments = {
      neutral: {
        arms: {
          left: {
            upperArm: { x: -25, y: 30 },
            lowerArm: { x: -20, y: 25 },
            hand: { x: -15, y: 20 }
          },
          right: {
            upperArm: { x: 25, y: 30 },
            lowerArm: { x: 20, y: 25 },
            hand: { x: 15, y: 20 }
          }
        },
        legs: {
          left: {
            upperLeg: { x: -5, y: 40 },
            lowerLeg: { x: -5, y: 40 },
            foot: { x: 0, y: 25 }
          },
          right: {
            upperLeg: { x: 5, y: 40 },
            lowerLeg: { x: 5, y: 40 },
            foot: { x: 0, y: 25 }
          }
        }
      },
      thinking: {
        arms: {
          left: {
            upperArm: { x: -25, y: 30 },
            lowerArm: { x: -20, y: 25 },
            hand: { x: -15, y: 20 }
          },
          right: {
            upperArm: { x: 15, y: 15 },
            lowerArm: { x: 5, y: -10 },
            hand: { x: -10, y: -40 } // 顎の位置
          }
        },
        legs: {
          left: {
            upperLeg: { x: -5, y: 40 },
            lowerLeg: { x: -5, y: 40 },
            foot: { x: 0, y: 25 }
          },
          right: {
            upperLeg: { x: 5, y: 40 },
            lowerLeg: { x: 5, y: 40 },
            foot: { x: 0, y: 25 }
          }
        }
      },
      surprised: {
        arms: {
          left: {
            upperArm: { x: -35, y: 10 },
            lowerArm: { x: -25, y: 0 },
            hand: { x: -20, y: -10 }
          },
          right: {
            upperArm: { x: 35, y: 10 },
            lowerArm: { x: 25, y: 0 },
            hand: { x: 20, y: -10 }
          }
        },
        legs: {
          left: {
            upperLeg: { x: -5, y: 40 },
            lowerLeg: { x: -5, y: 40 },
            foot: { x: 0, y: 25 }
          },
          right: {
            upperLeg: { x: 5, y: 40 },
            lowerLeg: { x: 5, y: 40 },
            foot: { x: 0, y: 25 }
          }
        }
      },
      sitting: {
        arms: {
          left: {
            upperArm: { x: -25, y: 30 },
            lowerArm: { x: -20, y: 25 },
            hand: { x: -15, y: 40 } // 膝の上
          },
          right: {
            upperArm: { x: 25, y: 30 },
            lowerArm: { x: 20, y: 25 },
            hand: { x: 15, y: 40 } // 膝の上
          }
        },
        legs: {
          left: {
            upperLeg: { x: -15, y: 20 },
            lowerLeg: { x: -25, y: 0 },
            foot: { x: -30, y: -5 }
          },
          right: {
            upperLeg: { x: 15, y: 20 },
            lowerLeg: { x: 25, y: 0 },
            foot: { x: 30, y: -5 }
          }
        }
      }
    };

    return adjustments[this.currentPose] || adjustments.neutral;
  }

  /**
   * リソースのクリーンアップ
   */
  dispose() {
    console.log('🧹 VRMRenderer リソースクリーンアップ...');
    
    // アニメーション停止
    this.stopAnimation();
    
    // VRMモデルの削除
    if (this.vrmModel && this.scene) {
      this.scene.remove(this.vrmModel.scene);
    }
    
    // ライトの削除
    Object.values(this.lights).forEach(light => {
      if (light && this.scene) {
        this.scene.remove(light);
      }
    });
    
    // レンダラーのクリーンアップ
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    console.log('✅ VRMRenderer クリーンアップ完了');
  }
}

module.exports = VRMRenderer;