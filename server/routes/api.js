const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');
const ImageGenerationService = require('../services/imageGenerationService');
const MangaStyleRenderer = require('../services/MangaStyleRenderer');

module.exports = csvReader => {
  const aiService = new AIService(csvReader);
  const imageService = new ImageGenerationService();
  const mangaRenderer = new MangaStyleRenderer();

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Manga Name Generator API is running' });
  });

  // Get context data
  router.get('/context', (req, res) => {
    const { type } = req.query;

    if (type) {
      const contextData = csvReader.getContextByType(type);
      res.json(contextData);
    } else {
      res.json({
        mangaContext: csvReader.getMangaContext(),
        characterPatterns: csvReader.getCharacterPatterns(),
        layoutTemplates: csvReader.getLayoutTemplates(),
      });
    }
  });

  // Search context by condition
  router.get('/context/search', (req, res) => {
    const { condition } = req.query;

    if (!condition) {
      return res.status(400).json({ error: 'Condition parameter is required' });
    }

    const results = csvReader.getContextByCondition(condition);
    res.json(results);
  });

  // Generate manga storyboard
  router.post('/generate-storyboard', async (req, res) => {
    try {
      const { text, useMockAI, pageCount = 8 } = req.body;

      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ error: 'Valid text is required' });
      }

      if (text.length > 10000) {
        return res
          .status(400)
          .json({ error: 'Text is too long (max 10000 characters)' });
      }

      console.log('🎨 Generating storyboard for text length:', text.length);
      console.log('📊 Using mock AI:', useMockAI);
      console.log('📄 Page count:', pageCount);
      console.log('🔧 Using Dify workflow: true (always enabled)');

      const storyboard = await aiService.analyzeStoryText(
        text,
        useMockAI,
        pageCount
      );

      console.log('✅ Storyboard generated successfully');
      res.json({
        success: true,
        storyboard,
        metadata: {
          input_length: text.length,
          generated_at: new Date().toISOString(),
          panels_count: storyboard.panels_total,
          scenes_count: storyboard.scenes.length,
        },
      });
    } catch (error) {
      console.error('❌ Error generating storyboard:', error);
      res.status(500).json({
        error: 'Failed to generate storyboard',
        message: error.message,
      });
    }
  });

  // Generate page images for storyboard
  router.post('/generate-page-images', async (req, res) => {
    try {
      const { storyboard } = req.body;

      if (!storyboard || !storyboard.scenes) {
        return res
          .status(400)
          .json({ error: 'Valid storyboard data is required' });
      }

      console.log(
        '🖼️ Generating page images for',
        storyboard.scenes.length,
        'pages'
      );

      const pageImages = await imageService.generateAllPageImages(storyboard);

      // Convert image buffers to base64 for JSON response
      const imagesData = pageImages.map(page => ({
        pageNumber: page.pageNumber,
        imageData: `data:image/png;base64,${page.imageBuffer.toString('base64')}`,
        sceneInfo: page.sceneInfo,
      }));

      console.log('✅ Page images generated successfully');
      res.json({
        success: true,
        images: imagesData,
        metadata: {
          total_pages: pageImages.length,
          generated_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error generating page images:', error);
      res.status(500).json({
        error: 'Failed to generate page images',
        message: error.message,
      });
    }
  });

  // Convert image to manga style
  router.post('/convert-to-manga-style', async (req, res) => {
    try {
      const { imageData, settings } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      // Update renderer settings if provided
      if (settings) {
        mangaRenderer.updateSettings(settings);
      }

      console.log('🎭 Converting image to manga style...');

      // Handle base64 image data
      let imageBuffer;
      if (imageData.startsWith('data:image/')) {
        const base64Data = imageData.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // Assume it's already a buffer or file path
        imageBuffer = imageData;
      }

      const mangaStyleImage = await mangaRenderer.renderToMangaStyle(imageBuffer);

      console.log('✅ Manga style conversion completed');
      res.json({
        success: true,
        imageData: `data:image/png;base64,${mangaStyleImage.toString('base64')}`,
        metadata: {
          original_size: imageBuffer.length,
          converted_size: mangaStyleImage.length,
          processed_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error converting to manga style:', error);
      res.status(500).json({
        error: 'Failed to convert image to manga style',
        message: error.message,
      });
    }
  });

  // Generate manga style filters with different settings
  router.post('/generate-manga-variants', async (req, res) => {
    try {
      const { imageData } = req.body;

      if (!imageData) {
        return res.status(400).json({ error: 'Image data is required' });
      }

      console.log('🎨 Generating manga style variants...');

      // Handle base64 image data
      let imageBuffer;
      if (imageData.startsWith('data:image/')) {
        const base64Data = imageData.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        imageBuffer = imageData;
      }

      const variants = [];

      // Variant 1: Standard manga style
      mangaRenderer.updateSettings({
        edgeThreshold: 50,
        shadowStrength: 1.5,
      });
      const standardVariant = await mangaRenderer.renderToMangaStyle(imageBuffer);
      variants.push({
        name: 'standard',
        description: 'バランスの取れた標準設定',
        imageData: `data:image/png;base64,${standardVariant.toString('base64')}`,
        settings: { edgeThreshold: 50, shadowStrength: 1.5 },
      });

      // Variant 2: Strong edges
      mangaRenderer.updateSettings({
        edgeThreshold: 30,
        shadowStrength: 2.0,
      });
      const strongEdgeVariant = await mangaRenderer.renderToMangaStyle(imageBuffer);
      variants.push({
        name: 'strong_edge',
        description: '強いエッジ検出で輪郭を強調',
        imageData: `data:image/png;base64,${strongEdgeVariant.toString('base64')}`,
        settings: { edgeThreshold: 30, shadowStrength: 2.0 },
      });

      // Variant 3: Soft style
      mangaRenderer.updateSettings({
        edgeThreshold: 70,
        shadowStrength: 1.0,
      });
      const softVariant = await mangaRenderer.renderToMangaStyle(imageBuffer);
      variants.push({
        name: 'soft',
        description: '柔らかいタッチの優しい表現',
        imageData: `data:image/png;base64,${softVariant.toString('base64')}`,
        settings: { edgeThreshold: 70, shadowStrength: 1.0 },
      });

      console.log('✅ Manga style variants generated successfully');
      res.json({
        success: true,
        variants,
        metadata: {
          total_variants: variants.length,
          generated_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('❌ Error generating manga variants:', error);
      res.status(500).json({
        error: 'Failed to generate manga style variants',
        message: error.message,
      });
    }
  });

  // Get 3D preview for specific panel
  router.get('/3d-preview/:panelNumber', async (req, res) => {
    try {
      const { panelNumber } = req.params;
      
      if (!panelNumber || isNaN(panelNumber)) {
        return res.status(400).json({ error: 'Valid panel number is required' });
      }

      console.log(`🔍 Fetching 3D preview for panel ${panelNumber}`);
      
      // プレビューファイルを探す
      const fs = require('fs').promises;
      const path = require('path');
      
      const previewDir = path.join(process.cwd(), 'server', 'output', 'previews');
      
      try {
        const files = await fs.readdir(previewDir);
        const previewFiles = files.filter(file => 
          file.startsWith(`panel_${panelNumber}_3d_preview_`) && file.endsWith('.png')
        ).sort().reverse(); // 最新のものを取得
        
        if (previewFiles.length === 0) {
          return res.status(404).json({ error: 'No 3D preview found for this panel' });
        }
        
        const latestPreviewFile = previewFiles[0];
        const previewPath = path.join(previewDir, latestPreviewFile);
        const imageBuffer = await fs.readFile(previewPath);
        
        console.log(`📸 Found 3D preview: ${latestPreviewFile}`);
        
        res.json({
          success: true,
          panelNumber: parseInt(panelNumber),
          imageData: `data:image/png;base64,${imageBuffer.toString('base64')}`,
          filename: latestPreviewFile,
          path: previewPath,
          metadata: {
            file_size: imageBuffer.length,
            generated_at: new Date().toISOString()
          }
        });
        
      } catch (err) {
        if (err.code === 'ENOENT') {
          return res.status(404).json({ error: 'Preview directory not found' });
        }
        throw err;
      }
      
    } catch (error) {
      console.error(`❌ Error fetching 3D preview for panel ${req.params.panelNumber}:`, error);
      res.status(500).json({
        error: 'Failed to fetch 3D preview',
        message: error.message
      });
    }
  });

  // Get latest 3D previews
  router.get('/3d-previews/latest', async (req, res) => {
    try {
      console.log('🔍 Fetching latest 3D previews');
      
      const fs = require('fs').promises;
      const path = require('path');
      
      const previewDir = path.join(process.cwd(), 'server', 'output', 'previews');
      
      try {
        const files = await fs.readdir(previewDir);
        const previewFiles = files.filter(file => 
          file.includes('_3d_preview_') && file.endsWith('.png')
        );
        
        // ファイル情報を収集
        const previews = [];
        for (const file of previewFiles) {
          const filePath = path.join(previewDir, file);
          const stats = await fs.stat(filePath);
          
          // ファイル名からパネル番号を抽出
          const panelMatch = file.match(/panel_(\d+)_3d_preview_/);
          if (panelMatch) {
            previews.push({
              panelNumber: parseInt(panelMatch[1]),
              filename: file,
              path: filePath,
              size: stats.size,
              modifiedAt: stats.mtime.toISOString()
            });
          }
        }
        
        // 最新の修正日時順でソート
        previews.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
        
        console.log(`📸 Found ${previews.length} 3D previews`);
        
        res.json({
          success: true,
          previews: previews.slice(0, 10), // 最新10件
          total: previews.length,
          metadata: {
            fetched_at: new Date().toISOString()
          }
        });
        
      } catch (err) {
        if (err.code === 'ENOENT') {
          return res.json({
            success: true,
            previews: [],
            total: 0,
            message: 'Preview directory not found'
          });
        }
        throw err;
      }
      
    } catch (error) {
      console.error('❌ Error fetching latest 3D previews:', error);
      res.status(500).json({
        error: 'Failed to fetch latest 3D previews',
        message: error.message
      });
    }
  });

  // Reload context data
  router.post('/reload-context', async (req, res) => {
    try {
      await csvReader.reloadData();
      res.json({ message: 'Context data reloaded successfully' });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to reload context data',
        details: error.message,
      });
    }
  });

  return router;
};
