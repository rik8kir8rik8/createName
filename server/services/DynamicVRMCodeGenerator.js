/**
 * 動的VRMコード生成システム
 * OpenAI APIを使用してコマ情報から具体的なVRM制御コードを生成
 */

// Node.js 18+のビルトインfetchを使用

class DynamicVRMCodeGenerator {
  constructor(options = {}) {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.model = options.model || 'gpt-4';
    this.temperature = options.temperature || 0.1; // 一貫性重視
    this.maxTokens = options.maxTokens || 2000;
    
    if (!this.openaiApiKey) {
      console.warn('⚠️ OPENAI_API_KEY が設定されていません。モックモードで動作します。');
    }
    
    console.log('🤖 DynamicVRMCodeGenerator 初期化完了');
  }

  /**
   * コマ情報からVRM制御コードを生成
   * @param {Object} panelData - パネルデータ
   * @returns {Promise<string>} 生成されたJavaScriptコード
   */
  async generateVRMCode(panelData) {
    console.log(`🎨 VRMコード生成開始: Panel ${panelData.panel_number}`);
    
    try {
      // プロンプト作成
      const prompt = this.createVRMCodePrompt(panelData);
      
      // OpenAI API呼び出し
      const generatedCode = await this.callOpenAI(prompt);
      
      // コード検証・サニタイズ
      const validatedCode = this.validateAndSanitizeCode(generatedCode);
      
      console.log(`✅ VRMコード生成完了: ${validatedCode.length} 文字`);
      return validatedCode;
      
    } catch (error) {
      console.error('❌ VRMコード生成エラー:', error);
      
      // フォールバック: 基本的なVRMコードを返す
      return this.getFallbackVRMCode(panelData);
    }
  }

  /**
   * コマ情報からVRM用プロンプトを作成
   * @param {Object} panelData - パネルデータ
   * @returns {string} OpenAI用プロンプト
   */
  createVRMCodePrompt(panelData) {
    const character = panelData.content.characters?.[0] || {};
    const composition = panelData.composition_data || {};
    
    return `あなたはThree.js + VRM専門のコード生成エンジンです。
マンガのコマ生成用に、具体的で実行可能なJavaScriptコードを生成してください。

【コマ情報】
- コマ番号: ${panelData.panel_number}
- ポーズ詳細: "${composition.characterDetails || character.pose || 'standing'}"
- 表情: "${character.emotion || 'neutral'}"
- カメラアングル: "${composition.cameraAngle || 'middle'}"
- 背景: "${composition.backgroundDetails || panelData.content.background || 'simple room'}"
- 視覚効果: "${composition.visualEffects || 'normal'}"

【要求仕様】
1. VRMヒューマノイドボーンでのポーズ制御（sample.png相当の品質）
2. BlendShapeでの表情制御
3. カメラ位置・アングル設定
4. マンガ風白黒線画レンダリング設定
5. Node.js環境での動作

【技術制約】
- three.js r167+ 対応
- @pixiv/three-vrm 使用
- 既存のVRMRenderer, ComicPageRendererクラスと統合
- エラーハンドリング必須
- パフォーマンス重視

【出力要求】
以下の関数形式で、実行可能なコードのみを出力してください：

\`\`\`javascript
async function renderVRMPanel(vrm, scene, camera, renderer, canvas) {
  try {
    // ポーズ制御
    if (vrm.humanoid) {
      // 具体的なボーン制御コード
      // 例: vrm.humanoid.getBoneNode('rightUpperArm').rotation.set(x, y, z);
    }
    
    // 表情制御  
    if (vrm.expressionManager) {
      // 具体的な表情制御コード
      // 例: vrm.expressionManager.setValue('happy', 0.8);
    }
    
    // カメラ設定
    // 具体的なカメラ位置設定
    
    // ライティング設定（マンガ風）
    // 白黒線画風のライティング設定
    
    // レンダリング実行
    renderer.render(scene, camera);
    
    // Canvas出力
    const imageData = renderer.domElement.toDataURL('image/png');
    return imageData;
    
  } catch (error) {
    console.error('VRM rendering error:', error);
    throw error;
  }
}
\`\`\`

【重要】
- コードブロック以外は出力しないでください
- 実際に動作する具体的な数値を使用してください
- sample.pngのような高品質な線画表現を目指してください`;
  }

