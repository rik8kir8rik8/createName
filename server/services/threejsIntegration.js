/**
 * Three.js サーバーサイド3D統合サービス
 * プロジェクト内でThree.jsを使用するためのヘルパーとユーティリティ
 */

const ThreeJSService = require('./threejsService');
const path = require('path');
const fs = require('fs');

class ThreeJSIntegration {
  constructor() {
    this.threejsService = new ThreeJSService();
    this.outputDir = path.join(__dirname, '../output/3d');
    this.ensureOutputDirectory();
  }

  /**
   * 出力ディレクトリの確保
   */
  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * 3Dシーンの初期化
   * @param {Object} options - 設定オプション
   */
  async initialize(options = {}) {
    const {
      width = 800,
      height = 600,
      backgroundColor = 0x222222
    } = options;

    try {
      const success = this.threejsService.initialize(width, height);
      if (success && backgroundColor !== 0x222222) {
        this.threejsService.scene.background.setHex(backgroundColor);
      }
      return success;
    } catch (error) {
      console.error('3D環境の初期化に失敗しました:', error);
      return false;
    }
  }

  /**
   * マンガパネル用の3Dシーンを生成
   * @param {Object} panelData - パネルデータ
   * @param {string} outputPath - 出力パス
   */
  async generateMangaPanel3D(panelData, outputPath) {
    try {
      if (!this.threejsService.scene) {
        throw new Error('3D環境が初期化されていません');
      }

      // シーンをクリア
      this.clearScene();

      // パネルデータに基づいて3Dオブジェクトを配置
      if (panelData.characters) {
        this.addCharacters(panelData.characters);
      }

      if (panelData.background) {
        this.addBackground(panelData.background);
      }

      if (panelData.props) {
        this.addProps(panelData.props);
      }

      // カメラアングルを設定
      this.setCameraAngle(panelData.cameraAngle || 'normal');

      // レンダリング
      this.threejsService.render();

      // 画像として保存
      const fullOutputPath = path.join(this.outputDir, outputPath);
      this.threejsService.saveImage(fullOutputPath);

      return {
        success: true,
        outputPath: fullOutputPath,
        message: '3Dマンガパネルが生成されました'
      };

    } catch (error) {
      console.error('3Dマンガパネル生成エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * キャラクターの追加
   * @param {Array} characters - キャラクターリスト
   */
  addCharacters(characters) {
    characters.forEach((char, index) => {
      const x = char.position?.x || (index - 1) * 2;
      const y = char.position?.y || 0;
      const z = char.position?.z || 0;

      // キャラクターを簡易的な形状で表現
      const character = this.threejsService.createTestSphere(x, y, z);
      
      // キャラクターに応じた色設定
      if (char.color) {
        character.material.color.setHex(char.color);
      }
    });
  }

  /**
   * 背景の追加
   * @param {Object} background - 背景設定
   */
  addBackground(background) {
    if (background.floor) {
      this.threejsService.createFloor();
    }

    if (background.color) {
      this.threejsService.scene.background.setHex(background.color);
    }
  }

  /**
   * プロップ（小道具）の追加
   * @param {Array} props - プロップリスト
   */
  addProps(props) {
    props.forEach((prop, index) => {
      const x = prop.position?.x || index * 1.5;
      const y = prop.position?.y || 0;
      const z = prop.position?.z || -2;

      // プロップを立方体で表現
      const propObject = this.threejsService.createTestCube();
      propObject.position.set(x, y, z);
      propObject.scale.set(0.5, 0.5, 0.5);

      if (prop.color) {
        propObject.material.color.setHex(prop.color);
      }
    });
  }

  /**
   * カメラアングルの設定
   * @param {string} angle - カメラアングル（normal, close, wide, high, low）
   */
  setCameraAngle(angle) {
    const camera = this.threejsService.camera;
    
    switch (angle) {
      case 'close':
        camera.position.set(0, 0, 3);
        break;
      case 'wide':
        camera.position.set(0, 2, 8);
        break;
      case 'high':
        camera.position.set(0, 5, 5);
        camera.lookAt(0, 0, 0);
        break;
      case 'low':
        camera.position.set(0, -2, 5);
        camera.lookAt(0, 0, 0);
        break;
      default: // normal
        camera.position.set(0, 0, 5);
        break;
    }
  }

  /**
   * シーンのクリア
   */
  clearScene() {
    const scene = this.threejsService.scene;
    const objectsToRemove = [];

    scene.traverse((child) => {
      if (child.type === 'Mesh') {
        objectsToRemove.push(child);
      }
    });

    objectsToRemove.forEach((obj) => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
  }

  /**
   * 3Dアニメーションの生成
   * @param {Object} animationData - アニメーションデータ
   * @param {string} outputPrefix - 出力ファイル名のプレフィックス
   * @param {number} frames - フレーム数
   */
  async generateAnimation(animationData, outputPrefix, frames = 10) {
    try {
      const results = [];

      for (let frame = 0; frame < frames; frame++) {
        // フレームごとのオブジェクト更新
        this.updateAnimationFrame(animationData, frame, frames);

        // レンダリング
        this.threejsService.render();

        // 画像保存
        const outputPath = path.join(this.outputDir, `${outputPrefix}_frame_${frame}.png`);
        this.threejsService.saveImage(outputPath);

        results.push(outputPath);
      }

      return {
        success: true,
        frames: results,
        message: `${frames}フレームのアニメーションが生成されました`
      };

    } catch (error) {
      console.error('3Dアニメーション生成エラー:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * アニメーションフレームの更新
   * @param {Object} animationData - アニメーションデータ
   * @param {number} frame - 現在のフレーム
   * @param {number} totalFrames - 総フレーム数
   */
  updateAnimationFrame(animationData, frame, totalFrames) {
    const progress = frame / totalFrames;
    
    this.threejsService.scene.traverse((object) => {
      if (object.type === 'Mesh') {
        // 簡易的なアニメーション（回転）
        if (animationData.rotation) {
          object.rotation.y = progress * Math.PI * 2;
        }
        
        // 移動アニメーション
        if (animationData.movement) {
          object.position.x = Math.sin(progress * Math.PI * 2) * animationData.movement.amplitude;
        }
      }
    });
  }

  /**
   * 使用例の生成
   */
  async generateUsageExamples() {
    console.log('3D統合サービスの使用例を生成中...');

    // 基本的なシーン
    await this.initialize();
    const basicResult = await this.generateMangaPanel3D({
      characters: [
        { position: { x: -2, y: 0, z: 0 }, color: 0xff6b6b },
        { position: { x: 2, y: 0, z: 0 }, color: 0x4ecdc4 }
      ],
      background: { floor: true, color: 0x87ceeb },
      cameraAngle: 'normal'
    }, 'usage_example_basic.png');

    // アクションシーン
    const actionResult = await this.generateMangaPanel3D({
      characters: [
        { position: { x: 0, y: 1, z: 0 }, color: 0xff4757 }
      ],
      props: [
        { position: { x: -3, y: 0, z: -1 }, color: 0x747d8c },
        { position: { x: 3, y: 0, z: -1 }, color: 0x747d8c }
      ],
      background: { floor: true, color: 0x2f3542 },
      cameraAngle: 'low'
    }, 'usage_example_action.png');

    console.log('✅ 使用例の生成が完了しました');
    return [basicResult, actionResult];
  }

  /**
   * リソースのクリーンアップ
   */
  cleanup() {
    this.threejsService.cleanup();
  }

  /**
   * 3D環境の状態取得
   */
  getStatus() {
    return {
      initialized: !!(this.threejsService.scene && this.threejsService.camera && this.threejsService.renderer),
      outputDirectory: this.outputDir,
      sceneInfo: this.threejsService.getSceneInfo()
    };
  }
}

module.exports = ThreeJSIntegration;