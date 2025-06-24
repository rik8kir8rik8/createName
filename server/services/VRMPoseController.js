/**
 * VRMポーズ・表情コントローラー
 * VRMモデルのポーズ・表情・アニメーションを高精度で制御
 */
class VRMPoseController {
  constructor(vrmRenderer) {
    this.vrmRenderer = vrmRenderer;
    this.currentPose = 'neutral';
    this.currentExpression = 'relaxed';
    this.transitionDuration = 1000; // ms
    this.isTransitioning = false;
    
    // ポーズライブラリ（VRM用に最適化）
    this.poseLibrary = {
      neutral: {
        name: '基本立ちポーズ',
        bones: {
          Head: { rotation: { x: 0, y: 0, z: 0 } },
          Neck: { rotation: { x: 0, y: 0, z: 0 } },
          Spine: { rotation: { x: 0, y: 0, z: 0 } },
          LeftUpperArm: { rotation: { x: 0, y: 0, z: 0 } },
          LeftLowerArm: { rotation: { x: 0, y: 0, z: 0 } },
          LeftHand: { rotation: { x: 0, y: 0, z: 0 } },
          RightUpperArm: { rotation: { x: 0, y: 0, z: 0 } },
          RightLowerArm: { rotation: { x: 0, y: 0, z: 0 } },
          RightHand: { rotation: { x: 0, y: 0, z: 0 } },
          LeftUpperLeg: { rotation: { x: 0, y: 0, z: 0 } },
          LeftLowerLeg: { rotation: { x: 0, y: 0, z: 0 } },
          LeftFoot: { rotation: { x: 0, y: 0, z: 0 } },
          RightUpperLeg: { rotation: { x: 0, y: 0, z: 0 } },
          RightLowerLeg: { rotation: { x: 0, y: 0, z: 0 } },
          RightFoot: { rotation: { x: 0, y: 0, z: 0 } }
        },
        lookAt: { x: 0, y: 0, z: -1 }
      },
      
      thinking: {
        name: '考え込むポーズ',
        bones: {
          Head: { rotation: { x: -0.1, y: 0.05, z: 0 } },
          Neck: { rotation: { x: -0.05, y: 0.02, z: 0 } },
          Spine: { rotation: { x: 0.02, y: 0, z: 0 } },
          LeftUpperArm: { rotation: { x: 0.1, y: 0, z: -0.1 } },
          LeftLowerArm: { rotation: { x: 0.3, y: 0, z: 0 } },
          LeftHand: { rotation: { x: 0, y: 0, z: 0 } },
          RightUpperArm: { rotation: { x: -0.8, y: 0, z: 0.3 } },
          RightLowerArm: { rotation: { x: -1.0, y: 0, z: 0 } },
          RightHand: { 
            rotation: { x: 0.2, y: 0, z: 0 },
            position: { x: 0.05, y: 0.15, z: 0.08 } // 顎の近く
          },
          LeftUpperLeg: { rotation: { x: 0, y: 0, z: 0 } },
          LeftLowerLeg: { rotation: { x: 0, y: 0, z: 0 } },
          LeftFoot: { rotation: { x: 0, y: 0, z: 0 } },
          RightUpperLeg: { rotation: { x: 0, y: 0, z: 0 } },
          RightLowerLeg: { rotation: { x: 0, y: 0, z: 0 } },
          RightFoot: { rotation: { x: 0, y: 0, z: 0 } }
        },
        lookAt: { x: 0.1, y: -0.2, z: -1 }, // 少し下向き
        weight: 0.8
      },
      
      surprised: {
        name: '驚きポーズ',
        bones: {
          Head: { rotation: { x: 0.1, y: 0, z: 0 } },
          Neck: { rotation: { x: 0.05, y: 0, z: 0 } },
          Spine: { rotation: { x: -0.1, y: 0, z: 0 } },
          LeftUpperArm: { rotation: { x: -0.5, y: 0, z: -0.2 } },
          LeftLowerArm: { rotation: { x: -0.3, y: 0, z: 0 } },
          LeftHand: { rotation: { x: 0, y: 0, z: 0 } },
          RightUpperArm: { rotation: { x: -0.5, y: 0, z: 0.2 } },
          RightLowerArm: { rotation: { x: -0.3, y: 0, z: 0 } },
          RightHand: { rotation: { x: 0, y: 0, z: 0 } },
          LeftUpperLeg: { rotation: { x: 0, y: 0, z: 0 } },
          LeftLowerLeg: { rotation: { x: 0, y: 0, z: 0 } },
          LeftFoot: { rotation: { x: 0, y: 0, z: 0 } },
          RightUpperLeg: { rotation: { x: 0, y: 0, z: 0 } },
          RightLowerLeg: { rotation: { x: 0, y: 0, z: 0 } },
          RightFoot: { rotation: { x: 0, y: 0, z: 0 } }
        },
        lookAt: { x: 0, y: 0.1, z: -1 }, // 少し上向き
        weight: 1.0
      },
      
      sitting: {
        name: '座りポーズ',
        bones: {
          Head: { rotation: { x: 0, y: 0, z: 0 } },
          Neck: { rotation: { x: 0, y: 0, z: 0 } },
          Spine: { rotation: { x: 0.2, y: 0, z: 0 } },
          LeftUpperArm: { rotation: { x: 0.15, y: 0, z: -0.1 } },
          LeftLowerArm: { rotation: { x: 0.3, y: 0, z: 0 } },
          LeftHand: { 
            rotation: { x: 0.1, y: 0, z: 0 },
            position: { x: -0.05, y: -0.1, z: 0.1 } // 膝の上
          },
          RightUpperArm: { rotation: { x: 0.15, y: 0, z: 0.1 } },
          RightLowerArm: { rotation: { x: 0.3, y: 0, z: 0 } },
          RightHand: { 
            rotation: { x: 0.1, y: 0, z: 0 },
            position: { x: 0.05, y: -0.1, z: 0.1 } // 膝の上
          },
          LeftUpperLeg: { rotation: { x: 1.5, y: 0, z: -0.1 } },
          LeftLowerLeg: { rotation: { x: -1.2, y: 0, z: 0 } },
          LeftFoot: { rotation: { x: 0.3, y: 0, z: 0 } },
          RightUpperLeg: { rotation: { x: 1.5, y: 0, z: 0.1 } },
          RightLowerLeg: { rotation: { x: -1.2, y: 0, z: 0 } },
          RightFoot: { rotation: { x: 0.3, y: 0, z: 0 } }
        },
        lookAt: { x: 0, y: -0.1, z: -1 },
        weight: 1.0
      },
      
      smiling: {
        name: '微笑みポーズ',
        bones: {
          Head: { rotation: { x: 0, y: 0, z: 0 } },
          Neck: { rotation: { x: 0, y: 0, z: 0 } },
          Spine: { rotation: { x: 0, y: 0, z: 0 } },
          LeftUpperArm: { rotation: { x: 0.05, y: 0, z: -0.05 } },
          LeftLowerArm: { rotation: { x: 0.1, y: 0, z: 0 } },
          LeftHand: { rotation: { x: 0, y: 0, z: 0 } },
          RightUpperArm: { rotation: { x: 0.05, y: 0, z: 0.05 } },
          RightLowerArm: { rotation: { x: 0.1, y: 0, z: 0 } },
          RightHand: { rotation: { x: 0, y: 0, z: 0 } },
          LeftUpperLeg: { rotation: { x: 0, y: 0, z: 0 } },
          LeftLowerLeg: { rotation: { x: 0, y: 0, z: 0 } },
          LeftFoot: { rotation: { x: 0, y: 0, z: 0 } },
          RightUpperLeg: { rotation: { x: 0, y: 0, z: 0 } },
          RightLowerLeg: { rotation: { x: 0, y: 0, z: 0 } },
          RightFoot: { rotation: { x: 0, y: 0, z: 0 } }
        },
        lookAt: { x: 0, y: 0, z: -1 },
        weight: 0.6
      },
      
      standing_up: {
        name: '立ち上がりポーズ',
        bones: {
          Head: { rotation: { x: -0.05, y: 0, z: 0 } },
          Neck: { rotation: { x: -0.02, y: 0, z: 0 } },
          Spine: { rotation: { x: 0.15, y: 0, z: 0 } },
          LeftUpperArm: { rotation: { x: -0.2, y: 0, z: -0.3 } },
          LeftLowerArm: { rotation: { x: -0.3, y: 0, z: 0 } },
          LeftHand: { rotation: { x: 0, y: 0, z: 0 } },
          RightUpperArm: { rotation: { x: -0.15, y: 0, z: 0.2 } },
          RightLowerArm: { rotation: { x: -0.25, y: 0, z: 0 } },
          RightHand: { rotation: { x: 0, y: 0, z: 0 } },
          LeftUpperLeg: { rotation: { x: 1.0, y: 0, z: -0.05 } },
          LeftLowerLeg: { rotation: { x: -0.5, y: 0, z: 0 } },
          LeftFoot: { rotation: { x: 0.2, y: 0, z: 0 } },
          RightUpperLeg: { rotation: { x: 1.2, y: 0, z: 0.05 } },
          RightLowerLeg: { rotation: { x: -0.3, y: 0, z: 0 } },
          RightFoot: { rotation: { x: 0.1, y: 0, z: 0 } }
        },
        lookAt: { x: 0, y: 0.05, z: -1 },
        weight: 1.0
      }
    };
    
    // 表情ライブラリ（VRM標準表情）
    this.expressionLibrary = {
      neutral: { name: 'ニュートラル', values: {} },
      happy: { 
        name: '喜び', 
        values: { 
          happy: 0.8,
          relaxed: 0.2 
        } 
      },
      sad: { 
        name: '悲しみ', 
        values: { 
          sad: 0.9 
        } 
      },
      angry: { 
        name: '怒り', 
        values: { 
          angry: 0.8 
        } 
      },
      surprised: { 
        name: '驚き', 
        values: { 
          surprised: 1.0 
        } 
      },
      relaxed: { 
        name: 'リラックス', 
        values: { 
          relaxed: 0.6 
        } 
      },
      thinking: { 
        name: '考え中', 
        values: { 
          relaxed: 0.3,
          sad: 0.1 
        } 
      },
      smiling: { 
        name: '微笑み', 
        values: { 
          happy: 0.6,
          relaxed: 0.4 
        } 
      }
    };
    
    console.log('🎭 VRMポーズコントローラー初期化完了');
  }

