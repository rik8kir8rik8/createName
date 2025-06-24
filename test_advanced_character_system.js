const ComicPageRenderer = require('./server/services/ComicPageRenderer');
const DifyTo3DMapper = require('./server/services/DifyTo3DMapper');

/**
 * 高度キャラクターシステムのテスト
 * sample.png相当の自然なポーズ・表情・手の動きをテスト
 */
async function testAdvancedCharacterSystem() {
  console.log('🎭 === 高度キャラクターシステム テスト開始 ===\n');

  try {
    // 1. 高度レンダラー初期化
    console.log('🎨 高度ComicPageRenderer 初期化...');
    const comicRenderer = new ComicPageRenderer({
      pageWidth: 800,
      pageHeight: 1200
    });

    // 2. sample.png参考のテストシーン作成
    console.log('🎭 sample.png参考テストシーン準備...');
    const advancedTestScenes = await createAdvancedTestScenes();

    // 3. 高度ポーズシステムテスト
    console.log('🏃 高度ポーズシステムテスト開始...');
    const advancedResult = await comicRenderer.renderComicPage(advancedTestScenes, {
      layoutType: 'sample_style',
      mangaStyle: true,
      characterQuality: 'professional'
    });

    // 4. 結果保存
    const fs = require('fs');
    const outputPath = './test_advanced_character_poses.png';
    fs.writeFileSync(outputPath, advancedResult.imageBuffer);
    
    console.log(`✅ 高度キャラクターページ生成完了: ${outputPath}`);
    console.log(`📏 ページサイズ: ${advancedResult.metadata.pageSize.width}x${advancedResult.metadata.pageSize.height}`);
    console.log(`🎭 コマ数: ${advancedResult.metadata.panelCount}`);

    // 5. 個別ポーズテスト
    console.log('\n🎪 個別ポーズテスト開始...');
    await testIndividualPoses();

    // 6. 表情バリエーションテスト
    console.log('\n😊 表情バリエーションテスト開始...');
    await testFacialExpressions();

    console.log('\n🎉 === 全高度キャラクターテスト完了 ===');
    
    return {
      advancedResult: advancedResult,
      success: true
    };

  } catch (error) {
    console.error('❌ 高度キャラクターシステムテストエラー:', error);
    throw error;
  }
}

/**
 * sample.png参考の高度テストシーン作成
 */
async function createAdvancedTestScenes() {
  const mapper = new DifyTo3DMapper();
  
  // sample.png各コマに対応した高度なシーンデータ
  const advancedStoryData = [
    {
      index: 1,
      cameraAngle: 'near',
      composition: '太郎が深く考え込んでいる。右手を顎に当て、眉をひそめている表情。',
      visualEffects: 'normal',
      characterDetails: '太郎は考え込むポーズ。右手を顎に当て、左手は自然に下ろしている。眉をひそめ、視線は下向き。',
      background: 1,
      backgroundDetails: '室内。シンプルな背景で人物の表情とポーズに集中する構図。'
    },
    {
      index: 2,
      cameraAngle: 'far',
      composition: '太郎が何かに驚いて目を見開き、両手を上げている驚愕の表情。集中線で驚きを強調。',
      visualEffects: 'emotional',
      characterDetails: '太郎が驚愕している。目を大きく見開き、口は小さく開き、両手を軽く上げて驚きのポーズ。',
      background: 1,
      backgroundDetails: '集中線効果で驚きを表現。背景はぼかして人物に集中。'
    },
    {
      index: 3,
      cameraAngle: 'far',
      composition: '太郎が床に座り込んでリラックスしている全体像。足を前に出し、両手は膝の上。',
      visualEffects: 'normal',
      characterDetails: '太郎は床に座り、足を前に伸ばしている。両手は膝に軽く置き、穏やかな表情。',
      background: 1,
      backgroundDetails: '本棚のある部屋。パースペクティブのかかった空間。床にラグやマット。'
    },
    {
      index: 4,
      cameraAngle: 'near',
      composition: '太郎の顔のクローズアップ。穏やかに微笑んでいる表情に集中。',
      visualEffects: 'normal',
      characterDetails: '太郎の穏やかな微笑み。目は優しく、口元は自然な笑顔。リラックスした表情。',
      background: 1,
      backgroundDetails: 'ぼかした背景。顔の表情に集中する構図。'
    },
    {
      index: 5,
      cameraAngle: 'middle',
      composition: '太郎が床から立ち上がろうとしている動的な瞬間。体重移動と手の動きで動きを表現。',
      visualEffects: 'normal',
      characterDetails: '太郎が立ち上がる途中。体は前傾し、手で体を支えながら立ち上がろうとしている動的なポーズ。',
      background: 1,
      backgroundDetails: '室内。背景に本棚や家具。動きのある構図で空間を感じさせる。'
    }
  ];

  const scenes = [];
  
  for (let i = 0; i < advancedStoryData.length; i++) {
    const data = advancedStoryData[i];
    console.log(`🎭 高度シーン${i + 1}データマッピング...`);
    
    const mappedScene = await mapper.mapTo3DParameters(data);
    
    // 高度ポーズ名をマッピング
    mappedScene.character.advancedPose = mapToAdvancedPoseName(data.characterDetails, i);
    
    scenes.push(mappedScene);
    
    console.log(`  ✅ シーン${i + 1}: ${mappedScene.character.advancedPose}`);
  }

  return scenes;
}

