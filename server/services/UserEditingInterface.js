/**
 * ユーザー編集インターフェース
 * 3Dシーンのリアルタイム編集機能を提供
 * 
 * 主な機能:
 * - カメラ角度・位置のリアルタイム調整
 * - キャラクター位置・ポーズの編集
 * - 3Dオブジェクト配置の変更
 * - プレビュー機能
 */

const Three3DRenderer = require('./Three3DRenderer_fallback');
const DifyTo3DMapper = require('./DifyTo3DMapper');

class UserEditingInterface {
  constructor(options = {}) {
    this.panelWidth = options.panelWidth || 400;
    this.panelHeight = options.panelHeight || 300;
    
    // 3Dレンダラーとマッパーの初期化
    this.three3DRenderer = new Three3DRenderer({
      width: this.panelWidth,
      height: this.panelHeight
    });
    this.difyTo3DMapper = new DifyTo3DMapper();
    
    // 編集状態の管理
    this.editingSessions = new Map();
    
    console.log('🎨 UserEditingInterface initialized');
  }

  /**
   * 新しい編集セッションを開始
   * @param {string} sessionId - セッションID
   * @param {Object} originalCompositionData - 元のDify構図データ
   * @returns {Object} 編集セッション情報
   */
  startEditingSession(sessionId, originalCompositionData) {
    try {
      console.log(`🎬 Starting editing session: ${sessionId}`);
      
      // Difyデータを3Dパラメーターに変換
      const sceneData = this.difyTo3DMapper.mapTo3DParameters(originalCompositionData);
      
      // 編集セッションを作成
      const session = {
        id: sessionId,
        originalData: originalCompositionData,
        currentSceneData: JSON.parse(JSON.stringify(sceneData)), // ディープコピー
        editHistory: [],
        isActive: true,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      };
      
      this.editingSessions.set(sessionId, session);
      
      console.log(`✅ Editing session created: ${sessionId}`);
      return {
        sessionId: sessionId,
        initialSceneData: sceneData,
        editableElements: this.getEditableElements(sceneData)
      };
      
    } catch (error) {
      console.error(`❌ Failed to start editing session ${sessionId}:`, error);
      throw new Error(`Editing session creation failed: ${error.message}`);
    }
  }

  /**
   * 編集可能な要素の一覧を取得
   * @param {Object} sceneData - シーンデータ
   * @returns {Object} 編集可能要素
   */
  getEditableElements(sceneData) {
    return {
      camera: {
        position: {
          x: { min: -20, max: 20, current: sceneData.camera.position.x },
          y: { min: -10, max: 20, current: sceneData.camera.position.y },
          z: { min: 1, max: 30, current: sceneData.camera.position.z }
        },
        target: {
          x: { min: -10, max: 10, current: sceneData.camera.target.x },
          y: { min: -5, max: 10, current: sceneData.camera.target.y },
          z: { min: -20, max: 5, current: sceneData.camera.target.z }
        },
        fov: { min: 20, max: 120, current: sceneData.camera.fov }
      },
      character: sceneData.character.visible ? {
        position: {
          x: { min: -10, max: 10, current: sceneData.character.position.x },
          y: { min: 0, max: 5, current: sceneData.character.position.y },
          z: { min: -5, max: 10, current: sceneData.character.position.z }
        },
        pose: {
          current: sceneData.character.pose,
          options: ['standing', 'sitting', 'sitting-up', 'looking', 'opening-curtain', 'walking']
        },
        clothing: {
          current: sceneData.character.clothing,
          options: ['pajamas', 't-shirt', 'shirt', 'suit', 'casual', 'dress']
        },
        expression: {
          current: sceneData.character.expression,
          options: ['neutral', 'sleepy', 'happy', 'interested', 'surprised', 'relaxed']
        }
      } : null,
      background: {
        environment: {
          current: sceneData.background.environment,
          options: ['bedroom', 'living-room', 'classroom', 'street', 'room']
        },
        lighting: {
          current: sceneData.background.lighting,
          options: ['morning', 'noon', 'evening', 'night', 'artificial']
        }
      }
    };
  }