  /**
   * ポーズの適用
   * @param {string} poseName - ポーズ名
   * @param {Object} options - オプション
   */
  async applyPose(poseName, options = {}) {
    try {
      console.log(`🤸 VRMポーズ適用開始: ${poseName}`);
      
      const poseData = this.poseLibrary[poseName];
      if (!poseData) {
        console.warn(`⚠️ ポーズが見つかりません: ${poseName}`);
        return false;
      }
      
      // トランジションの実行
      if (options.transition && !this.isTransitioning) {
        await this.transitionToPose(poseName, options);
      } else {
        await this.setImmediatePose(poseName, options);
      }
      
      this.currentPose = poseName;
      console.log(`✅ VRMポーズ適用完了: ${poseName}`);
      return true;
    } catch (error) {
      console.error(`❌ VRMポーズ適用エラー: ${poseName}`, error);
      return false;
    }
  }

  /**
   * 即座にポーズ設定
   * @param {string} poseName - ポーズ名
   * @param {Object} options - オプション
   */
  async setImmediatePose(poseName, options = {}) {
    const poseData = this.poseLibrary[poseName];
    if (!poseData) return false;
    
    try {
      // VRMモデルにポーズを適用
      if (this.vrmRenderer && this.vrmRenderer.vrmModel) {
        await this.applyBonesToVRM(poseData.bones, 1.0);
        
        // 視線の設定
        if (poseData.lookAt && this.vrmRenderer.vrmModel.lookAt) {
          this.vrmRenderer.vrmModel.lookAt.target.set(
            poseData.lookAt.x,
            poseData.lookAt.y,
            poseData.lookAt.z
          );
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ 即座ポーズ設定エラー:', error);
      return false;
    }
  }

  /**
   * ポーズトランジション
   * @param {string} targetPoseName - 目標ポーズ名
   * @param {Object} options - オプション
   */
  async transitionToPose(targetPoseName, options = {}) {
    if (this.isTransitioning) {
      console.log('⚠️ 既にトランジション中です');
      return false;
    }
    
    this.isTransitioning = true;
    
    try {
      console.log(`🔄 ポーズトランジション開始: ${this.currentPose} → ${targetPoseName}`);
      
      const fromPose = this.poseLibrary[this.currentPose];
      const toPose = this.poseLibrary[targetPoseName];
      const duration = options.duration || this.transitionDuration;
      const steps = options.steps || 30;
      const stepDuration = duration / steps;
      
      for (let step = 0; step <= steps; step++) {
        const progress = step / steps;
        const easedProgress = this.easeInOutCubic(progress);
        
        // 補間されたポーズを適用
        const interpolatedBones = this.interpolateBones(
          fromPose.bones, 
          toPose.bones, 
          easedProgress
        );
        
        await this.applyBonesToVRM(interpolatedBones, 1.0);
        
        // 視線の補間
        if (fromPose.lookAt && toPose.lookAt && this.vrmRenderer.vrmModel.lookAt) {
          const lookAt = this.interpolateLookAt(fromPose.lookAt, toPose.lookAt, easedProgress);
          this.vrmRenderer.vrmModel.lookAt.target.set(lookAt.x, lookAt.y, lookAt.z);
        }
        
        // 次のステップまで待機
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
      
      console.log(`✅ ポーズトランジション完了: ${targetPoseName}`);
      return true;
    } catch (error) {
      console.error('❌ ポーズトランジションエラー:', error);
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * VRMモデルにボーンデータを適用
   * @param {Object} bones - ボーンデータ
   * @param {number} weight - 適用強度
   */
  async applyBonesToVRM(bones, weight = 1.0) {
    if (!this.vrmRenderer || !this.vrmRenderer.vrmModel || !this.vrmRenderer.vrmModel.humanoid) {
      return false;
    }
    
    try {
      Object.keys(bones).forEach(boneName => {
        const boneData = bones[boneName];
        const bone = this.vrmRenderer.vrmModel.humanoid.getBone(boneName);
        
        if (bone && bone.node) {
          // 回転の適用
          if (boneData.rotation) {
            bone.node.rotation.x = (boneData.rotation.x || 0) * weight;
            bone.node.rotation.y = (boneData.rotation.y || 0) * weight;
            bone.node.rotation.z = (boneData.rotation.z || 0) * weight;
          }
          
          // 位置の適用（相対位置）
          if (boneData.position) {
            bone.node.position.x += (boneData.position.x || 0) * weight;
            bone.node.position.y += (boneData.position.y || 0) * weight;
            bone.node.position.z += (boneData.position.z || 0) * weight;
          }
        }
      });
      
      return true;
    } catch (error) {
      console.error('❌ VRMボーン適用エラー:', error);
      return false;
    }
  }

  /**
   * ボーンデータの補間
   * @param {Object} fromBones - 開始ボーン
   * @param {Object} toBones - 終了ボーン
   * @param {number} t - 補間係数 (0-1)
   */
  interpolateBones(fromBones, toBones, t) {
    const interpolated = {};
    
    Object.keys(toBones).forEach(boneName => {
      const fromBone = fromBones[boneName] || { rotation: { x: 0, y: 0, z: 0 } };
      const toBone = toBones[boneName];
      
      interpolated[boneName] = {
        rotation: {
          x: this.lerp(fromBone.rotation?.x || 0, toBone.rotation?.x || 0, t),
          y: this.lerp(fromBone.rotation?.y || 0, toBone.rotation?.y || 0, t),
          z: this.lerp(fromBone.rotation?.z || 0, toBone.rotation?.z || 0, t)
        }
      };
      
      // 位置の補間
      if (fromBone.position || toBone.position) {
        interpolated[boneName].position = {
          x: this.lerp(fromBone.position?.x || 0, toBone.position?.x || 0, t),
          y: this.lerp(fromBone.position?.y || 0, toBone.position?.y || 0, t),
          z: this.lerp(fromBone.position?.z || 0, toBone.position?.z || 0, t)
        };
      }
    });
    
    return interpolated;
  }

  /**
   * 視線の補間
   * @param {Object} fromLookAt - 開始視線
   * @param {Object} toLookAt - 終了視線
   * @param {number} t - 補間係数
   */
  interpolateLookAt(fromLookAt, toLookAt, t) {
    return {
      x: this.lerp(fromLookAt.x, toLookAt.x, t),
      y: this.lerp(fromLookAt.y, toLookAt.y, t),
      z: this.lerp(fromLookAt.z, toLookAt.z, t)
    };
  }

  /**
   * 表情の設定
   * @param {string} expressionName - 表情名
   * @param {Object} options - オプション
   */
  async setExpression(expressionName, options = {}) {
    try {
      console.log(`😊 VRM表情設定開始: ${expressionName}`);
      
      const expressionData = this.expressionLibrary[expressionName];
      if (!expressionData) {
        console.warn(`⚠️ 表情が見つかりません: ${expressionName}`);
        return false;
      }
      
      // トランジションの実行
      if (options.transition && !this.isTransitioning) {
        await this.transitionToExpression(expressionName, options);
      } else {
        await this.setImmediateExpression(expressionName, options);
      }
      
      this.currentExpression = expressionName;
      console.log(`✅ VRM表情設定完了: ${expressionName}`);
      return true;
    } catch (error) {
      console.error(`❌ VRM表情設定エラー: ${expressionName}`, error);
      return false;
    }
  }

  /**
   * 即座に表情設定
   * @param {string} expressionName - 表情名
   * @param {Object} options - オプション
   */
  async setImmediateExpression(expressionName, options = {}) {
    const expressionData = this.expressionLibrary[expressionName];
    if (!expressionData) return false;
    
    try {
      if (this.vrmRenderer && this.vrmRenderer.vrmModel && this.vrmRenderer.vrmModel.expressionManager) {
        // 全ての表情をリセット
        Object.keys(this.expressionLibrary).forEach(name => {
          this.vrmRenderer.vrmModel.expressionManager.setValue(name, 0);
        });
        
        // 指定した表情を適用
        Object.keys(expressionData.values).forEach(expressionKey => {
          const value = expressionData.values[expressionKey] * (options.intensity || 1.0);
          this.vrmRenderer.vrmModel.expressionManager.setValue(expressionKey, value);
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ 即座表情設定エラー:', error);
      return false;
    }
  }

  /**
   * 表情トランジション
   * @param {string} targetExpressionName - 目標表情名
   * @param {Object} options - オプション
   */
  async transitionToExpression(targetExpressionName, options = {}) {
    if (this.isTransitioning) {
      console.log('⚠️ 既にトランジション中です');
      return false;
    }
    
    this.isTransitioning = true;
    
    try {
      console.log(`🔄 表情トランジション開始: ${this.currentExpression} → ${targetExpressionName}`);
      
      const fromExpression = this.expressionLibrary[this.currentExpression];
      const toExpression = this.expressionLibrary[targetExpressionName];
      const duration = options.duration || 500; // 表情は早めに変化
      const steps = options.steps || 20;
      const stepDuration = duration / steps;
      
      for (let step = 0; step <= steps; step++) {
        const progress = step / steps;
        const easedProgress = this.easeInOutCubic(progress);
        
        // 補間された表情を適用
        await this.applyInterpolatedExpression(
          fromExpression.values,
          toExpression.values,
          easedProgress,
          options.intensity || 1.0
        );
        
        // 次のステップまで待機
        await new Promise(resolve => setTimeout(resolve, stepDuration));
      }
      
      console.log(`✅ 表情トランジション完了: ${targetExpressionName}`);
      return true;
    } catch (error) {
      console.error('❌ 表情トランジションエラー:', error);
      return false;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * 補間された表情の適用
   * @param {Object} fromValues - 開始表情値
   * @param {Object} toValues - 終了表情値
   * @param {number} t - 補間係数
   * @param {number} intensity - 強度
   */
  async applyInterpolatedExpression(fromValues, toValues, t, intensity) {
    if (!this.vrmRenderer || !this.vrmRenderer.vrmModel || !this.vrmRenderer.vrmModel.expressionManager) {
      return false;
    }
    
    try {
      // 全ての表情キーを取得
      const allKeys = new Set([...Object.keys(fromValues), ...Object.keys(toValues)]);
      
      allKeys.forEach(key => {
        const fromValue = fromValues[key] || 0;
        const toValue = toValues[key] || 0;
        const interpolatedValue = this.lerp(fromValue, toValue, t) * intensity;
        
        this.vrmRenderer.vrmModel.expressionManager.setValue(key, interpolatedValue);
      });
      
      return true;
    } catch (error) {
      console.error('❌ 補間表情適用エラー:', error);
      return false;
    }
  }

  /**
   * ポーズと表情の複合設定
   * @param {string} poseName - ポーズ名
   * @param {string} expressionName - 表情名
   * @param {Object} options - オプション
   */
  async setPoseAndExpression(poseName, expressionName, options = {}) {
    console.log(`🎭 ポーズ・表情複合設定: ${poseName} + ${expressionName}`);
    
    try {
      // 並行実行
      const [poseResult, expressionResult] = await Promise.all([
        this.applyPose(poseName, options),
        this.setExpression(expressionName, options)
      ]);
      
      const success = poseResult && expressionResult;
      console.log(`✅ ポーズ・表情複合設定完了: ${success ? '成功' : '一部失敗'}`);
      return success;
    } catch (error) {
      console.error('❌ ポーズ・表情複合設定エラー:', error);
      return false;
    }
  }

  /**
   * ランダムポーズ生成
   * @param {Array} excludePoses - 除外するポーズ
   */
  generateRandomPose(excludePoses = []) {
    const availablePoses = Object.keys(this.poseLibrary).filter(
      pose => !excludePoses.includes(pose) && pose !== this.currentPose
    );
    
    if (availablePoses.length === 0) {
      console.log('⚠️ 利用可能なランダムポーズがありません');
      return null;
    }
    
    const randomPose = availablePoses[Math.floor(Math.random() * availablePoses.length)];
    console.log(`🎲 ランダムポーズ生成: ${randomPose}`);
    return randomPose;
  }

  /**
   * ランダム表情生成
   * @param {Array} excludeExpressions - 除外する表情
   */
  generateRandomExpression(excludeExpressions = []) {
    const availableExpressions = Object.keys(this.expressionLibrary).filter(
      expression => !excludeExpressions.includes(expression) && expression !== this.currentExpression
    );
    
    if (availableExpressions.length === 0) {
      console.log('⚠️ 利用可能なランダム表情がありません');
      return null;
    }
    
    const randomExpression = availableExpressions[Math.floor(Math.random() * availableExpressions.length)];
    console.log(`🎲 ランダム表情生成: ${randomExpression}`);
    return randomExpression;
  }

  /**
   * ポーズ情報の取得
   * @param {string} poseName - ポーズ名
   */
  getPoseInfo(poseName) {
    const pose = this.poseLibrary[poseName];
    if (!pose) return null;
    
    return {
      name: pose.name,
      bones: Object.keys(pose.bones).length,
      hasLookAt: !!pose.lookAt,
      weight: pose.weight || 1.0
    };
  }

  /**
   * 表情情報の取得
   * @param {string} expressionName - 表情名
   */
  getExpressionInfo(expressionName) {
    const expression = this.expressionLibrary[expressionName];
    if (!expression) return null;
    
    return {
      name: expression.name,
      values: Object.keys(expression.values).length,
      intensity: Math.max(...Object.values(expression.values))
    };
  }

  /**
   * 利用可能なポーズ一覧
   */
  getAvailablePoses() {
    return Object.keys(this.poseLibrary).map(key => ({
      key: key,
      name: this.poseLibrary[key].name,
      info: this.getPoseInfo(key)
    }));
  }

  /**
   * 利用可能な表情一覧
   */
  getAvailableExpressions() {
    return Object.keys(this.expressionLibrary).map(key => ({
      key: key,
      name: this.expressionLibrary[key].name,
      info: this.getExpressionInfo(key)
    }));
  }

  /**
   * 線形補間
   * @param {number} a - 開始値
   * @param {number} b - 終了値
   * @param {number} t - 補間係数
   */
  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * イージング関数（Cubic In-Out）
   * @param {number} t - 時間係数 (0-1)
   */
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * 現在の状態取得
   */
  getCurrentState() {
    return {
      pose: this.currentPose,
      expression: this.currentExpression,
      isTransitioning: this.isTransitioning,
      poseInfo: this.getPoseInfo(this.currentPose),
      expressionInfo: this.getExpressionInfo(this.currentExpression)
    };
  }

  /**
   * リセット
   */
  reset() {
    console.log('🔄 VRMポーズコントローラーリセット');
    
    this.currentPose = 'neutral';
    this.currentExpression = 'relaxed';
    this.isTransitioning = false;
    
    // ニュートラル状態に設定
    this.setImmediatePose('neutral');
    this.setImmediateExpression('relaxed');
  }
}

module.exports = VRMPoseController;