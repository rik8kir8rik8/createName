const AdvancedCharacterPoseSystem = require('./AdvancedCharacterPoseSystem');

/**
 * プロ品質キャラクター描画システム
 * AdvancedCharacterPoseSystemと連携してsample.png相当の人物描画を実現
 */
class ProfessionalCharacterRenderer {
  constructor(options = {}) {
    this.poseSystem = new AdvancedCharacterPoseSystem();
    this.renderQuality = options.quality || 'high';
    this.lineWeight = options.lineWeight || 2;
    this.detailLevel = options.detailLevel || 'normal';
    
    // プロ品質描画設定
    this.drawingStyles = {
      'professional': {
        lineVariation: true,      // 線の強弱
        anatomicalAccuracy: true, // 解剖学的正確性
        expressiveDetails: true,  // 表現力のある細部
        naturalProportions: true  // 自然なプロポーション
      },
      'manga': {
        stylizedFeatures: true,   // 様式化された特徴
        emotiveExaggeration: true,// 感情的誇張
        cleanLines: true,         // クリーンな線画
        characteristicShapes: true // 特徴的な形状
      }
    };
  }

  /**
   * キャラクターの高品質描画
   * @param {Object} ctx - Canvas描画コンテキスト
   * @param {Object} panel - パネル情報
   * @param {Object} characterData - キャラクターデータ
   * @param {Object} options - 描画オプション
   */
  async renderProfessionalCharacter(ctx, panel, characterData, options = {}) {
    try {
      console.log(`🎨 プロ品質キャラクター描画開始: ${characterData.pose}`);

      // 1. 高度ポーズ生成
      const poseName = characterData.advancedPose || characterData.pose || 'thinking';
      console.log(`🎭 使用ポーズ: ${poseName}`);
      
      const scale = this.calculateCharacterScale(panel, characterData);
      const offset = this.calculateCharacterPosition(panel, characterData);
      
      console.log(`📏 スケール: ${scale}, オフセット: ${JSON.stringify(offset)}`);
      
      const advancedPose = this.poseSystem.generateNaturalPose(poseName, {
        emotion: characterData.expression,
        scale: scale,
        offset: offset
      });

      // 2. 描画領域設定
      this.setupDrawingArea(ctx, panel);

      // 3. ベースシルエット描画
      await this.drawCharacterSilhouette(ctx, panel, advancedPose);

      // 4. 詳細部位描画
      await this.drawDetailedBodyParts(ctx, panel, advancedPose, characterData);

      // 5. 顔・表情描画
      await this.drawFacialExpression(ctx, panel, advancedPose, characterData);

      // 6. 手の詳細描画
      await this.drawDetailedHands(ctx, panel, advancedPose);

      // 7. 服装・装飾描画
      await this.drawClothing(ctx, panel, advancedPose, characterData);

      // 8. 仕上げ・効果線
      await this.applyFinishingTouches(ctx, panel, advancedPose, characterData);

      console.log(`✅ プロ品質キャラクター描画完了`);
      
      return {
        success: true,
        pose: advancedPose,
        renderTime: Date.now(),
        quality: this.renderQuality
      };
    } catch (error) {
      console.error('❌ プロ品質キャラクター描画エラー:', error);
      throw error;
    }
  }

  /**
   * キャラクタースケール計算
   * @param {Object} panel - パネル情報
   * @param {Object} characterData - キャラクターデータ
   * @returns {number} スケール値
   */
  calculateCharacterScale(panel, characterData) {
    // パネルサイズとカメラタイプに基づくスケール計算
    const baseScale = Math.min(panel.width, panel.height) / 400;
    
    // カメラタイプによる調整
    let cameraMultiplier = 1.0;
    if (characterData.camera?.type === 'close-up') {
      cameraMultiplier = 1.8; // クローズアップは大きく
    } else if (characterData.camera?.type === 'wide-shot') {
      cameraMultiplier = 0.6; // ワイドショットは小さく
    }
    
    return baseScale * cameraMultiplier;
  }