  /**
   * カメラ設定を更新
   * @param {string} sessionId - セッションID
   * @param {Object} cameraUpdate - カメラ更新データ
   * @returns {Buffer} 更新されたプレビュー画像
   */
  async updateCamera(sessionId, cameraUpdate) {
    try {
      const session = this.editingSessions.get(sessionId);
      if (!session || !session.isActive) {
        throw new Error(`Invalid or inactive session: ${sessionId}`);
      }

      console.log(`📹 Updating camera for session ${sessionId}:`, cameraUpdate);

      // カメラ設定を更新
      if (cameraUpdate.position) {
        Object.assign(session.currentSceneData.camera.position, cameraUpdate.position);
      }
      if (cameraUpdate.target) {
        Object.assign(session.currentSceneData.camera.target, cameraUpdate.target);
      }
      if (cameraUpdate.fov) {
        session.currentSceneData.camera.fov = cameraUpdate.fov;
      }

      // 編集履歴に追加
      session.editHistory.push({
        type: 'camera_update',
        timestamp: new Date().toISOString(),
        changes: cameraUpdate
      });
      session.lastModified = new Date().toISOString();

      // プレビュー画像を生成
      const previewImage = await this.generatePreview(sessionId);
      
      console.log(`✅ Camera updated for session ${sessionId}`);
      return previewImage;

    } catch (error) {
      console.error(`❌ Failed to update camera for session ${sessionId}:`, error);
      throw new Error(`Camera update failed: ${error.message}`);
    }
  }

  /**
   * キャラクター設定を更新
   * @param {string} sessionId - セッションID
   * @param {Object} characterUpdate - キャラクター更新データ
   * @returns {Buffer} 更新されたプレビュー画像
   */
  async updateCharacter(sessionId, characterUpdate) {
    try {
      const session = this.editingSessions.get(sessionId);
      if (!session || !session.isActive) {
        throw new Error(`Invalid or inactive session: ${sessionId}`);
      }

      console.log(`👤 Updating character for session ${sessionId}:`, characterUpdate);

      // キャラクター設定を更新
      if (characterUpdate.position) {
        Object.assign(session.currentSceneData.character.position, characterUpdate.position);
      }
      if (characterUpdate.pose) {
        session.currentSceneData.character.pose = characterUpdate.pose;
      }
      if (characterUpdate.clothing) {
        session.currentSceneData.character.clothing = characterUpdate.clothing;
      }
      if (characterUpdate.expression) {
        session.currentSceneData.character.expression = characterUpdate.expression;
      }

      // 編集履歴に追加
      session.editHistory.push({
        type: 'character_update',
        timestamp: new Date().toISOString(),
        changes: characterUpdate
      });
      session.lastModified = new Date().toISOString();

      // プレビュー画像を生成
      const previewImage = await this.generatePreview(sessionId);
      
      console.log(`✅ Character updated for session ${sessionId}`);
      return previewImage;

    } catch (error) {
      console.error(`❌ Failed to update character for session ${sessionId}:`, error);
      throw new Error(`Character update failed: ${error.message}`);
    }
  }

