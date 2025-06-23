const OpenAI = require('openai');
const DifyIntegrationService = require('./difyIntegrationService');
const envConfig = require('../config/env');

class AIService {
  constructor(csvReader) {
    try {
      const openaiKey = envConfig.getOpenAIKey();
      this.openai = new OpenAI({
        apiKey: openaiKey,
      });
    } catch (error) {
      console.warn('⚠️ OpenAI not configured:', error.message);
      this.openai = null;
    }

    this.csvReader = csvReader;
    this.difyIntegration = new DifyIntegrationService(csvReader);
  }

  async analyzeStoryText(text, forceMock = false, pageCount = 8) {
    try {
      // Difyワークフローは必須フロー（AI生成時は常に使用）
      console.log('🔄 Using Dify workflow for analysis');
      return await this.analyzeWithDifyWorkflow(text, forceMock, pageCount);
    } catch (error) {
      console.error('AI analysis error:', error);
      // APIエラーまたはデータ構造エラー時は自動的にモックを使用
      if (
        error.status === 429 ||
        error.message.includes('quota') ||
        error.message.includes('Invalid Flow 1 output') ||
        error.message.includes('Dify API error')
      ) {
        console.log('🔄 Falling back to mock analysis due to:', error.message);
        return this.getMockAnalysis(text, pageCount);
      }
      throw new Error('文章解析に失敗しました: ' + error.message);
    }
  }

  async analyzeWithDifyWorkflow(text, forceMock = false, pageCount = 8) {
    try {
      console.log('🚀 Starting Dify workflow analysis...');

      // モック判定: 環境変数またはforceMockパラメータ
      const useMock = process.env.USE_MOCK_DIFY === 'true' || forceMock;

      // Step 1: Difyワークフローで処理
      const difyResult = await this.difyIntegration.processUserInput(
        text,
        useMock,
        pageCount
      );
      console.log(difyResult);

      // Step 2: OpenAIで後処理 (オプション)
      let finalResult = difyResult;
      if (process.env.USE_OPENAI_POSTPROCESS === 'true') {
        finalResult = await this.difyIntegration.postProcessWithOpenAI(
          difyResult,
          this
        );
      }

      // Step 3: レガシー形式に変換
      const legacyFormat =
        this.difyIntegration.convertToLegacyFormat(finalResult);

      console.log('✅ Dify workflow analysis completed');
      return legacyFormat;
    } catch (error) {
      console.error('❌ Dify workflow analysis failed:', error);
      throw error;
    }
  }

  getMockAnalysis(text, pageCount = 8) {
    // 入力テキストから簡単な解析を行ってモックデータを生成
    const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
    const hasDialogue = /「.*」|『.*』/.test(text);
    const hasAction = /走る|飛ぶ|戦う|叫ぶ|倒れる/.test(text);

    const mockResult = {
      scenes: [
        {
          scene_number: 1,
          description: '物語の導入シーン',
          emotion_tone: hasAction ? '緊張感' : hasDialogue ? '日常' : '静寂',
          layout_template: 'standard_4',
          panels: [],
        },
      ],
      overall_pacing: '中程度',
      page_count_estimate: pageCount,
    };

    // 文章から簡単にパネルを生成
    let panelCount = 1;
    for (let i = 0; i < Math.min(sentences.length, 6); i++) {
      const sentence = sentences[i];
      const isDialogue = /「.*」|『.*』/.test(sentence);

      mockResult.scenes[0].panels.push({
        panel_number: panelCount++,
        size: i === 0 ? 'large' : 'medium',
        type: isDialogue ? 'dialogue' : 'narration',
        content: {
          dialogue: isDialogue ? [sentence.replace(/「|」/g, '')] : [],
          narration: !isDialogue ? sentence : '',
          characters: isDialogue
            ? [
                {
                  name: 'キャラクター',
                  emotion: 'happy',
                  position: 'center',
                  svg_pattern: 'circle+upward_arc',
                },
              ]
            : [],
          background: i === 0 ? '場面設定' : '',
        },
        visual_notes: 'モックデータによる生成',
      });
    }

    return this.processAnalysisResult(mockResult);
  }

  buildSystemPrompt(contextRules, characterPatterns, layoutTemplates) {
    return `あなたは漫画ネーム作成の専門家です。入力された文章を解析し、漫画のコマ割りと構成を提案してください。

## 利用可能なコンテキストルール:
${contextRules.map(rule => `- ${rule.rule_type}: ${rule.condition} → ${rule.layout_rule} (${rule.description})`).join('\n')}

## キャラクター表現パターン:  
${characterPatterns.map(pattern => `- ${pattern.emotion}: ${pattern.svg_pattern} (${pattern.description})`).join('\n')}

## レイアウトテンプレート:
${layoutTemplates.map(template => `- ${template.template_name}: ${template.layout_pattern} (${template.use_case})`).join('\n')}

以下のJSON形式で回答してください:
{
  "scenes": [
    {
      "scene_number": 1,
      "description": "シーンの説明",
      "emotion_tone": "シーンの感情的トーン",
      "layout_template": "使用するレイアウトテンプレート名",
      "panels": [
        {
          "panel_number": 1,
          "size": "large|medium|small",
          "type": "action|dialogue|narration|establishing",
          "content": {
            "dialogue": ["セリフ1", "セリフ2"],
            "narration": "ナレーション文",
            "characters": [
              {
                "name": "キャラクター名",
                "emotion": "感情",
                "position": "位置",
                "svg_pattern": "SVGパターン"
              }
            ],
            "background": "背景の説明"
          },
          "visual_notes": "視覚的な注意点"
        }
      ]
    }
  ],
  "overall_pacing": "全体のペース感",
  "page_count_estimate": "推定ページ数"
}

重要: 回答は必ず有効なJSONのみで、説明文は含めないでください。`;
  }

  processAnalysisResult(analysisResult) {
    // AI結果をより詳細な内部形式に変換
    const processedResult = {
      ...analysisResult,
      panels_total: 0,
      scenes_with_rules: [],
    };

    processedResult.scenes.forEach(scene => {
      processedResult.panels_total += scene.panels.length;

      // 各シーンに適用されたルールを記録
      const appliedRules = this.findApplicableRules(scene);
      processedResult.scenes_with_rules.push({
        ...scene,
        applied_rules: appliedRules,
      });
    });

    return processedResult;
  }

  findApplicableRules(scene) {
    const applicableRules = [];
    const contextRules = this.csvReader.getMangaContext();

    contextRules.forEach(rule => {
      if (this.isRuleApplicable(rule, scene)) {
        applicableRules.push(rule);
      }
    });

    return applicableRules.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  isRuleApplicable(rule, scene) {
    const emotionTone = scene.emotion_tone.toLowerCase();
    const description = scene.description.toLowerCase();
    const condition = rule.condition.toLowerCase();

    return (
      emotionTone.includes(condition) ||
      description.includes(condition) ||
      this.semanticMatch(condition, emotionTone) ||
      this.semanticMatch(condition, description)
    );
  }

  semanticMatch(condition, text) {
    // 簡単な意味的マッチング（より高度なNLPに拡張可能）
    const emotionSynonyms = {
      感情: ['気持ち', '心情', '感情的'],
      驚き: ['ショック', 'びっくり', '衝撃'],
      悲しみ: ['悲しい', '悲哀', 'つらい'],
      アクション: ['戦闘', '戦い', '動き', '行動'],
    };

    for (const [key, synonyms] of Object.entries(emotionSynonyms)) {
      if (condition.includes(key) && synonyms.some(syn => text.includes(syn))) {
        return true;
      }
    }

    return false;
  }
}

module.exports = AIService;
