/**
 * Three.js 実3Dレンダリングシステム
 * Canvas描画から脱却し、本格的な3D空間をレンダリング
 * 
 * 主な機能:
 * - Three.js headless レンダリング
 * - Difyデータに基づく3Dシーン構築
 * - 実際の3Dカメラ制御
 * - PNG出力への最適化
 */

const THREE = require('three');
const { createCanvas } = require('canvas');
const gl = require('gl');

class Three3DRenderer {
  constructor(options = {}) {
    this.width = options.width || 400;
    this.height = options.height || 300;
    this.pixelRatio = options.pixelRatio || 1;
    
    console.log(`🎬 Three3DRenderer initialized - ${this.width}x${this.height}`);
    
    // Headless WebGL contextの初期化
    this.initializeHeadlessContext();
    
    // Three.js基本セットアップ
    this.setupThreeJS();
    
    // 3Dアセット管理
    this.assets = {
      characters: new Map(),
      props: new Map(),
      environments: new Map()
    };
  }

  /**
   * Headless WebGL contextを初期化
   */
  initializeHeadlessContext() {
    try {
      // Node.js用のWebGLコンテキスト作成
      this.gl = gl(this.width, this.height, {
        preserveDrawingBuffer: true,
        antialias: true,
        alpha: false
      });
      
      if (!this.gl) {
        throw new Error('WebGL context creation failed');
      }
      
      console.log('✅ Headless WebGL context created');
    } catch (error) {
      console.error('❌ Failed to create WebGL context:', error);
      throw error;
    }
  }

  /**
   * Three.jsの基本セットアップ
   */
  setupThreeJS() {
    // レンダラー初期化
    this.renderer = new THREE.WebGLRenderer({
      context: this.gl,
      antialias: true,
      alpha: false,
      premultipliedAlpha: false
    });
    
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xffffff, 1.0); // 白背景
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // シーン初期化
    this.scene = new THREE.Scene();
    
    // カメラ初期化（デフォルト）
    this.camera = new THREE.PerspectiveCamera(
      75, // FOV
      this.width / this.height, // アスペクト比
      0.1, // near
      1000 // far
    );
    