  /**
   * 背景設定を更新
   * @param {string} sessionId - セッションID
   * @param {Object} backgroundUpdate - 背景更新データ
   * @returns {Buffer} 更新されたプレビュー画像
   */
  async updateBackground(sessionId, backgroundUpdate) {
    try {
      const session = this.editingSessions.get(sessionId);
      if (!session || !session.isActive) {
        throw new Error(`Invalid or inactive session: ${sessionId}`);
      }

      console.log(`🏠 Updating background for session ${sessionId}:`, backgroundUpdate);

      // 背景設定を更新
      if (backgroundUpdate.environment) {
        session.currentSceneData.background.environment = backgroundUpdate.environment;
      }
      if (backgroundUpdate.lighting) {
        session.currentSceneData.background.lighting = backgroundUpdate.lighting;
      }

      // 編集履歴に追加
      session.editHistory.push({
        type: 'background_update',
        timestamp: new Date().toISOString(),
        changes: backgroundUpdate
      });
      session.lastModified = new Date().toISOString();

      // プレビュー画像を生成
      const previewImage = await this.generatePreview(sessionId);
      
      console.log(`✅ Background updated for session ${sessionId}`);
      return previewImage;

    } catch (error) {
      console.error(`❌ Failed to update background for session ${sessionId}:`, error);
      throw new Error(`Background update failed: ${error.message}`);
    }
  }

  /**
   * プレビュー画像を生成
   * @param {string} sessionId - セッションID
   * @returns {Buffer} プレビュー画像バッファ
   */
  async generatePreview(sessionId) {
    try {
      const session = this.editingSessions.get(sessionId);
      if (!session || !session.isActive) {
        throw new Error(`Invalid or inactive session: ${sessionId}`);
      }

      console.log(`🖼️ Generating preview for session ${sessionId}`);

      // Three3DRendererでプレビューを生成
      const previewBuffer = await this.three3DRenderer.render3DScene(session.currentSceneData);
      
      console.log(`✅ Preview generated for session ${sessionId}`);
      return previewBuffer;

    } catch (error) {
      console.error(`❌ Failed to generate preview for session ${sessionId}:`, error);
      throw new Error(`Preview generation failed: ${error.message}`);
    }
  }

  /**
   * 編集を確定し、最終的な構図データを取得
   * @param {string} sessionId - セッションID
   * @returns {Object} 確定された構図データ
   */
  finalizeEditing(sessionId) {
    try {
      const session = this.editingSessions.get(sessionId);
      if (!session || !session.isActive) {
        throw new Error(`Invalid or inactive session: ${sessionId}`);
      }

      console.log(`✅ Finalizing editing session ${sessionId}`);

      // セッションを非アクティブに
      session.isActive = false;
      session.finalizedAt = new Date().toISOString();

      // 最終的なシーンデータを返す
      const finalSceneData = session.currentSceneData;
      
      console.log(`🎯 Editing session ${sessionId} finalized`);
      return {
        sessionId: sessionId,
        finalSceneData: finalSceneData,
        editHistory: session.editHistory,
        statistics: {
          totalEdits: session.editHistory.length,
          duration: new Date(session.finalizedAt) - new Date(session.createdAt),
          editTypes: this.getEditStatistics(session.editHistory)
        }
      };

    } catch (error) {
      console.error(`❌ Failed to finalize editing session ${sessionId}:`, error);
      throw new Error(`Editing finalization failed: ${error.message}`);
    }
  }

