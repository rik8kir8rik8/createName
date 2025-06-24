import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import './ThreeJSPreview.css';

const ThreeJSPreview = ({ panelData, sceneData, width = 400, height = 300 }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useThreeJS, setUseThreeJS] = useState(false);

  // 初期化時にThree.jsの可用性をチェック
  useEffect(() => {
    if (typeof THREE !== 'undefined') {
      setUseThreeJS(true);
      console.log('Three.js is available');
    } else {
      console.warn('Three.js is not available, using fallback display');
      setUseThreeJS(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!panelData || !useThreeJS) {
      setLoading(false);
      return;
    }

    let retryCount = 0;
    const maxRetries = 5; // 最大5回まで試行

    const initThreeJS = async () => {
      // DOM要素が準備されるまで待つ
      if (!mountRef.current) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.warn('ThreeJSPreview: mountRef not ready after max retries, using fallback');
          setUseThreeJS(false);
          setLoading(false);
          return;
        }
        console.log(`ThreeJSPreview: mountRef not ready, waiting... (${retryCount}/${maxRetries})`);
        setTimeout(initThreeJS, 200);
        return;
      }
      
      try {
        console.log(`🎬 Starting Three.js initialization for panel ${panelData.panel_number}`);
        setLoading(true);
        setError(null);

        // シーンの作成
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        sceneRef.current = scene;
        console.log('✅ Scene created');

        // カメラの作成
        const camera = new THREE.PerspectiveCamera(
          75,
          width / height,
          0.1,
          1000
        );
        camera.position.set(0, 2, 5);
        cameraRef.current = camera;
        console.log('✅ Camera created');

        // レンダラーの作成
        const renderer = new THREE.WebGLRenderer({ 
          antialias: true,
          alpha: true 
        });
        renderer.setSize(width, height);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        rendererRef.current = renderer;
        console.log('✅ Renderer created');

        // DOM要素に追加
        if (mountRef.current) {
          mountRef.current.innerHTML = '';
          mountRef.current.appendChild(renderer.domElement);
          console.log('✅ Canvas added to DOM');
        }

        // ライティングの設定
        setupLighting(scene);
        console.log('✅ Lighting setup complete');

        // 環境の構築
        setupEnvironment(scene, sceneData);
        console.log('✅ Environment setup complete');

        // VRMキャラクターの追加
        if (panelData.content.characters && panelData.content.characters.length > 0) {
          console.log('📊 Difyデータ:', JSON.stringify(sceneData, null, 2));
          console.log('👥 キャラクターデータ:', JSON.stringify(panelData.content.characters, null, 2));
          await setupVRMCharacters(scene, panelData.content.characters, sceneData);
          console.log('✅ VRM Characters setup complete');
        }

        // カメラアングルの設定
        setupCamera(camera, sceneData);
        console.log('✅ Camera positioning complete');

        // 初回レンダリング
        renderer.render(scene, camera);
        console.log('✅ Initial render complete');

        // レンダリングループ
        const animate = () => {
          animationRef.current = requestAnimationFrame(animate);
          renderer.render(scene, camera);
        };
        animate();

        // 少し遅延してからloading状態を解除（確実にレンダリングが完了するまで）
        setTimeout(() => {
          setLoading(false);
          console.log(`🎉 Three.js preview fully initialized for panel ${panelData.panel_number}`);
        }, 100);

      } catch (err) {
        console.error('Three.js initialization error:', err);
        setError(`3D表示の初期化に失敗しました: ${err.message}`);
        setLoading(false);
      }
    };

    // 初期化開始
    initThreeJS();

    // クリーンアップ
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (sceneRef.current) {
        // シーン内のオブジェクトを削除
        while (sceneRef.current.children.length > 0) {
          const child = sceneRef.current.children[0];
          sceneRef.current.remove(child);
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
    };
  }, [panelData, sceneData, width, height, useThreeJS]);

  const setupLighting = (scene) => {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // メインライト（太陽光）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // フィルライト
    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
    fillLight.position.set(-3, 5, -3);
    scene.add(fillLight);
  };

  const setupEnvironment = (scene, sceneData) => {
    // 床
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshLambertMaterial({ color: 0xd2b48c });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // 壁（後ろ）
    const wallGeometry = new THREE.PlaneGeometry(20, 8);
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0xf5f5dc });
    const backWall = new THREE.Mesh(wallGeometry, wallMaterial);
    backWall.position.set(0, 4, -10);
    scene.add(backWall);

    // 壁（左）
    const leftWall = new THREE.Mesh(wallGeometry, wallMaterial);
    leftWall.position.set(-10, 4, 0);
    leftWall.rotation.y = Math.PI / 2;
    scene.add(leftWall);

    // ベッドの追加（必要に応じて）
    if (sceneData?.background?.props?.includes('bed')) {
      addBed(scene);
    }

    // 窓の追加（必要に応じて）
    if (sceneData?.background?.props?.includes('window')) {
      addWindow(scene);
    }
  };

  const addBed = (scene) => {
    // ベッドフレーム
    const frameGeometry = new THREE.BoxGeometry(4, 0.5, 6);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const bedFrame = new THREE.Mesh(frameGeometry, frameMaterial);
    bedFrame.position.set(-2, 0.25, 2);
    bedFrame.castShadow = true;
    scene.add(bedFrame);

    // マットレス
    const mattressGeometry = new THREE.BoxGeometry(3.8, 0.3, 5.8);
    const mattressMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const mattress = new THREE.Mesh(mattressGeometry, mattressMaterial);
    mattress.position.set(-2, 0.65, 2);
    mattress.castShadow = true;
    scene.add(mattress);

    // 枕
    const pillowGeometry = new THREE.BoxGeometry(1, 0.2, 0.6);
    const pillowMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const pillow = new THREE.Mesh(pillowGeometry, pillowMaterial);
    pillow.position.set(-2, 0.9, 4.5);
    pillow.castShadow = true;
    scene.add(pillow);
  };

  const addWindow = (scene) => {
    // 窓枠
    const frameGeometry = new THREE.BoxGeometry(3, 4, 0.2);
    const frameMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const windowFrame = new THREE.Mesh(frameGeometry, frameMaterial);
    windowFrame.position.set(3, 4, -9.9);
    scene.add(windowFrame);

    // ガラス
    const glassGeometry = new THREE.PlaneGeometry(2.8, 3.8);
    const glassMaterial = new THREE.MeshLambertMaterial({ 
      color: 0x87ceeb, 
      transparent: true, 
      opacity: 0.3 
    });
    const glass = new THREE.Mesh(glassGeometry, glassMaterial);
    glass.position.set(3, 4, -9.8);
    scene.add(glass);
  };

  const setupVRMCharacters = async (scene, characters, sceneData) => {
    for (let index = 0; index < characters.length; index++) {
      const character = characters[index];
      try {
        const vrmModel = await loadVRMModel('/ten.vrm');
        
        // キャラクターの位置を調整
        const spacing = 3;
        const xPos = (index - (characters.length - 1) / 2) * spacing;
        vrmModel.scene.position.set(xPos, 0, 0);
        
        // デバッグ: VRMの初期状態をログ出力
        console.log(`🔍 VRM Model Debug - Position: (${vrmModel.scene.position.x}, ${vrmModel.scene.position.y}, ${vrmModel.scene.position.z})`);
        console.log(`🔍 VRM Model Debug - Rotation: (${vrmModel.scene.rotation.x}, ${vrmModel.scene.rotation.y}, ${vrmModel.scene.rotation.z})`);
        console.log(`🔍 VRM Model Debug - Scale: (${vrmModel.scene.scale.x}, ${vrmModel.scene.scale.y}, ${vrmModel.scene.scale.z})`);
        if (vrmModel.vrm.humanoid) {
          console.log(`🔍 VRM Humanoid available:`, Object.keys(vrmModel.vrm.humanoid.normalizedHumanBones || {}));
        }
        
        // キャラクター情報をログ出力
        console.log(`👤 Loading VRM character: ${character.name || 'Unknown'} with emotion: ${character.emotion || 'neutral'} and pose: ${character.pose || 'standing'}`);
        
        // Dify構図データをVRMに適用
        console.log(`🎯 Calling applyDifyDataToVRM for character ${index}`);
        applyDifyDataToVRM(vrmModel, character, sceneData, index);
        console.log(`✅ Finished applyDifyDataToVRM for character ${index}`);
        
        scene.add(vrmModel.scene);
      } catch (error) {
        console.error(`Failed to load VRM model for character ${index}:`, error);
        // フォールバックとして従来の幾何学モデルを使用
        const fallbackCharacter = createCharacter(character, sceneData);
        const spacing = 3;
        const xPos = (index - (characters.length - 1) / 2) * spacing;
        fallbackCharacter.position.set(xPos, 0, 0);
        scene.add(fallbackCharacter);
      }
    }
  };
  
  const loadVRMModel = async (url) => {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.register((parser) => {
        return new VRMLoaderPlugin(parser);
      });
      
      loader.load(
        url,
        (gltf) => {
          const vrm = gltf.userData.vrm;
          if (vrm) {
            // VRMのセットアップ
            VRMUtils.removeUnnecessaryVertices(gltf.scene);
            
            // 基本ポーズを設定 (初期Tポーズから自然な立ちポーズへ)
            if (vrm.humanoid) {
              console.log('🦴 Setting up basic VRM pose...');
              vrm.humanoid.resetNormalizedPose();
              
              // 腕を下げて自然な立ちポーズに
              const leftUpperArm = vrm.humanoid.getNormalizedBoneNode('leftUpperArm');
              const rightUpperArm = vrm.humanoid.getNormalizedBoneNode('rightUpperArm');
              
              console.log('🦴 leftUpperArm:', leftUpperArm ? 'Found' : 'Not found');
              console.log('🦴 rightUpperArm:', rightUpperArm ? 'Found' : 'Not found');
              
              if (leftUpperArm) {
                leftUpperArm.rotation.z = Math.PI / 3; // 60度下げる（より明確に）
                console.log('🦴 Set left arm rotation:', leftUpperArm.rotation.z);
              }
              if (rightUpperArm) {
                rightUpperArm.rotation.z = -Math.PI / 3; // 60度下げる（より明確に）
                console.log('🦴 Set right arm rotation:', rightUpperArm.rotation.z);
              }
              
              console.log('✅ Basic VRM pose setup complete');
            }
            
            // モデルを前向きに設定 (デフォルトで後ろ向きの場合)
            gltf.scene.rotation.y = Math.PI; // 180度回転して前向きに
            
            console.log('✅ VRM model loaded successfully');
            resolve({ scene: gltf.scene, vrm });
          } else {
            reject(new Error('No VRM data found in the loaded model'));
          }
        },
        (progress) => {
          console.log('VRM loading progress:', (progress.loaded / progress.total * 100) + '%');
        },
        (error) => {
          console.error('VRM loading error:', error);
          reject(error);
        }
      );
    });
  };
  
  // フォールバック用の従来関数を保持 (未使用だがエラー時に必要)
  // eslint-disable-next-line no-unused-vars
  const setupCharacters = (scene, characters, sceneData) => {
    characters.forEach((character, index) => {
      const characterGroup = createCharacter(character, sceneData);
      
      // キャラクターの位置を調整
      const spacing = 3;
      const xPos = (index - (characters.length - 1) / 2) * spacing;
      characterGroup.position.set(xPos, 0, 0);
      
      scene.add(characterGroup);
    });
  };

  const createCharacter = (character, sceneData) => {
    const group = new THREE.Group();
    
    console.log(`👤 Creating character: ${character.name || 'Unknown'} with emotion: ${character.emotion || 'neutral'} and pose: ${character.pose || 'standing'}`);

    // 頭部
    const headGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 2.5, 0);
    head.castShadow = true;
    group.add(head);
    
    // 表情に基づいた頭の角度調整
    applyEmotionToHead(head, character.emotion || 'neutral');

    // 胴体
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.6, 1.5, 8);
    const clothingColor = getClothingColor(character.clothing || 'casual');
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: clothingColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.set(0, 1.25, 0);
    body.castShadow = true;
    group.add(body);

    // ポーズに基づいて腕と脚を配置
    addLimbs(group, character.pose || 'standing', sceneData);
    
    // キャラクターの全体的な姿勢調整
    applyOverallPosture(group, character.emotion || 'neutral', character.pose || 'standing');

    return group;
  };
  
  const applyEmotionToHead = (head, emotion) => {
    switch (emotion) {
      case 'sad':
      case '悲しい':
        head.rotation.x = 0.2; // 下を向く
        break;
      case 'happy':
      case '嬉しい':
        head.rotation.x = -0.1; // 少し上を向く
        break;
      case 'angry':
      case '怒っている':
        head.rotation.x = -0.15;
        break;
      case 'surprised':
      case '驚いている':
        head.rotation.x = -0.2;
        head.scale.y = 1.1; // 少し伸ばす
        break;
      case 'confused':
      case '困っている':
        head.rotation.z = 0.1; // 少し傾ける
        break;
      case 'thinking':
      case '考えている':
        head.rotation.x = 0.1;
        head.rotation.y = 0.2;
        break;
      default:
        // neutral - デフォルトの姿勢
        break;
    }
  };
  
  const applyOverallPosture = (group, emotion, pose) => {
    // 感情に基づいた全体的な姿勢調整
    switch (emotion) {
      case 'sad':
      case '悲しい':
        group.scale.y = 0.95; // 少し縮む
        group.position.y = -0.1;
        break;
      case 'happy':
      case '嬉しい':
        group.scale.y = 1.05; // 少し伸びる
        break;
      case 'angry':
      case '怒っている':
        group.scale.set(1.05, 1.05, 1.05); // 少し大きく
        break;
      case 'surprised':
      case '驚いている':
        if (pose !== 'surprised') {
          group.rotation.z = Math.random() * 0.2 - 0.1; // 少しバランスを崩す
        }
        break;
      default:
        break;
    }
  };

  const addLimbs = (group, pose, sceneData) => {
    const limbMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
    
    // 腕の配置
    const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 6);
    
    // ポーズに応じた設定を取得
    const poseConfig = getPoseConfiguration(pose, sceneData);
    
    // 左腕
    const leftArm = new THREE.Mesh(armGeometry, limbMaterial);
    leftArm.position.copy(poseConfig.leftArm.position);
    leftArm.rotation.set(poseConfig.leftArm.rotation.x, poseConfig.leftArm.rotation.y, poseConfig.leftArm.rotation.z);
    leftArm.castShadow = true;
    group.add(leftArm);

    // 右腕
    const rightArm = new THREE.Mesh(armGeometry, limbMaterial);
    rightArm.position.copy(poseConfig.rightArm.position);
    rightArm.rotation.set(poseConfig.rightArm.rotation.x, poseConfig.rightArm.rotation.y, poseConfig.rightArm.rotation.z);
    rightArm.castShadow = true;
    group.add(rightArm);

    // 脚の配置
    const legGeometry = new THREE.CylinderGeometry(0.15, 0.1, 1.0, 6);
    
    // 左脚
    const leftLeg = new THREE.Mesh(legGeometry, limbMaterial);
    leftLeg.position.copy(poseConfig.leftLeg.position);
    leftLeg.rotation.set(poseConfig.leftLeg.rotation.x, poseConfig.leftLeg.rotation.y, poseConfig.leftLeg.rotation.z);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    // 右脚
    const rightLeg = new THREE.Mesh(legGeometry, limbMaterial);
    rightLeg.position.copy(poseConfig.rightLeg.position);
    rightLeg.rotation.set(poseConfig.rightLeg.rotation.x, poseConfig.rightLeg.rotation.y, poseConfig.rightLeg.rotation.z);
    rightLeg.castShadow = true;
    group.add(rightLeg);
  };

  const applyDifyDataToVRM = (vrmModel, character, sceneData, characterIndex) => {
    if (!vrmModel.vrm) return;
    
    console.log(`🎭 Applying Dify data to VRM character ${characterIndex}`);
    
    // 1. キャラクターの位置調整 (Difyの構図データに基づく)
    applyCharacterPosition(vrmModel, character, sceneData, characterIndex);
    
    // 2. キャラクターの向き調整
    applyCharacterRotation(vrmModel, character, sceneData);
    
    // 3. 基本ポーズの適用（Difyデータから推定）
    const detectedPose = detectPoseFromDifyData(sceneData, character);
    applyBasicPose(vrmModel, detectedPose, character.emotion || 'neutral');
    
    // 4. 表情の適用
    applyFacialExpression(vrmModel, character.emotion || 'neutral');
    
    // 5. スケール調整
    applyCharacterScale(vrmModel, character, sceneData);
  };
  
  const applyCharacterPosition = (vrmModel, character, sceneData, characterIndex) => {
    // Difyデータから位置情報を取得
    const positionData = sceneData?.character?.position || sceneData?.composition?.character_positions?.[characterIndex];
    
    if (positionData) {
      console.log(`📍 Position data found:`, positionData);
      
      // 位置指定がある場合
      if (positionData.x !== undefined) vrmModel.scene.position.x = positionData.x;
      if (positionData.y !== undefined) vrmModel.scene.position.y = positionData.y;
      if (positionData.z !== undefined) vrmModel.scene.position.z = positionData.z;
    } else {
      // デフォルト位置 (既存のロジックを保持)
      const spacing = 3;
      const xPos = (characterIndex - 0.5) * spacing;
      vrmModel.scene.position.set(xPos, 0, 0);
    }
  };
  
  const applyCharacterRotation = (vrmModel, character, sceneData) => {
    // キャラクターの向きを調整
    const rotationData = sceneData?.character?.rotation || sceneData?.composition?.character_rotations;
    
    if (rotationData) {
      console.log(`🔄 Rotation data found:`, rotationData);
      if (rotationData.y !== undefined) {
        // データがある場合はベース回転(180度)に加算
        vrmModel.scene.rotation.y = Math.PI + (rotationData.y * (Math.PI / 180));
      }
    } else {
      // デフォルト: カメラの方向を向く(前向きを保持)
      // 既にローダーで180度回転済みなのでそのまま保持
      console.log(`🔄 Using default front-facing rotation (${vrmModel.scene.rotation.y} radians)`);
    }
  };
  
  const applyBasicPose = (vrmModel, pose, emotion) => {
    if (!vrmModel.vrm.humanoid) {
      console.log('❌ No humanoid found in VRM model');
      return;
    }
    
    console.log(`🧍 Applying pose: ${pose} with emotion: ${emotion}`);
    
    // VRMのボーンを取得
    const humanoid = vrmModel.vrm.humanoid;
    
    // ポーズに応じた処理を実行
    switch (pose) {
      case 'sitting-up':
        applyVRMSittingUpPose(humanoid);
        break;
      case 'curtain-opening':
        applyVRMCurtainOpeningPose(humanoid);
        break;
      case 'sitting':
        applyVRMSittingPose(humanoid);
        break;
      case 'walking':
        applyVRMWalkingPose(humanoid);
        break;
      case 'standing':
      default:
        applyVRMStandingPose(humanoid, emotion);
        break;
    }
    
    console.log('✅ VRM pose applied and updated');
  };
  
  const applyFacialExpression = (vrmModel, emotion) => {
    if (!vrmModel.vrm.expressionManager) return;
    
    console.log(`😀 Applying facial expression: ${emotion}`);
    
    const expressionManager = vrmModel.vrm.expressionManager;
    
    // すべての表情をリセット
    expressionManager.setValue('happy', 0);
    expressionManager.setValue('sad', 0);
    expressionManager.setValue('angry', 0);
    expressionManager.setValue('surprised', 0);
    expressionManager.setValue('neutral', 0);
    
    // 感情に応じた表情を適用
    switch (emotion) {
      case 'happy':
      case '嬉しい':
        expressionManager.setValue('happy', 1.0);
        break;
      case 'sad':
      case '悲しい':
        expressionManager.setValue('sad', 1.0);
        break;
      case 'angry':
      case '怒っている':
        expressionManager.setValue('angry', 1.0);
        break;
      case 'surprised':
      case '驚いている':
        expressionManager.setValue('surprised', 1.0);
        break;
      default:
        expressionManager.setValue('neutral', 1.0);
    }
    
    // 表情を更新
    expressionManager.update();
  };
  
  const applyCharacterScale = (vrmModel, character, sceneData) => {
    // キャラクターのサイズ調整
    const scaleData = sceneData?.character?.scale || sceneData?.composition?.character_scale;
    
    if (scaleData) {
      console.log(`📎 Scale data found:`, scaleData);
      const scale = typeof scaleData === 'number' ? scaleData : (scaleData.uniform || 1.0);
      vrmModel.scene.scale.setScalar(scale);
    } else {
      // デフォルトスケール
      vrmModel.scene.scale.setScalar(1.0);
    }
  };
  
  // Difyデータからポーズを推定する関数
  const detectPoseFromDifyData = (sceneData, character) => {
    const composition = sceneData?.composition || '';
    const characterDetails = sceneData?.characterDetails || '';
    const combined = `${composition} ${characterDetails}`.toLowerCase();
    
    console.log(`🔍 Detecting pose from: "${combined}"`);
    
    // キーワードベースでポーズを判定
    if (combined.includes('ベッドから') || combined.includes('体を起こ') || combined.includes('起き上が')) {
      console.log('🛏️ Detected: sitting-up pose');
      return 'sitting-up';
    }
    if (combined.includes('カーテン') || combined.includes('開け') || combined.includes('引い')) {
      console.log('👋 Detected: curtain-opening pose');
      return 'curtain-opening';
    }
    if (combined.includes('座っ') || combined.includes('sitting')) {
      console.log('🪑 Detected: sitting pose');
      return 'sitting';
    }
    if (combined.includes('歩') || combined.includes('walking')) {
      console.log('🚶 Detected: walking pose');
      return 'walking';
    }
    
    console.log('🧍 Default: standing pose');
    return 'standing';
  };
  
  // VRMポーズ関数群
  const applyVRMSittingUpPose = (humanoid) => {
    // ベッドから起き上がるポーズ
    const spine = humanoid.getNormalizedBoneNode('spine');
    const leftUpperLeg = humanoid.getNormalizedBoneNode('leftUpperLeg');
    const rightUpperLeg = humanoid.getNormalizedBoneNode('rightUpperLeg');
    const leftLowerLeg = humanoid.getNormalizedBoneNode('leftLowerLeg');
    const rightLowerLeg = humanoid.getNormalizedBoneNode('rightLowerLeg');
    const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
    
    // 上半身を少し前傾
    if (spine) spine.rotation.x = 0.2;
    
    // 脚を曲げて座位
    if (leftUpperLeg) leftUpperLeg.rotation.x = Math.PI / 2.5;
    if (rightUpperLeg) rightUpperLeg.rotation.x = Math.PI / 2.5;
    if (leftLowerLeg) leftLowerLeg.rotation.x = -Math.PI / 4;
    if (rightLowerLeg) rightLowerLeg.rotation.x = -Math.PI / 4;
    
    // 腕を体の横に自然に
    if (leftUpperArm) leftUpperArm.rotation.z = Math.PI / 8;
    if (rightUpperArm) rightUpperArm.rotation.z = -Math.PI / 8;
    
    console.log('🛏️ Applied sitting-up pose');
    humanoid.update();
  };
  
  const applyVRMCurtainOpeningPose = (humanoid) => {
    // カーテンを開くポーズ
    const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
    const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
    const spine = humanoid.getNormalizedBoneNode('spine');
    
    // 右腕でカーテンを引く動作
    if (rightUpperArm) {
      rightUpperArm.rotation.x = -Math.PI / 6; // 上に
      rightUpperArm.rotation.y = Math.PI / 8;  // 横に
      rightUpperArm.rotation.z = -Math.PI / 3; // 外に
    }
    if (rightLowerArm) {
      rightLowerArm.rotation.x = -Math.PI / 4;
    }
    
    // 左腕は自然に
    if (leftUpperArm) leftUpperArm.rotation.z = Math.PI / 6;
    
    // 体を少し横に向ける
    if (spine) spine.rotation.y = Math.PI / 12;
    
    console.log('👋 Applied curtain-opening pose');
    humanoid.update();
  };
  
  const applyVRMSittingPose = (humanoid) => {
    const leftUpperLeg = humanoid.getNormalizedBoneNode('leftUpperLeg');
    const rightUpperLeg = humanoid.getNormalizedBoneNode('rightUpperLeg');
    const leftLowerLeg = humanoid.getNormalizedBoneNode('leftLowerLeg');
    const rightLowerLeg = humanoid.getNormalizedBoneNode('rightLowerLeg');
    
    if (leftUpperLeg) leftUpperLeg.rotation.x = Math.PI / 2;
    if (rightUpperLeg) rightUpperLeg.rotation.x = Math.PI / 2;
    if (leftLowerLeg) leftLowerLeg.rotation.x = -Math.PI / 3;
    if (rightLowerLeg) rightLowerLeg.rotation.x = -Math.PI / 3;
    
    // VRM更新
    humanoid.update();
  };
  
  const applyVRMLyingPose = (humanoid) => {
    const spine = humanoid.getNormalizedBoneNode('spine');
    if (spine) {
      spine.rotation.z = Math.PI / 2;
    }
    
    // VRM更新
    humanoid.update();
  };
  
  const applyVRMWalkingPose = (humanoid) => {
    const leftUpperLeg = humanoid.getNormalizedBoneNode('leftUpperLeg');
    const rightUpperLeg = humanoid.getNormalizedBoneNode('rightUpperLeg');
    const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
    
    if (leftUpperLeg) leftUpperLeg.rotation.x = -Math.PI / 8;
    if (rightUpperLeg) rightUpperLeg.rotation.x = Math.PI / 8;
    if (leftUpperArm) leftUpperArm.rotation.x = Math.PI / 8;
    if (rightUpperArm) rightUpperArm.rotation.x = -Math.PI / 8;
    
    // VRM更新
    humanoid.update();
  };
  
  const applyVRMPointingPose = (humanoid) => {
    const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
    
    if (rightUpperArm) {
      rightUpperArm.rotation.x = -Math.PI / 3;
      rightUpperArm.rotation.z = -Math.PI / 6;
    }
    if (rightLowerArm) {
      rightLowerArm.rotation.x = -Math.PI / 6;
    }
    
    // VRM更新
    humanoid.update();
  };
  
  const applyVRMThinkingPose = (humanoid) => {
    const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
    const rightLowerArm = humanoid.getNormalizedBoneNode('rightLowerArm');
    const head = humanoid.getNormalizedBoneNode('head');
    
    if (rightUpperArm) rightUpperArm.rotation.x = -Math.PI / 2;
    if (rightLowerArm) rightLowerArm.rotation.x = -Math.PI / 2;
    if (head) head.rotation.x = 0.2;
    
    // VRM更新
    humanoid.update();
  };
  
  const applyVRMSurprisedPose = (humanoid) => {
    const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
    
    if (leftUpperArm) {
      leftUpperArm.rotation.x = -Math.PI / 3;
      leftUpperArm.rotation.z = Math.PI / 4;
    }
    if (rightUpperArm) {
      rightUpperArm.rotation.x = -Math.PI / 3;
      rightUpperArm.rotation.z = -Math.PI / 4;
    }
    
    // VRM更新
    humanoid.update();
  };
  
  const applyVRMStandingPose = (humanoid, emotion) => {
    // 立っている基本ポーズはデフォルトのT-poseから自然な姿勢に調整
    const leftUpperArm = humanoid.getNormalizedBoneNode('leftUpperArm');
    const rightUpperArm = humanoid.getNormalizedBoneNode('rightUpperArm');
    
    if (leftUpperArm) leftUpperArm.rotation.z = Math.PI / 12; // 輕く下げる
    if (rightUpperArm) rightUpperArm.rotation.z = -Math.PI / 12; // 輕く下げる
    
    // 感情に応じた細かい調整
    const head = humanoid.getNormalizedBoneNode('head');
    if (head) {
      switch (emotion) {
        case 'sad':
        case '悲しい':
          head.rotation.x = 0.2; // 下を向く
          break;
        case 'happy':
        case '嬉しい':
          head.rotation.x = -0.1; // 少し上を向く
          break;
      }
    }
    
    // VRM更新
    humanoid.update();
  };
  
  // 従来の幾何学的ポーズ設定（フォールバック用）
  // eslint-disable-next-line no-unused-vars
  const getPoseConfiguration = (pose, sceneData) => {
    const configs = {
      'standing': {
        leftArm: { position: new THREE.Vector3(-0.8, 1.5, 0), rotation: { x: 0, y: 0, z: 0 } },
        rightArm: { position: new THREE.Vector3(0.8, 1.5, 0), rotation: { x: 0, y: 0, z: 0 } },
        leftLeg: { position: new THREE.Vector3(-0.3, 0.5, 0), rotation: { x: 0, y: 0, z: 0 } },
        rightLeg: { position: new THREE.Vector3(0.3, 0.5, 0), rotation: { x: 0, y: 0, z: 0 } }
      },
      'sitting': {
        leftArm: { position: new THREE.Vector3(-0.8, 1.2, 0), rotation: { x: 0, y: 0, z: Math.PI / 6 } },
        rightArm: { position: new THREE.Vector3(0.8, 1.2, 0), rotation: { x: 0, y: 0, z: -Math.PI / 6 } },
        leftLeg: { position: new THREE.Vector3(-0.3, 0.5, 0.8), rotation: { x: Math.PI / 3, y: 0, z: 0 } },
        rightLeg: { position: new THREE.Vector3(0.3, 0.5, 0.8), rotation: { x: Math.PI / 3, y: 0, z: 0 } }
      },
      'sitting-up': {
        leftArm: { position: new THREE.Vector3(-0.8, 1.2, 0), rotation: { x: 0, y: 0, z: Math.PI / 6 } },
        rightArm: { position: new THREE.Vector3(0.8, 1.2, 0), rotation: { x: 0, y: 0, z: -Math.PI / 6 } },
        leftLeg: { position: new THREE.Vector3(-0.3, 0.5, 0.8), rotation: { x: Math.PI / 3, y: 0, z: 0 } },
        rightLeg: { position: new THREE.Vector3(0.3, 0.5, 0.8), rotation: { x: Math.PI / 3, y: 0, z: 0 } }
      },
      'lying-down': {
        leftArm: { position: new THREE.Vector3(-0.5, 0.8, 0), rotation: { x: 0, y: 0, z: Math.PI / 4 } },
        rightArm: { position: new THREE.Vector3(0.5, 0.8, 0), rotation: { x: 0, y: 0, z: -Math.PI / 4 } },
        leftLeg: { position: new THREE.Vector3(-0.3, 0.3, 0), rotation: { x: Math.PI / 2, y: 0, z: 0 } },
        rightLeg: { position: new THREE.Vector3(0.3, 0.3, 0), rotation: { x: Math.PI / 2, y: 0, z: 0 } }
      },
      'walking': {
        leftArm: { position: new THREE.Vector3(-0.8, 1.5, -0.2), rotation: { x: Math.PI / 8, y: 0, z: 0 } },
        rightArm: { position: new THREE.Vector3(0.8, 1.5, 0.2), rotation: { x: -Math.PI / 8, y: 0, z: 0 } },
        leftLeg: { position: new THREE.Vector3(-0.3, 0.5, -0.3), rotation: { x: -Math.PI / 8, y: 0, z: 0 } },
        rightLeg: { position: new THREE.Vector3(0.3, 0.5, 0.3), rotation: { x: Math.PI / 8, y: 0, z: 0 } }
      },
      'pointing': {
        leftArm: { position: new THREE.Vector3(-0.8, 1.5, 0), rotation: { x: 0, y: 0, z: 0 } },
        rightArm: { position: new THREE.Vector3(0.8, 1.8, -0.5), rotation: { x: -Math.PI / 3, y: 0, z: -Math.PI / 6 } },
        leftLeg: { position: new THREE.Vector3(-0.3, 0.5, 0), rotation: { x: 0, y: 0, z: 0 } },
        rightLeg: { position: new THREE.Vector3(0.3, 0.5, 0), rotation: { x: 0, y: 0, z: 0 } }
      },
      'thinking': {
        leftArm: { position: new THREE.Vector3(-0.8, 1.5, 0), rotation: { x: 0, y: 0, z: 0 } },
        rightArm: { position: new THREE.Vector3(0.8, 2.2, -0.3), rotation: { x: -Math.PI / 2, y: 0, z: -Math.PI / 4 } },
        leftLeg: { position: new THREE.Vector3(-0.3, 0.5, 0), rotation: { x: 0, y: 0, z: 0 } },
        rightLeg: { position: new THREE.Vector3(0.3, 0.5, 0), rotation: { x: 0, y: 0, z: 0 } }
      },
      'surprised': {
        leftArm: { position: new THREE.Vector3(-1.0, 1.8, 0), rotation: { x: 0, y: 0, z: Math.PI / 3 } },
        rightArm: { position: new THREE.Vector3(1.0, 1.8, 0), rotation: { x: 0, y: 0, z: -Math.PI / 3 } },
        leftLeg: { position: new THREE.Vector3(-0.3, 0.5, 0), rotation: { x: 0, y: 0, z: 0 } },
        rightLeg: { position: new THREE.Vector3(0.3, 0.5, 0), rotation: { x: 0, y: 0, z: 0 } }
      }
    };
    
    return configs[pose] || configs['standing'];
  };

  const setupCamera = (camera, sceneData) => {
    console.log('📷 Setting up camera with data:', sceneData?.camera);
    
    const cameraType = sceneData?.camera?.type || 'middle';
    const cameraAngle = sceneData?.camera?.angle || sceneData?.composition?.camera_angle;
    const cameraHeight = sceneData?.camera?.height || sceneData?.composition?.camera_height;
    const cameraDistance = sceneData?.camera?.distance || sceneData?.composition?.camera_distance;
    
    // 基本位置の設定 (前からの全身撮影に調整)
    let basePosition = { x: 0, y: 1.8, z: 4 }; // 少し低めで近めに
    let lookAtTarget = { x: 0, y: 1.2, z: 0 }; // キャラクターの中央を見る
    
    switch (cameraType) {
      case 'close-up':
        basePosition = { x: 0, y: 2.5, z: 3 };
        lookAtTarget = { x: 0, y: 2, z: 0 };
        break;
      case 'wide-shot':
      case 'far':
        basePosition = { x: 0, y: 4, z: 8 };
        lookAtTarget = { x: 0, y: 1, z: 0 };
        break;
      case 'bird-eye':
        basePosition = { x: 0, y: 8, z: 5 };
        lookAtTarget = { x: 0, y: 0, z: 0 };
        break;
      case 'worm-eye':
        basePosition = { x: 0, y: 0.5, z: 5 };
        lookAtTarget = { x: 0, y: 3, z: 0 };
        break;
      default: // middle
        basePosition = { x: 0, y: 2, z: 5 };
        lookAtTarget = { x: 0, y: 1.5, z: 0 };
    }
    
    // Difyデータに基づく細かい調整
    if (cameraAngle !== undefined) {
      // カメラの角度調整 (度数で指定)
      const angleRad = cameraAngle * (Math.PI / 180);
      const distance = Math.sqrt(basePosition.x * basePosition.x + basePosition.z * basePosition.z);
      basePosition.x = Math.sin(angleRad) * distance;
      basePosition.z = Math.cos(angleRad) * distance;
    }
    
    if (cameraHeight !== undefined) {
      basePosition.y = cameraHeight;
    }
    
    if (cameraDistance !== undefined) {
      const direction = new THREE.Vector3(basePosition.x, 0, basePosition.z).normalize();
      basePosition.x = direction.x * cameraDistance;
      basePosition.z = direction.z * cameraDistance;
    }
    
    // カメラ位置を設定
    camera.position.set(basePosition.x, basePosition.y, basePosition.z);
    camera.lookAt(lookAtTarget.x, lookAtTarget.y, lookAtTarget.z);
    
    console.log(`✅ Camera positioned at: (${basePosition.x.toFixed(2)}, ${basePosition.y.toFixed(2)}, ${basePosition.z.toFixed(2)})`);
  };

  const getClothingColor = (clothing) => {
    const colors = {
      'pajamas': 0xffb6c1,
      't-shirt': 0x87ceeb,
      'shirt': 0xffffff,
      'suit': 0x2f4f4f,
      'casual': 0x32cd32
    };
    return colors[clothing] || 0x87ceeb;
  };

  if (loading) {
    return (
      <div className="threejs-preview loading">
        <div className="loading-spinner"></div>
        <p>3D表示を初期化中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="threejs-preview error">
        <div className="error-icon">⚠️</div>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            marginTop: '12px',
            padding: '8px 16px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          再読み込み
        </button>
      </div>
    );
  }

  // Three.jsが利用できない場合のフォールバック表示
  if (!useThreeJS) {
    return (
      <div className="threejs-preview fallback">
        <div className="fallback-content">
          <div className="panel-info">
            <h3>Panel {panelData.panel_number}</h3>
            <p>{panelData.content.description || 'パネルの説明'}</p>
            {panelData.content.characters && panelData.content.characters.length > 0 && (
              <div className="character-info">
                <strong>キャラクター:</strong>
                {panelData.content.characters.map((char, i) => (
                  <span key={i}> {char.name}({char.emotion})</span>
                ))}
              </div>
            )}
            {panelData.content.dialogue && panelData.content.dialogue.length > 0 && (
              <div className="dialogue-info">
                <strong>セリフ:</strong> {panelData.content.dialogue.join(' ')}
              </div>
            )}
          </div>
          <div className="camera-info">
            Camera: {sceneData?.camera?.type || 'middle'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="threejs-preview">
      <div ref={mountRef} className="threejs-mount" />
      <div className="preview-info">
        <span>Panel {panelData.panel_number}</span>
        <span>{sceneData?.camera?.type || 'middle'} view</span>
      </div>
    </div>
  );
};

export default ThreeJSPreview;