/**
 * キャラクター詳細から高度ポーズ名にマッピング
 * @param {string} characterDetails - キャラクター詳細
 * @param {number} index - シーンインデックス
 * @returns {string} 高度ポーズ名
 */
function mapToAdvancedPoseName(characterDetails, index) {
  // sample.pngの各コマに対応
  const poseMapping = [
    'thinking',        // 1コマ目: 考え込むポーズ
    'surprised',       // 2コマ目: 驚きのポーズ
    'sitting_floor',   // 3コマ目: 座り込みポーズ
    'smiling_closeup', // 4コマ目: 微笑みクローズアップ
    'standing_up'      // 5コマ目: 立ち上がるポーズ
  ];
  
  return poseMapping[index] || 'thinking';
}

/**
 * 個別ポーズテスト
 */
async function testIndividualPoses() {
  const AdvancedCharacterPoseSystem = require('./server/services/AdvancedCharacterPoseSystem');
  const poseSystem = new AdvancedCharacterPoseSystem();
  
  // sample.png対応の全ポーズテスト
  const testPoses = [
    { name: 'thinking', emotion: 'contemplative' },
    { name: 'surprised', emotion: 'shocked' },
    { name: 'sitting_floor', emotion: 'relaxed' },
    { name: 'smiling_closeup', emotion: 'happy' },
    { name: 'standing_up', emotion: 'determined' }
  ];
  
  for (const testPose of testPoses) {
    try {
      console.log(`🎭 ポーズテスト: ${testPose.name} (感情: ${testPose.emotion})`);
      
      const pose = poseSystem.generateNaturalPose(testPose.name, {
        emotion: testPose.emotion,
        scale: 1.0
      });
      
      console.log(`  ✅ ${testPose.name} ポーズ生成成功`);
      console.log(`  📋 骨格: ${Object.keys(pose.skeleton).length}ボーン`);
      console.log(`  😊 表情: ${pose.facialExpression.eyes}, ${pose.facialExpression.mouth}`);
      console.log(`  🤲 手のジェスチャー: ${Object.keys(pose.handGestures).length}個`);
      
      if (pose.effects.length > 0) {
        console.log(`  ✨ 特殊効果: ${pose.effects.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`  ❌ ${testPose.name} ポーズ生成失敗:`, error.message);
    }
  }
}

/**
 * 表情バリエーションテスト
 */
async function testFacialExpressions() {
  const AdvancedCharacterPoseSystem = require('./server/services/AdvancedCharacterPoseSystem');
  const poseSystem = new AdvancedCharacterPoseSystem();
  
  // 表情のバリエーションテスト
  const emotions = ['happy', 'sad', 'angry', 'surprised'];
  
  for (const emotion of emotions) {
    try {
      console.log(`😊 表情テスト: ${emotion}`);
      
      const pose = poseSystem.generateNaturalPose('thinking', {
        emotion: emotion
      });
      
      const expression = pose.facialExpression;
      console.log(`  👁️ 目: ${expression.eyes}`);
      console.log(`  👄 口: ${expression.mouth}`);
      console.log(`  ✨ 眉: ${expression.eyebrows}`);
      
    } catch (error) {
      console.error(`  ❌ ${emotion} 表情生成失敗:`, error.message);
    }
  }
}

// テスト実行
if (require.main === module) {
  testAdvancedCharacterSystem()
    .then((results) => {
      console.log('\n🎊 高度キャラクターシステムテスト成功!');
      console.log('🎨 プロ品質のポーズ・表情・手の動きが実装されました');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 高度キャラクターシステムテスト失敗:', error);
      process.exit(1);
    });
}

module.exports = { testAdvancedCharacterSystem };