  /**
   * 編集をキャンセル
   * @param {string} sessionId - セッションID
   * @returns {Object} 元の構図データ
   */
  cancelEditing(sessionId) {
    try {
      const session = this.editingSessions.get(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      console.log(`❌ Canceling editing session ${sessionId}`);

      // セッションを削除
      this.editingSessions.delete(sessionId);
      
      return {
        sessionId: sessionId,
        originalData: session.originalData,
        canceled: true,
        canceledAt: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Failed to cancel editing session ${sessionId}:`, error);
      throw new Error(`Editing cancellation failed: ${error.message}`);
    }
  }

  /**
   * 編集セッションの一覧を取得
   * @returns {Array} アクティブなセッション一覧
   */
  getActiveSessions() {
    const activeSessions = [];
    
    for (const [sessionId, session] of this.editingSessions.entries()) {
      if (session.isActive) {
        activeSessions.push({
          sessionId: sessionId,
          createdAt: session.createdAt,
          lastModified: session.lastModified,
          editCount: session.editHistory.length
        });
      }
    }
    
    return activeSessions;
  }

  /**
   * 編集統計を取得
   * @param {Array} editHistory - 編集履歴
   * @returns {Object} 編集統計
   */
  getEditStatistics(editHistory) {
    const stats = {
      camera_update: 0,
      character_update: 0,
      background_update: 0
    };

    editHistory.forEach(edit => {
      if (stats.hasOwnProperty(edit.type)) {
        stats[edit.type]++;
      }
    });

    return stats;
  }

  /**
   * 編集セッションの詳細情報を取得
   * @param {string} sessionId - セッションID
   * @returns {Object} セッション詳細
   */
  getSessionDetails(sessionId) {
    const session = this.editingSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      id: session.id,
      isActive: session.isActive,
      createdAt: session.createdAt,
      lastModified: session.lastModified,
      editHistory: session.editHistory,
      currentSceneData: session.currentSceneData,
      editableElements: this.getEditableElements(session.currentSceneData)
    };
  }

  /**
   * リソースのクリーンアップ
   */
  dispose() {
    // アクティブなセッションをクリーンアップ
    this.editingSessions.clear();
    
    // 3Dレンダラーをクリーンアップ
    if (this.three3DRenderer) {
      this.three3DRenderer.dispose();
    }
    
    console.log('🧹 UserEditingInterface disposed');
  }

  /**
   * プリセット適用機能
   * @param {string} sessionId - セッションID
   * @param {string} presetName - プリセット名
   * @returns {Buffer} 更新されたプレビュー画像
   */
  async applyPreset(sessionId, presetName) {
    try {
      const session = this.editingSessions.get(sessionId);
      if (!session || !session.isActive) {
        throw new Error(`Invalid or inactive session: ${sessionId}`);
      }

      console.log(`🎨 Applying preset '${presetName}' to session ${sessionId}`);

      const presets = this.getAvailablePresets();
      const preset = presets[presetName];
      
      if (!preset) {
        throw new Error(`Preset not found: ${presetName}`);
      }

      // プリセットを適用
      if (preset.camera) {
        Object.assign(session.currentSceneData.camera, preset.camera);
      }
      if (preset.character) {
        Object.assign(session.currentSceneData.character, preset.character);
      }
      if (preset.background) {
        Object.assign(session.currentSceneData.background, preset.background);
      }

      // 編集履歴に追加
      session.editHistory.push({
        type: 'preset_applied',
        timestamp: new Date().toISOString(),
        presetName: presetName
      });
      session.lastModified = new Date().toISOString();

      // プレビュー画像を生成
      const previewImage = await this.generatePreview(sessionId);
      
      console.log(`✅ Preset '${presetName}' applied to session ${sessionId}`);
      return previewImage;

    } catch (error) {
      console.error(`❌ Failed to apply preset for session ${sessionId}:`, error);
      throw new Error(`Preset application failed: ${error.message}`);
    }
  }

  /**
   * 利用可能なプリセット一覧を取得
   * @returns {Object} プリセット一覧
   */
  getAvailablePresets() {
    return {
      'close-up': {
        name: 'クローズアップ',
        description: 'キャラクターの表情を重視した近距離カメラ',
        camera: {
          position: { x: 0, y: 2, z: 3 },
          fov: 60
        }
      },
      'wide-shot': {
        name: 'ワイドショット',
        description: '部屋全体を捉える広角カメラ',
        camera: {
          position: { x: 0, y: 3, z: 15 },
          fov: 40
        }
      },
      'dramatic-angle': {
        name: 'ドラマチック角度',
        description: '斜めからの印象的なカメラアングル',
        camera: {
          position: { x: 5, y: 4, z: 8 },
          target: { x: -1, y: 1, z: 0 },
          fov: 55
        }
      },
      'morning-light': {
        name: '朝の光',
        description: '朝の柔らかな光の演出',
        background: {
          lighting: 'morning',
          ambientColor: '#FFF8DC',
          lightIntensity: 0.9
        }
      }
    };
  }
}

module.exports = UserEditingInterface;