  /**
   * キャラクター位置計算
   * @param {Object} panel - パネル情報
   * @param {Object} characterData - キャラクターデータ
   * @returns {Object} オフセット位置
   */
  calculateCharacterPosition(panel, characterData) {
    const centerX = panel.x + panel.width / 2;
    const centerY = panel.y + panel.height / 2;
    
    // ポーズに応じた位置調整
    let offsetY = 0;
    if (characterData.pose === 'sitting_floor') {
      offsetY = panel.height * 0.2; // 座りポーズは下に
    } else if (characterData.pose === 'standing_up') {
      offsetY = panel.height * 0.1; // 立ち上がりは少し下に
    }
    
    return {
      x: centerX,
      y: centerY + offsetY,
      z: 0
    };
  }

  /**
   * 描画領域設定
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} panel - パネル情報
   */
  setupDrawingArea(ctx, panel) {
    ctx.save();
    
    // パネル内にクリップ
    ctx.beginPath();
    ctx.rect(panel.x, panel.y, panel.width, panel.height);
    ctx.clip();
    
    // 高品質描画設定
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  /**
   * キャラクターシルエット描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} panel - パネル情報
   * @param {Object} pose - ポーズデータ
   */
  async drawCharacterSilhouette(ctx, panel, pose) {
    console.log(`🎨 シルエット描画開始: スケルトン要素数 ${Object.keys(pose.skeleton).length}`);
    
    // ベースとなる人体シルエットを描画
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = this.lineWeight;
    ctx.fillStyle = '#ffdbac'; // 肌色
    
    // 頭部シルエット
    if (pose.skeleton.head) {
      const head = pose.skeleton.head;
      const headRadius = 25 * (head.scale || 1.0);
      
      console.log(`👤 頭部描画: (${head.position.x}, ${head.position.y}), 半径: ${headRadius}`);
      
      ctx.beginPath();
      ctx.arc(head.position.x, head.position.y, headRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      console.log('⚠️ 頭部データなし');
    }
    
    // 胴体シルエット
    if (pose.skeleton.spine) {
      const spine = pose.skeleton.spine;
      const torsoWidth = 40 * (spine.scale || 1.0);
      const torsoHeight = 80 * (spine.scale || 1.0);
      
      console.log(`🫁 胴体描画: (${spine.position.x}, ${spine.position.y}), サイズ: ${torsoWidth}x${torsoHeight}`);
      
      ctx.fillStyle = '#87ceeb'; // 服の色
      ctx.beginPath();
      ctx.ellipse(
        spine.position.x, 
        spine.position.y + 40,
        torsoWidth / 2, 
        torsoHeight / 2,
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    } else {
      console.log('⚠️ 胴体データなし');
    }
  }

  /**
   * 詳細身体部位描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} panel - パネル情報
   * @param {Object} pose - ポーズデータ
   * @param {Object} characterData - キャラクターデータ
   */
  async drawDetailedBodyParts(ctx, panel, pose, characterData) {
    // 腕の描画
    await this.drawArms(ctx, pose);
    
    // 脚の描画
    await this.drawLegs(ctx, pose);
    
    // 首・肩の描画
    await this.drawNeckAndShoulders(ctx, pose);
  }

  /**
   * 腕の詳細描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} pose - ポーズデータ
   */
  async drawArms(ctx, pose) {
    console.log(`🦾 腕の描画開始: スケルトン ${Object.keys(pose.skeleton).join(', ')}`);
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    ['L', 'R'].forEach(side => {
      const spine = pose.skeleton.spine;
      const upperArm = pose.skeleton[`upperArm${side}`];
      const lowerArm = pose.skeleton[`lowerArm${side}`];
      const hand = pose.skeleton[`hand${side}`];
      
      if (spine) {
        // 基本腕の描画（スケルトンにない場合の代替）
        const shoulderX = spine.position.x + (side === 'L' ? -25 : 25);
        const shoulderY = spine.position.y - 10;
        
        // 上腕の位置計算
        let upperArmX = shoulderX + (side === 'L' ? -20 : 20);
        let upperArmY = shoulderY + 30;
        
        // 前腕の位置計算
        let lowerArmX = upperArmX + (side === 'L' ? -15 : 15);
        let lowerArmY = upperArmY + 25;
        
        // 手の位置計算
        let handX = lowerArmX + (side === 'L' ? -10 : 10);
        let handY = lowerArmY + 20;
        
        // ポーズに応じた調整
        if (pose.poseName === 'thinking' && side === 'R') {
          // 右手を顎に当てるポーズ
          handX = spine.position.x + 15;
          handY = spine.position.y - 30; // 顎の位置
          lowerArmX = spine.position.x + 10;
          lowerArmY = spine.position.y - 15;
          upperArmX = shoulderX;
          upperArmY = shoulderY + 10;
        } else if (pose.poseName === 'surprised') {
          // 驚きで手を上げるポーズ
          upperArmX = shoulderX + (side === 'L' ? -10 : 10);
          upperArmY = shoulderY - 10;
          lowerArmX = upperArmX + (side === 'L' ? -5 : 5);
          lowerArmY = upperArmY - 15;
          handX = lowerArmX;
          handY = lowerArmY - 10;
        } else if (pose.poseName === 'sitting_floor') {
          // 膝に手を置くポーズ
          handY = spine.position.y + 60; // 膝の位置
          lowerArmY = handY - 15;
          upperArmY = lowerArmY - 20;
        }
        
        console.log(`  🤚 ${side}腕描画: 肩(${shoulderX},${shoulderY}) → 上腕(${upperArmX},${upperArmY}) → 前腕(${lowerArmX},${lowerArmY}) → 手(${handX},${handY})`);
        
        // 上腕
        ctx.beginPath();
        ctx.moveTo(shoulderX, shoulderY);
        ctx.lineTo(upperArmX, upperArmY);
        ctx.stroke();
        
        // 前腕
        ctx.beginPath();
        ctx.moveTo(upperArmX, upperArmY);
        ctx.lineTo(lowerArmX, lowerArmY);
        ctx.stroke();
        
        // 手
        ctx.beginPath();
        ctx.moveTo(lowerArmX, lowerArmY);
        ctx.lineTo(handX, handY);
        ctx.stroke();
        
        // 手の詳細（簡易的な円）
        ctx.fillStyle = '#ffdbac';
        ctx.beginPath();
        ctx.arc(handX, handY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
  }

  /**
   * 脚の詳細描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} pose - ポーズデータ
   */
  async drawLegs(ctx, pose) {
    ['L', 'R'].forEach(side => {
      const upperLeg = pose.skeleton[`upperLeg${side}`];
      const lowerLeg = pose.skeleton[`lowerLeg${side}`];
      const foot = pose.skeleton[`foot${side}`];
      
      if (upperLeg && lowerLeg) {
        // 太もも
        ctx.beginPath();
        ctx.moveTo(upperLeg.position.x, upperLeg.position.y);
        ctx.lineTo(lowerLeg.position.x, lowerLeg.position.y);
        ctx.stroke();
        
        // すね
        ctx.beginPath();
        ctx.moveTo(lowerLeg.position.x, lowerLeg.position.y);
        ctx.lineTo(foot?.position.x || lowerLeg.position.x, foot?.position.y || lowerLeg.position.y + 25);
        ctx.stroke();
      }
    });
  }

  /**
   * 首・肩の描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} pose - ポーズデータ
   */
  async drawNeckAndShoulders(ctx, pose) {
    const neck = pose.skeleton.neck;
    const shoulderL = pose.skeleton.shoulderL;
    const shoulderR = pose.skeleton.shoulderR;
    
    if (neck) {
      // 首
      ctx.beginPath();
      ctx.moveTo(neck.position.x, neck.position.y - 10);
      ctx.lineTo(neck.position.x, neck.position.y + 10);
      ctx.stroke();
    }
    
    // 肩ライン
    if (shoulderL && shoulderR) {
      ctx.beginPath();
      ctx.moveTo(shoulderL.position.x, shoulderL.position.y);
      ctx.lineTo(shoulderR.position.x, shoulderR.position.y);
      ctx.stroke();
    }
  }

  /**
   * 顔・表情の詳細描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} panel - パネル情報
   * @param {Object} pose - ポーズデータ
   * @param {Object} characterData - キャラクターデータ
   */
  async drawFacialExpression(ctx, panel, pose, characterData) {
    const head = pose.skeleton.head;
    if (!head) return;
    
    const faceX = head.position.x;
    const faceY = head.position.y - 30;
    const faceScale = head.scale || 1.0;
    const expression = pose.facialExpression;
    
    // 目の描画
    await this.drawEyes(ctx, faceX, faceY, faceScale, expression);
    
    // 眉毛の描画
    await this.drawEyebrows(ctx, faceX, faceY, faceScale, expression);
    
    // 口の描画
    await this.drawMouth(ctx, faceX, faceY, faceScale, expression);
    
    // 鼻の描画（簡略）
    await this.drawNose(ctx, faceX, faceY, faceScale);
  }

  /**
   * 目の詳細描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {number} faceX - 顔中心X座標
   * @param {number} faceY - 顔中心Y座標
   * @param {number} scale - スケール
   * @param {Object} expression - 表情データ
   */
  async drawEyes(ctx, faceX, faceY, scale, expression) {
    const eyeData = this.poseSystem.facialExpressions.eyes[expression.eyes] || 
                   this.poseSystem.facialExpressions.eyes['calm'];
    
    const eyeWidth = 8 * scale * eyeData.size;
    const eyeHeight = 6 * scale * eyeData.openness;
    const eyeY = faceY - 5 * scale;
    
    // 左目
    ctx.beginPath();
    ctx.ellipse(faceX - 12 * scale, eyeY, eyeWidth, eyeHeight, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // 右目
    ctx.beginPath();
    ctx.ellipse(faceX + 12 * scale, eyeY, eyeWidth, eyeHeight, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // 瞳孔
    if (eyeData.focus !== 'closed') {
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(faceX - 12 * scale, eyeY, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(faceX + 12 * scale, eyeY, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // ハイライト
      if (eyeData.highlights) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(faceX - 10 * scale, eyeY - 2 * scale, 1.5 * scale, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(faceX + 14 * scale, eyeY - 2 * scale, 1.5 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /**
   * 眉毛の描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {number} faceX - 顔中心X座標
   * @param {number} faceY - 顔中心Y座標
   * @param {number} scale - スケール
   * @param {Object} expression - 表情データ
   */
  async drawEyebrows(ctx, faceX, faceY, scale, expression) {
    const browData = this.poseSystem.facialExpressions.eyebrows[expression.eyebrows] || 
                     this.poseSystem.facialExpressions.eyebrows['relaxed'];
    
    const browY = faceY - 15 * scale + browData.height * scale;
    const browLength = 10 * scale;
    const angle = browData.angle * Math.PI / 180;
    
    ctx.lineWidth = this.lineWeight;
    
    // 左眉
    ctx.beginPath();
    ctx.moveTo(
      faceX - 18 * scale + Math.cos(angle) * browLength, 
      browY + Math.sin(angle) * browLength
    );
    ctx.lineTo(
      faceX - 8 * scale - Math.cos(angle) * browLength,
      browY - Math.sin(angle) * browLength
    );
    ctx.stroke();
    
    // 右眉
    ctx.beginPath();
    ctx.moveTo(
      faceX + 8 * scale + Math.cos(angle) * browLength,
      browY - Math.sin(angle) * browLength
    );
    ctx.lineTo(
      faceX + 18 * scale - Math.cos(angle) * browLength,
      browY + Math.sin(angle) * browLength
    );
    ctx.stroke();
  }

  /**
   * 口の描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {number} faceX - 顔中心X座標
   * @param {number} faceY - 顔中心Y座標
   * @param {number} scale - スケール
   * @param {Object} expression - 表情データ
   */
  async drawMouth(ctx, faceX, faceY, scale, expression) {
    const mouthData = this.poseSystem.facialExpressions.mouth[expression.mouth] || 
                      this.poseSystem.facialExpressions.mouth['neutral_closed'];
    
    const mouthY = faceY + 8 * scale;
    const mouthWidth = 12 * scale * mouthData.width;
    const curve = mouthData.curve;
    
    if (mouthData.openness > 0) {
      // 開いた口
      const mouthHeight = 6 * scale * mouthData.openness;
      
      if (mouthData.shape === 'oval') {
        // 驚きの口（楕円）
        ctx.beginPath();
        ctx.ellipse(faceX, mouthY, mouthWidth / 2, mouthHeight / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 通常の開いた口
        ctx.beginPath();
        ctx.ellipse(faceX, mouthY, mouthWidth / 2, mouthHeight / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // 閉じた口（線または曲線）
      ctx.beginPath();
      ctx.moveTo(faceX - mouthWidth / 2, mouthY);
      
      if (curve > 0) {
        // 微笑み（上向きカーブ）
        ctx.quadraticCurveTo(faceX, mouthY - curve * scale, faceX + mouthWidth / 2, mouthY);
      } else if (curve < 0) {
        // 悲しみ（下向きカーブ）
        ctx.quadraticCurveTo(faceX, mouthY - curve * scale, faceX + mouthWidth / 2, mouthY);
      } else {
        // 真っ直ぐ
        ctx.lineTo(faceX + mouthWidth / 2, mouthY);
      }
      ctx.stroke();
    }
  }

  /**
   * 鼻の簡易描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {number} faceX - 顔中心X座標
   * @param {number} faceY - 顔中心Y座標
   * @param {number} scale - スケール
   */
  async drawNose(ctx, faceX, faceY, scale) {
    // 簡単な鼻の線
    ctx.beginPath();
    ctx.moveTo(faceX, faceY - 2 * scale);
    ctx.lineTo(faceX - 2 * scale, faceY + 2 * scale);
    ctx.stroke();
  }

  /**
   * 手の詳細描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} panel - パネル情報
   * @param {Object} pose - ポーズデータ
   */
  async drawDetailedHands(ctx, panel, pose) {
    ['handL', 'handR'].forEach(handBone => {
      const hand = pose.skeleton[handBone];
      const gesture = pose.handGestures[handBone];
      
      if (hand && gesture) {
        this.drawHandGesture(ctx, hand, gesture);
      } else if (hand) {
        this.drawBasicHand(ctx, hand);
      }
    });
  }

  /**
   * 手のジェスチャー描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} hand - 手の位置データ
   * @param {Object} gesture - ジェスチャーデータ
   */
  drawHandGesture(ctx, hand, gesture) {
    const handX = hand.position.x;
    const handY = hand.position.y;
    const scale = hand.scale || 1.0;
    
    // 手のひら
    ctx.beginPath();
    ctx.arc(handX, handY, 8 * scale, 0, Math.PI * 2);
    ctx.stroke();
    
    // 指の描画（簡略化）
    const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
    fingers.forEach((finger, index) => {
      const fingerData = gesture.fingers[finger];
      if (fingerData) {
        const angle = (index - 2) * 20 + fingerData.spread;
        const length = 12 * scale * (1 - fingerData.bend / 100);
        
        const endX = handX + Math.cos(angle * Math.PI / 180) * length;
        const endY = handY + Math.sin(angle * Math.PI / 180) * length;
        
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
  }

  /**
   * 基本的な手の描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} hand - 手の位置データ
   */
  drawBasicHand(ctx, hand) {
    const handX = hand.position.x;
    const handY = hand.position.y;
    const scale = hand.scale || 1.0;
    
    // シンプルな手の表現
    ctx.beginPath();
    ctx.arc(handX, handY, 6 * scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  /**
   * 服装描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} panel - パネル情報
   * @param {Object} pose - ポーズデータ
   * @param {Object} characterData - キャラクターデータ
   */
  async drawClothing(ctx, panel, pose, characterData) {
    const clothingColor = characterData.detailedAttributes?.clothingColor?.shirt || '#87ceeb';
    
    // 服の色設定
    ctx.fillStyle = clothingColor;
    ctx.strokeStyle = '#000000';
    
    // シャツ/上着の描画
    if (pose.skeleton.spine) {
      const spine = pose.skeleton.spine;
      const clothingWidth = 50 * spine.scale;
      const clothingHeight = 70 * spine.scale;
      
      ctx.beginPath();
      ctx.ellipse(
        spine.position.x,
        spine.position.y + 15,
        clothingWidth / 2,
        clothingHeight / 2,
        0, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();
    }
  }

  /**
   * 仕上げ・効果線適用
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} panel - パネル情報
   * @param {Object} pose - ポーズデータ
   * @param {Object} characterData - キャラクターデータ
   */
  async applyFinishingTouches(ctx, panel, pose, characterData) {
    // 特殊効果の描画
    if (pose.effects && pose.effects.includes('speed_lines')) {
      this.drawSpeedLines(ctx, panel, pose);
    }
    
    if (pose.effects && pose.effects.includes('emphasis_marks')) {
      this.drawEmphasisMarks(ctx, panel, pose);
    }
    
    // モーションラインの描画
    if (pose.motionLines && characterData.pose === 'standing_up') {
      this.drawMotionLines(ctx, panel, pose);
    }
    
    // 描画領域復元
    ctx.restore();
  }

  /**
   * 集中線描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} panel - パネル情報
   * @param {Object} pose - ポーズデータ
   */
  drawSpeedLines(ctx, panel, pose) {
    const centerX = panel.x + panel.width / 2;
    const centerY = panel.y + panel.height / 2;
    
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const length = Math.min(panel.width, panel.height) / 3;
      
      const endX = centerX + Math.cos(angle) * length;
      const endY = centerY + Math.sin(angle) * length;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  /**
   * 強調マーク描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} panel - パネル情報
   * @param {Object} pose - ポーズデータ
   */
  drawEmphasisMarks(ctx, panel, pose) {
    const head = pose.skeleton.head;
    if (!head) return;
    
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    
    // 驚きマーク
    ctx.beginPath();
    ctx.moveTo(head.position.x + 30, head.position.y - 50);
    ctx.lineTo(head.position.x + 20, head.position.y - 30);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(head.position.x + 40, head.position.y - 45);
    ctx.lineTo(head.position.x + 35, head.position.y - 25);
    ctx.stroke();
  }

  /**
   * モーションライン描画
   * @param {Object} ctx - 描画コンテキスト
   * @param {Object} panel - パネル情報
   * @param {Object} pose - ポーズデータ
   */
  drawMotionLines(ctx, panel, pose) {
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    
    // 立ち上がりの軌跡
    const spine = pose.skeleton.spine;
    if (spine) {
      ctx.beginPath();
      ctx.moveTo(spine.position.x, spine.position.y + 40);
      ctx.bezierCurveTo(
        spine.position.x - 10, spine.position.y + 20,
        spine.position.x + 10, spine.position.y - 10,
        spine.position.x, spine.position.y
      );
      ctx.stroke();
    }
    
    ctx.setLineDash([]); // ダッシュ解除
  }
}

module.exports = ProfessionalCharacterRenderer;