/**
 * Three.js サーバーサイド 3D レンダリングサービス
 * Canvas ライブラリを使用してヘッドレス環境でThree.jsを実行
 */

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Three.js をインポート
const THREE = require('three');

class ThreeJSService {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.canvas = null;
  }

  /**
   * 3D環境の初期化
   * @param {number} width - キャンバス幅
   * @param {number} height - キャンバス高さ
   */
  initialize(width = 800, height = 600) {
    try {
      // Canvas を作成（ヘッドレス環境用）
      this.canvas = createCanvas(width, height);
      
      // シーンを作成
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x222222);

      // カメラを作成
      this.camera = new THREE.PerspectiveCamera(
        75, // 視野角
        width / height, // アスペクト比
        0.1, // 近クリップ面
        1000 // 遠クリップ面
      );
      this.camera.position.set(0, 0, 5);

      // ヘッドレス環境用のCanvas 2D レンダラーを使用
      // WebGLRenderer は DOM要素を要求するため、簡易的なCanvasRendererアプローチを採用
      const context = this.canvas.getContext('2d');
      
      // Three.js の Canvas Renderer （廃止予定だが、ヘッドレス環境では有効）
      try {
        // カスタムレンダラーを作成
        this.renderer = {
          domElement: this.canvas,
          setSize: (w, h) => {
            this.canvas.width = w;
            this.canvas.height = h;
          },
          render: (scene, camera) => {
            // 簡易的な3Dレンダリング実装
            this.renderScene(scene, camera, context);
          },
          getSize: (target) => {
            if (target) {
              target.width = this.canvas.width;
              target.height = this.canvas.height;
              return target;
            }
            return { width: this.canvas.width, height: this.canvas.height };
          },
          dispose: () => {
            // クリーンアップ処理
          }
        };
        
        this.renderer.setSize(width, height);
        console.log('Custom Canvas 2D renderer initialized');
      } catch (error) {
        console.error('Failed to create custom renderer:', error);
        throw error;
      }

      // ライティングを設定
      this.setupLighting();

      console.log('Three.js environment initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize Three.js environment:', error);
      return false;
    }
  }

  /**
   * ライティング設定
   */
  setupLighting() {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    // 指向性ライト
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // ポイントライト
    const pointLight = new THREE.PointLight(0xff6600, 0.5, 100);
    pointLight.position.set(-10, 10, -10);
    this.scene.add(pointLight);
  }

  /**
   * 基本的な3Dオブジェクト（立方体）を作成
   */
  createTestCube() {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x00ff00,
      shininess: 100 
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    this.scene.add(cube);
    return cube;
  }

  /**
   * 球体を作成
   */
  createTestSphere(x = 0, y = 0, z = 0) {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0xff4444,
      shininess: 100 
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(x, y, z);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    this.scene.add(sphere);
    return sphere;
  }

  /**
   * 床面を作成
   */
  createFloor() {
    const geometry = new THREE.PlaneGeometry(20, 20);
    const material = new THREE.MeshPhongMaterial({ 
      color: 0x888888,
      side: THREE.DoubleSide 
    });
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3;
    floor.receiveShadow = true;
    this.scene.add(floor);
    return floor;
  }

  /**
   * カスタムレンダラー用のシーンレンダリング実装
   * @param {THREE.Scene} scene 
   * @param {THREE.Camera} camera 
   * @param {CanvasRenderingContext2D} context 
   */
  renderScene(scene, camera, context) {
    // キャンバスをクリア
    context.fillStyle = '#222222';
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 簡易的な3D投影とオブジェクト描画
    context.save();
    context.translate(this.canvas.width / 2, this.canvas.height / 2);
    
    // シーン内の各オブジェクトを描画
    scene.traverse((object) => {
      if (object.type === 'Mesh') {
        this.drawMesh(object, context, camera);
      }
    });
    
    context.restore();
  }

  /**
   * メッシュオブジェクトの描画
   * @param {THREE.Mesh} mesh 
   * @param {CanvasRenderingContext2D} context 
   * @param {THREE.Camera} camera 
   */
  drawMesh(mesh, context, camera) {
    // 簡易的な3D投影計算
    const position = mesh.position;
    const scale = 200 / (position.z + 5); // 簡易的な遠近法
    
    const x = position.x * scale;
    const y = -position.y * scale;
    
    context.save();
    context.translate(x, y);
    context.rotate(mesh.rotation.z);
    
    // メッシュの種類に応じて描画
    if (mesh.geometry.type === 'BoxGeometry') {
      this.drawBox(context, scale, mesh.material.color);
    } else if (mesh.geometry.type === 'SphereGeometry') {
      this.drawSphere(context, scale, mesh.material.color);
    } else if (mesh.geometry.type === 'PlaneGeometry') {
      this.drawPlane(context, scale, mesh.material.color);
    }
    
    context.restore();
  }

  /**
   * 立方体の描画
   */
  drawBox(context, scale, color) {
    const size = 50 * scale;
    context.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    context.fillRect(-size/2, -size/2, size, size);
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    context.strokeRect(-size/2, -size/2, size, size);
  }

  /**
   * 球体の描画
   */
  drawSphere(context, scale, color) {
    const radius = 30 * scale;
    context.beginPath();
    context.arc(0, 0, radius, 0, Math.PI * 2);
    context.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    context.fill();
    context.strokeStyle = '#000000';
    context.lineWidth = 2;
    context.stroke();
  }

  /**
   * 平面の描画
   */
  drawPlane(context, scale, color) {
    const width = 100 * scale;
    const height = 100 * scale;
    context.fillStyle = `rgb(${Math.floor(color.r * 255)}, ${Math.floor(color.g * 255)}, ${Math.floor(color.b * 255)})`;
    context.fillRect(-width/2, -height/2, width, height);
    context.strokeStyle = '#000000';
    context.lineWidth = 1;
    context.strokeRect(-width/2, -height/2, width, height);
  }

  /**
   * シーンをレンダリング
   */
  render() {
    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('Three.js environment not initialized');
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 画像として保存
   * @param {string} outputPath - 出力パス
   */
  saveImage(outputPath) {
    if (!this.canvas) {
      throw new Error('Canvas not available');
    }

    const buffer = this.canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`Image saved to: ${outputPath}`);
  }

  /**
   * アニメーション用のオブジェクト更新
   * @param {THREE.Object3D} object 
   * @param {number} time 
   */
  animateObject(object, time) {
    if (object) {
      object.rotation.x = time * 0.01;
      object.rotation.y = time * 0.02;
    }
  }

  /**
   * リソースのクリーンアップ
   */
  cleanup() {
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.scene) {
      // シーン内のオブジェクトをクリーンアップ
      while (this.scene.children.length > 0) {
        const child = this.scene.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose());
          } else {
            child.material.dispose();
          }
        }
        this.scene.remove(child);
      }
    }
  }

  /**
   * シーン情報の取得
   */
  getSceneInfo() {
    return {
      initialized: !!(this.scene && this.camera && this.renderer),
      objectCount: this.scene ? this.scene.children.length : 0,
      cameraPosition: this.camera ? this.camera.position : null,
      rendererSize: this.renderer ? this.renderer.getSize(new THREE.Vector2()) : null
    };
  }
}

module.exports = ThreeJSService;