    console.log('🎨 Three.js renderer initialized');
  }

  /**
   * Difyデータから3Dシーンを構築しレンダリング
   * @param {Object} sceneData - DifyTo3DMapperからの出力データ
   * @returns {Buffer} PNG画像バッファ
   */
  async render3DScene(sceneData) {
    try {
      console.log('🎬 Starting 3D scene rendering...');
      
      // シーンをクリア
      this.clearScene();
      
      // カメラ設定
      this.setupCamera(sceneData.camera);
      
      // ライティング設定
      this.setupLighting(sceneData.background.lighting);
      
      // 背景環境の構築
      await this.buildEnvironment(sceneData.background);
      
      // キャラクター配置
      if (sceneData.character.visible) {
        await this.placeCharacter(sceneData.character);
      }
      
      // 小道具配置
      await this.placeProps(sceneData.background.props);
      
      // レンダリング実行
      this.renderer.render(this.scene, this.camera);
      
      // PNG バッファに変換
      const imageBuffer = await this.extractImageBuffer();
      
      console.log('✅ 3D scene rendered successfully');
      return imageBuffer;
      
    } catch (error) {
      console.error('❌ 3D rendering failed:', error);
      throw new Error(`3D rendering error: ${error.message}`);
    }
  }

  /**
   * シーンをクリア
   */
  clearScene() {
    // 既存のオブジェクトを削除
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0];
      this.scene.remove(child);
      
      // ジオメトリとマテリアルの解放
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }

  /**
   * Difyカメラデータに基づいてカメラを設定
   * @param {Object} cameraData - カメラ設定データ
   */
  setupCamera(cameraData) {
    const { position, target, fov } = cameraData;
    
    // カメラ位置設定
    this.camera.position.set(position.x, position.y, position.z);
    
    // カメラターゲット設定
    if (target) {
      this.camera.lookAt(target.x, target.y, target.z);
    } else {
      this.camera.lookAt(0, 0, 0); // デフォルトは原点
    }
    
    // FOV設定
    if (fov && fov !== this.camera.fov) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    
    console.log(`📹 Camera positioned at [${position.x}, ${position.y}, ${position.z}]`);
  }

  /**
   * ライティングシステムの設定
   * @param {Object} lightingData - ライティング設定
   */
  setupLighting(lightingData) {
    const { ambientIntensity, sunlight, roomLights } = lightingData;
    
    // 環境光（基本照明）
    const ambientLight = new THREE.AmbientLight(0x404040, ambientIntensity || 0.4);
    this.scene.add(ambientLight);
    
    // 太陽光（メインライト）
    if (sunlight && sunlight.intensity > 0) {
      const directionalLight = new THREE.DirectionalLight(
        sunlight.color || 0xffffff, 
        sunlight.intensity
      );
      
      directionalLight.position.set(
        sunlight.position?.x || 10,
        sunlight.position?.y || 10,
        sunlight.position?.z || 5
      );
      
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      
      this.scene.add(directionalLight);
    }
    
    // 室内照明
    if (roomLights && Array.isArray(roomLights)) {
      roomLights.forEach(light => {
        const pointLight = new THREE.PointLight(
          light.color || 0xffffff,
          light.intensity || 0.8,
          light.distance || 20
        );
        
        pointLight.position.set(
          light.position?.x || 0,
          light.position?.y || 5,
          light.position?.z || 0
        );
        
        this.scene.add(pointLight);
      });
    }
    
    console.log('💡 Lighting system configured');
  }

  /**
   * 背景環境の構築
   * @param {Object} backgroundData - 背景データ
   */
  async buildEnvironment(backgroundData) {
    const { environment } = backgroundData;
    
    switch (environment) {
      case 'bedroom':
        await this.buildBedroom();
        break;
      case 'living-room':
        await this.buildLivingRoom();
        break;
      case 'classroom':
        await this.buildClassroom();
        break;
      default:
        await this.buildGenericRoom();
        break;
    }
    
    console.log(`🏠 Environment '${environment}' built`);
  }

  /**
   * 寝室環境の構築
   */
  async buildBedroom() {
    // 床
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xd2b48c // ベージュのフローリング
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // 壁
    const wallHeight = 8;
    const wallGeometry = new THREE.PlaneGeometry(20, wallHeight);
    const wallMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xf5f5dc // アイボリー
    });

    // 後ろの壁
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight/2, -10);
    this.scene.add(backWall);

    // 左の壁
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-10, wallHeight/2, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.scene.add(leftWall);
  }

  /**
   * キャラクターの配置
   * @param {Object} characterData - キャラクターデータ
   */
  async placeCharacter(characterData) {
    const character = await this.createCharacter(characterData);
    
    // ポーズに基づく位置調整
    switch (characterData.pose) {
      case 'sitting-up':
        character.position.set(-2, 1, 2); // ベッド上
        break;
      case 'standing':
        character.position.set(0, 0, 0);
        break;
      case 'looking':
        character.position.set(-1, 0, 1);
        character.rotation.y = Math.PI / 4; // 窓の方向
        break;
      case 'opening-curtain':
        character.position.set(3, 0, -3); // 窓際
        break;
      default:
        character.position.set(0, 0, 0);
    }
    
    this.scene.add(character);
    console.log(`👤 Character placed with pose: ${characterData.pose}`);
  }

  /**
   * 3Dキャラクターの作成
   * @param {Object} characterData - キャラクターデータ
   */
  async createCharacter(characterData) {
    const characterGroup = new THREE.Group();
    
    // 頭部
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2.5;
    head.castShadow = true;
    characterGroup.add(head);

    // 胴体
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.6, 1.5);
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
      color: this.getClothingColor(characterData.clothing)
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.5;
    body.castShadow = true;
    characterGroup.add(body);

    // ポーズ適用
    this.applyCharacterPose(characterGroup, characterData.pose);
    
    return characterGroup;
  }

  /**
   * 服装に基づく色の取得
   * @param {string} clothing - 服装タイプ
   */
  getClothingColor(clothing) {
    const colors = {
      'pajamas': 0xffb6c1, // ライトピンク
      't-shirt': 0x87ceeb, // スカイブルー
      'shirt': 0xffffff,   // 白
      'suit': 0x2f4f4f,    // ダークグレー
      'casual': 0x32cd32   // ライムグリーン
    };
    
    return colors[clothing] || 0x87ceeb;
  }

  /**
   * キャラクターにポーズを適用
   * @param {THREE.Group} character - キャラクターグループ
   * @param {string} pose - ポーズタイプ
   */
  applyCharacterPose(character, pose) {
    switch (pose) {
      case 'sitting-up':
        // 上半身を少し前傾
        character.children[1].rotation.x = 0.2; // 胴体
        break;
      case 'looking':
        // 頭を窓の方向に向ける
        character.children[0].rotation.y = Math.PI / 4; // 頭部
        break;
      case 'opening-curtain':
        // 腕を上げるポーズ（簡略化）
        character.children[1].rotation.z = -0.3; // 胴体傾斜
        break;
    }
  }

  /**
   * 小道具の配置
   * @param {Array} props - 小道具リスト
   */
  async placeProps(props) {
    for (const prop of props) {
      const propObject = await this.createProp(prop);
      if (propObject) {
        this.scene.add(propObject);
      }
    }
    
    console.log(`🪑 ${props.length} props placed`);
  }

  /**
   * 小道具オブジェクトの作成
   * @param {string} propType - 小道具タイプ
   */
  async createProp(propType) {
    switch (propType) {
      case 'bed':
        return this.createBed();
      case 'window':
        return this.createWindow();
      case 'curtain':
        return this.createCurtain();
      default:
        return null;
    }
  }

  /**
   * ベッドの作成
   */
  createBed() {
    const bedGroup = new THREE.Group();
    
    // ベッドフレーム
    const frameGeometry = new THREE.BoxGeometry(4, 0.5, 6);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(-2, 0.25, 2);
    frame.castShadow = true;
    bedGroup.add(frame);

    // マットレス
    const mattressGeometry = new THREE.BoxGeometry(3.8, 0.3, 5.8);
    const mattressMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
    mattress.position.set(-2, 0.65, 2);
    mattress.castShadow = true;
    bedGroup.add(mattress);

    return bedGroup;
  }

  /**
   * 窓の作成
   */
  createWindow() {
    const windowGroup = new THREE.Group();
    
    // 窓枠
    const frameGeometry = new THREE.BoxGeometry(3, 4, 0.2);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.set(0, 4, -9.9);
    windowGroup.add(frame);

    // ガラス部分
    const glassGeometry = new THREE.PlaneGeometry(2.8, 3.8);
    const glassMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x87ceeb, 
      transparent: true, 
      opacity: 0.3 
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.set(0, 4, -9.8);
    windowGroup.add(glass);

    return windowGroup;
  }

  /**
   * カーテンの作成
   */
  createCurtain() {
    const curtainGroup = new THREE.Group();
    
    // 左カーテン
    const leftCurtainGeometry = new THREE.PlaneGeometry(1.8, 4);
    const curtainMaterial = new THREE.MeshLambertMaterial({ color: 0x4169e1 });
    const leftCurtain = new THREE.Mesh(leftCurtainGeometry, curtainMaterial);
    leftCurtain.position.set(-1.5, 4, -9.7);
    curtainGroup.add(leftCurtain);

    // 右カーテン
    const rightCurtain = new THREE.Mesh(leftCurtainGeometry, curtainMaterial);
    rightCurtain.position.set(1.5, 4, -9.7);
    curtainGroup.add(rightCurtain);

    return curtainGroup;
  }

  /**
   * レンダリング結果をPNGバッファとして取得
   */
  async extractImageBuffer() {
    try {
      // WebGLからピクセルデータを読み取り
      const pixels = new Uint8Array(this.width * this.height * 4);
      this.gl.readPixels(0, 0, this.width, this.height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
      
      // Canvas作成してピクセルデータを転写
      const canvas = createCanvas(this.width, this.height);
      const ctx = canvas.getContext('2d');
      const imageData = ctx.createImageData(this.width, this.height);
      
      // Y軸を反転（WebGLは下からの座標系）
      for (let y = 0; y < this.height; y++) {
        for (let x = 0; x < this.width; x++) {
          const srcIndex = ((this.height - y - 1) * this.width + x) * 4;
          const destIndex = (y * this.width + x) * 4;
          
          imageData.data[destIndex] = pixels[srcIndex];       // R
          imageData.data[destIndex + 1] = pixels[srcIndex + 1]; // G
          imageData.data[destIndex + 2] = pixels[srcIndex + 2]; // B
          imageData.data[destIndex + 3] = pixels[srcIndex + 3]; // A
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      // PNGバッファとして出力
      return canvas.toBuffer('image/png');
      
    } catch (error) {
      console.error('❌ Failed to extract image buffer:', error);
      throw error;
    }
  }

  /**
   * リソースのクリーンアップ
   */
  dispose() {
    this.clearScene();
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.gl) {
      // WebGLコンテキストのクリーンアップ
      // 注: headless-glの場合は特別な処理が必要かもしれません
    }
    
    console.log('🧹 Three3DRenderer disposed');
  }

  /**
   * カメラ設定の取得（編集用）
   */
  getCameraSettings() {
    return {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      rotation: {
        x: this.camera.rotation.x,
        y: this.camera.rotation.y,
        z: this.camera.rotation.z
      },
      fov: this.camera.fov
    };
  }

  /**
   * カメラ設定の更新（編集用）
   */
  updateCameraSettings(settings) {
    if (settings.position) {
      this.camera.position.set(
        settings.position.x,
        settings.position.y,
        settings.position.z
      );
    }
    
    if (settings.rotation) {
      this.camera.rotation.set(
        settings.rotation.x,
        settings.rotation.y,
        settings.rotation.z
      );
    }
    
    if (settings.fov && settings.fov !== this.camera.fov) {
      this.camera.fov = settings.fov;
      this.camera.updateProjectionMatrix();
    }
    
    console.log('📹 Camera settings updated');
  }
}

module.exports = Three3DRenderer;