  /**
   * OpenAI APIを呼び出し
   * @param {string} prompt - プロンプト
   * @returns {Promise<string>} 生成されたコード
   */
  async callOpenAI(prompt) {
    if (!this.openaiApiKey) {
      console.log('🔄 OpenAI API未設定、モックコードを返します');
      return this.getMockVRMCode();
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'あなたはThree.js + VRM専門のエキスパートプログラマーです。高品質で実行可能なコードのみを生成してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0]?.message?.content || '';
    
    // コードブロックを抽出
    return this.extractCodeFromResponse(generatedText);
  }

  /**
   * レスポンスからJavaScriptコードを抽出
   * @param {string} response - OpenAIレスポンス
   * @returns {string} 抽出されたコード
   */
  extractCodeFromResponse(response) {
    // ```javascript または ``` で囲まれたコードブロックを抽出
    const codeBlockRegex = /```(?:javascript)?\s*\n([\s\S]*?)\n```/g;
    const matches = response.match(codeBlockRegex);
    
    if (matches && matches.length > 0) {
      // 最初のコードブロックを使用
      return matches[0]
        .replace(/```(?:javascript)?\s*\n/, '')
        .replace(/\n```$/, '')
        .trim();
    }
    
    // コードブロックが見つからない場合は全体を返す
    return response.trim();
  }

  /**
   * コードの検証とサニタイズ
   * @param {string} code - 生成されたコード
   * @returns {string} 検証済みコード
   */
  validateAndSanitizeCode(code) {
    // 危険な関数の除去
    const dangerousFunctions = [
      'eval', 'Function', 'setTimeout', 'setInterval',
      'require', 'import', 'process', 'fs', 'child_process'
    ];
    
    let sanitizedCode = code;
    
    // 危険な関数チェック
    dangerousFunctions.forEach(func => {
      if (sanitizedCode.includes(func)) {
        console.warn(`⚠️ 危険な関数を検出: ${func}`);
        // 簡易的な置換（本格的にはAST解析が必要）
        sanitizedCode = sanitizedCode.replace(new RegExp(`\\b${func}\\b`, 'g'), `/* ${func} removed */`);
      }
    });
    
    // 基本的な構文チェック
    try {
      new Function(sanitizedCode);
      console.log('✅ コード構文検証成功');
    } catch (error) {
      console.warn('⚠️ コード構文エラー:', error.message);
      // フォールバックコードを返す
      return this.getFallbackVRMCode();
    }
    
    return sanitizedCode;
  }

  /**
   * フォールバック用のVRMコード
   * @param {Object} panelData - パネルデータ
   * @returns {string} フォールバックコード
   */
  getFallbackVRMCode(panelData = {}) {
    const character = panelData?.content?.characters?.[0] || {};
    const composition = panelData?.composition_data || {};
    
    return `async function renderVRMPanel(vrm, scene, camera, renderer, canvas) {
  try {
    console.log('🔄 フォールバックVRMレンダリング実行');
    
    // 基本ポーズ設定
    if (vrm.humanoid) {
      // ニュートラルポーズ
      const bones = ['neck', 'chest', 'spine', 'hips'];
      bones.forEach(boneName => {
        const bone = vrm.humanoid.getBoneNode(boneName);
        if (bone) {
          bone.rotation.set(0, 0, 0);
        }
      });
      
      // 表情に応じた簡単なポーズ調整
      const emotion = "${character.emotion || 'neutral'}";
      if (emotion === 'thinking') {
        const rightUpperArm = vrm.humanoid.getBoneNode('rightUpperArm');
        if (rightUpperArm) rightUpperArm.rotation.z = -0.5;
      } else if (emotion === 'surprised') {
        const leftUpperArm = vrm.humanoid.getBoneNode('leftUpperArm');
        const rightUpperArm = vrm.humanoid.getBoneNode('rightUpperArm');
        if (leftUpperArm) leftUpperArm.rotation.z = 0.8;
        if (rightUpperArm) rightUpperArm.rotation.z = -0.8;
      }
    }
    
    // 基本表情設定
    if (vrm.expressionManager) {
      // 全表情をリセット
      vrm.expressionManager.setValue('happy', 0);
      vrm.expressionManager.setValue('sad', 0);
      vrm.expressionManager.setValue('surprised', 0);
      
      // 指定表情を適用
      const emotion = "${character.emotion || 'neutral'}";
      switch (emotion) {
        case 'happy':
          vrm.expressionManager.setValue('happy', 0.8);
          break;
        case 'surprised':
          vrm.expressionManager.setValue('surprised', 0.9);
          break;
        case 'sad':
          vrm.expressionManager.setValue('sad', 0.7);
          break;
      }
    }
    
    // カメラ設定
    const cameraAngle = "${composition.cameraAngle || 'middle'}";
    switch (cameraAngle) {
      case 'near':
        camera.position.set(0, 1.6, 1.5);
        camera.fov = 35;
        break;
      case 'far':
        camera.position.set(0, 1.5, 4.5);
        camera.fov = 50;
        break;
      default: // middle
        camera.position.set(0, 1.6, 3.0);
        camera.fov = 42;
        break;
    }
    camera.lookAt(0, 1.2, 0);
    camera.updateProjectionMatrix();
    
    // マンガ風ライティング
    scene.children.forEach(child => {
      if (child.isLight) scene.remove(child);
    });
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // VRM更新
    if (vrm.update) {
      vrm.update(0.016); // 60fps想定
    }
    
    // レンダリング実行
    renderer.render(scene, camera);
    
    // Canvas出力
    const imageData = renderer.domElement.toDataURL('image/png');
    console.log('✅ フォールバックVRMレンダリング完了');
    return imageData;
    
  } catch (error) {
    console.error('❌ フォールバックVRMレンダリングエラー:', error);
    throw error;
  }
}`;
  }

  /**
   * モック用のVRMコード
   * @returns {string} モックコード
   */
  getMockVRMCode() {
    return `async function renderVRMPanel(vrm, scene, camera, renderer, canvas) {
  console.log('🎭 モックVRMレンダリング実行');
  
  // モック処理
  if (vrm && vrm.scene) {
    renderer.render(scene, camera);
  }
  
  return 'data:image/png;base64,mock-image-data';
}`;
  }

  /**
   * 複数パネル用のバッチ生成
   * @param {Array} panelsData - パネルデータ配列
   * @returns {Promise<Array>} 生成されたコード配列
   */
  async generateBatchVRMCodes(panelsData) {
    console.log(`🔄 バッチVRMコード生成開始: ${panelsData.length}パネル`);
    
    const codes = [];
    
    for (let i = 0; i < panelsData.length; i++) {
      const panel = panelsData[i];
      console.log(`📝 Panel ${i + 1}/${panelsData.length} 処理中...`);
      
      try {
        const code = await this.generateVRMCode(panel);
        codes.push({
          panelNumber: panel.panel_number,
          code: code,
          success: true
        });
      } catch (error) {
        console.error(`❌ Panel ${panel.panel_number} コード生成失敗:`, error);
        codes.push({
          panelNumber: panel.panel_number,
          code: this.getFallbackVRMCode(panel),
          success: false,
          error: error.message
        });
      }
      
      // API制限回避のための待機（OpenAI RPM制限対策）
      if (i < panelsData.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`✅ バッチVRMコード生成完了: ${codes.length}コード`);
    return codes;
  }
}

module.exports = DynamicVRMCodeGenerator;