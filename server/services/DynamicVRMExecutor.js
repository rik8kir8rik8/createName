/**
 * 動的VRMコード実行システム
 * OpenAIで生成されたVRMコードを安全に実行し、Three.jsシーンをレンダリング
 */

const vm = require('vm');
const { createCanvas } = require('canvas');

class DynamicVRMExecutor {
  constructor(options = {}) {
    this.canvasWidth = options.width || 800;
    this.canvasHeight = options.height || 600;
    this.timeout = options.timeout || 30000; // 30秒タイムアウト
    
    // 実行統計
    this.stats = {
      executions: 0,
      successes: 0,
      failures: 0,
      totalTime: 0
    };
    
    console.log('⚡ DynamicVRMExecutor 初期化完了');
  }

  /**
   * 生成されたVRMコードを安全に実行
   * @param {string} generatedCode - OpenAIで生成されたコード
   * @param {Object} vrmContext - VRM実行コンテキスト
   * @returns {Promise<Object>} 実行結果
   */
  async executeVRMCode(generatedCode, vrmContext) {
    const startTime = Date.now();
    this.stats.executions++;
    
    console.log(`⚡ VRMコード実行開始 (${this.stats.executions}回目)`);
    
    try {
      // セキュリティチェック
      this.validateCodeSafety(generatedCode);
      
      // 実行環境の準備
      const context = this.createSecureContext(vrmContext);
      
      // タイムアウト付きでコード実行
      const result = await this.executeWithTimeout(generatedCode, context);
      
      // 実行後の検証
      const validatedResult = this.validateResult(result);
      
      const executionTime = Date.now() - startTime;
      this.stats.successes++;
      this.stats.totalTime += executionTime;
      
      console.log(`✅ VRMコード実行成功 (${executionTime}ms)`);
      return {
        success: true,
        result: validatedResult,
        executionTime: executionTime,
        stats: this.getStats()
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.stats.failures++;
      this.stats.totalTime += executionTime;
      
      console.error('❌ VRMコード実行エラー:', error.message);
      return {
        success: false,
        error: error.message,
        executionTime: executionTime,
        stats: this.getStats()
      };
    }
  }

  /**
   * コードの安全性を検証
   * @param {string} code - 検証対象のコード
   */
  validateCodeSafety(code) {
    // 危険なパターンをチェック
    const dangerousPatterns = [
      /require\s*\(/g,
      /import\s+/g,
      /process\./g,
      /fs\./g,
      /child_process/g,
      /eval\s*\(/g,
      /new\s+Function/g,
      /setTimeout/g,
      /setInterval/g,
      /fetch\s*\(/g,
      /XMLHttpRequest/g,
      /WebSocket/g,
      /__dirname/g,
      /__filename/g,
      /global\./g,
      /window\./g,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        throw new Error(`危険なパターンを検出: ${pattern.source}`);
      }
    }
    
    // 最大コード長チェック
    if (code.length > 50000) {
      throw new Error(`コードが長すぎます: ${code.length} 文字`);
    }
    
    console.log('🔒 コード安全性検証完了');
  }

  /**
   * 安全な実行コンテキストを作成
   * @param {Object} vrmContext - VRM関連のコンテキスト
   * @returns {Object} 実行コンテキスト
   */
  createSecureContext(vrmContext) {
    const context = {
      // Three.js関連（必要な部分のみ）
      THREE: this.createMockTHREE(),
      
      // VRM関連
      vrm: vrmContext.vrm || this.createMockVRM(),
      scene: vrmContext.scene || this.createMockScene(),
      camera: vrmContext.camera || this.createMockCamera(),
      renderer: vrmContext.renderer || this.createMockRenderer(),
      canvas: vrmContext.canvas || createCanvas(this.canvasWidth, this.canvasHeight),
      
      // ユーティリティ
      console: {
        log: (...args) => console.log('📄 [VRM Code]', ...args),
        error: (...args) => console.error('📄 [VRM Code]', ...args),
        warn: (...args) => console.warn('📄 [VRM Code]', ...args),
      },
      
      // 数学関数
      Math: Math,
      
      // Promise（制限付き）
      Promise: Promise,
      
      // 実行結果保存用
      __result: null,
      __imageData: null,
    };
    
    // Proxyでアクセス制御
    return new Proxy(context, {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        throw new Error(`アクセス禁止: ${String(prop)}`);
      },
      set(target, prop, value) {
        if (prop.startsWith('__')) {
          target[prop] = value;
          return true;
        }
        throw new Error(`変数設定禁止: ${String(prop)}`);
      }
    });
  }

  /**
   * タイムアウト付きでコードを実行
   * @param {string} code - 実行するコード
   * @param {Object} context - 実行コンテキスト
   * @returns {Promise<any>} 実行結果
   */
  async executeWithTimeout(code, context) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`実行タイムアウト: ${this.timeout}ms`));
      }, this.timeout);
      
      try {
        // コードをラップして実行
        const wrappedCode = `
        (async function() {
          ${code}
          
          // 関数が定義されていることを確認
          if (typeof renderVRMPanel !== 'function') {
            throw new Error('renderVRMPanel 関数が定義されていません');
          }
          
          // 実行
          const result = await renderVRMPanel(vrm, scene, camera, renderer, canvas);
          __result = result;
          return result;
        })();
        `;
        
        // VM環境で実行
        const script = new vm.Script(wrappedCode);
        const vmContext = vm.createContext(context);
        
        const promise = script.runInContext(vmContext);
        
        if (promise && typeof promise.then === 'function') {
          promise
            .then(result => {
              clearTimeout(timer);
              resolve(result || context.__result);
            })
            .catch(error => {
              clearTimeout(timer);
              reject(error);
            });
        } else {
          clearTimeout(timer);
          resolve(promise || context.__result);
        }
        
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  /**
   * 実行結果を検証
   * @param {any} result - 実行結果
   * @returns {any} 検証済み結果
   */
  validateResult(result) {
    if (!result) {
      throw new Error('実行結果が空です');
    }
    
    // 画像データの形式チェック
    if (typeof result === 'string') {
      if (result.startsWith('data:image/')) {
        console.log('🖼️ 画像データURL形式の結果を取得');
        return result;
      } else if (result === 'data:image/png;base64,mock-image-data') {
        console.log('🎭 モック画像データを取得');
        return result;
      }
    }
    
    // Buffer形式の場合
    if (Buffer.isBuffer(result)) {
      console.log('🖼️ Buffer形式の結果を取得');
      return `data:image/png;base64,${result.toString('base64')}`;
    }
    
    // その他の形式
    console.warn('⚠️ 予期しない結果形式:', typeof result);
    return result;
  }

  /**
   * Mock THREE.js オブジェクト
   */
  createMockTHREE() {
    return {
      Scene: class MockScene {
        constructor() {
          this.children = [];
        }
        add(obj) { this.children.push(obj); }
        remove(obj) { 
          const index = this.children.indexOf(obj);
          if (index > -1) this.children.splice(index, 1);
        }
      },
      PerspectiveCamera: class MockCamera {
        constructor(fov, aspect, near, far) {
          this.fov = fov || 50;
          this.aspect = aspect || 1;
          this.near = near || 0.1;
          this.far = far || 1000;
          this.position = { x: 0, y: 0, z: 0, set: (x, y, z) => { this.position.x = x; this.position.y = y; this.position.z = z; } };
        }
        lookAt() {}
        updateProjectionMatrix() {}
      },
      AmbientLight: class MockAmbientLight {
        constructor(color, intensity) {
          this.color = color;
          this.intensity = intensity;
          this.isLight = true;
        }
      },
      DirectionalLight: class MockDirectionalLight {
        constructor(color, intensity) {
          this.color = color;
          this.intensity = intensity;
          this.position = { x: 0, y: 0, z: 0, set: (x, y, z) => { this.position.x = x; this.position.y = y; this.position.z = z; } };
          this.isLight = true;
        }
      },
      WebGLRenderer: class MockRenderer {
        constructor() {
          this.domElement = createCanvas(800, 600);
        }
        render() {
          console.log('🎬 Mock renderer.render() called');
        }
        setSize() {}
      }
    };
  }

  /**
   * Mock VRM オブジェクト
   */
  createMockVRM() {
    return {
      scene: { children: [] },
      humanoid: {
        getBoneNode: (boneName) => ({
          rotation: { 
            x: 0, y: 0, z: 0,
            set: (x, y, z) => { console.log(`🦴 Bone ${boneName} rotation set:`, x, y, z); }
          }
        })
      },
      expressionManager: {
        setValue: (expressionName, value) => {
          console.log(`😊 Expression ${expressionName} set to:`, value);
        }
      },
      update: (deltaTime) => {
        console.log('🔄 VRM update called:', deltaTime);
      }
    };
  }

  /**
   * Mock Scene オブジェクト
   */
  createMockScene() {
    return {
      children: [],
      add: (obj) => { console.log('➕ Scene.add called'); },
      remove: (obj) => { console.log('➖ Scene.remove called'); }
    };
  }

  /**
   * Mock Camera オブジェクト
   */
  createMockCamera() {
    return {
      position: { 
        x: 0, y: 0, z: 0,
        set: (x, y, z) => { console.log('📷 Camera position set:', x, y, z); }
      },
      fov: 50,
      aspect: 1,
      lookAt: (x, y, z) => { console.log('👁️ Camera lookAt:', x, y, z); },
      updateProjectionMatrix: () => { console.log('🔄 Camera updateProjectionMatrix called'); }
    };
  }

  /**
   * Mock Renderer オブジェクト
   */
  createMockRenderer() {
    const canvas = createCanvas(this.canvasWidth, this.canvasHeight);
    return {
      domElement: canvas,
      render: (scene, camera) => { 
        console.log('🎬 Renderer.render called');
        
        // 簡易的なモック描画
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // VRMモックキャラクター描画
        ctx.fillStyle = '#ffdbac';
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height/2 - 50, 30, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.fillStyle = '#4a90e2';
        ctx.fillRect(canvas.width/2 - 25, canvas.height/2 - 20, 50, 80);
        
        // "Dynamic VRM" ラベル
        ctx.fillStyle = '#000';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Dynamic VRM', canvas.width/2, canvas.height - 30);
      },
      setSize: () => {}
    };
  }

  /**
   * 実行統計を取得
   * @returns {Object} 統計情報
   */
  getStats() {
    return {
      executions: this.stats.executions,
      successes: this.stats.successes,
      failures: this.stats.failures,
      successRate: this.stats.executions > 0 ? (this.stats.successes / this.stats.executions * 100).toFixed(1) + '%' : '0%',
      averageTime: this.stats.executions > 0 ? Math.round(this.stats.totalTime / this.stats.executions) + 'ms' : '0ms'
    };
  }

  /**
   * 統計をリセット
   */
  resetStats() {
    this.stats = {
      executions: 0,
      successes: 0,
      failures: 0,
      totalTime: 0
    };
    console.log('📊 実行統計をリセットしました');
  }
}

module.exports = DynamicVRMExecutor;