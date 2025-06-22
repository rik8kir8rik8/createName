const express = require('express');
const router = express.Router();
const AIService = require('../services/aiService');
const ImageGenerationService = require('../services/imageGenerationService');

module.exports = (csvReader) => {
  const aiService = new AIService(csvReader);
  const imageService = new ImageGenerationService();

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
        layoutTemplates: csvReader.getLayoutTemplates()
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
        return res.status(400).json({ error: 'Text is too long (max 10000 characters)' });
      }

      console.log('🎨 Generating storyboard for text length:', text.length);
      console.log('📊 Using mock AI:', useMockAI);
      console.log('📄 Page count:', pageCount);
      console.log('🔧 Using Dify workflow: true (always enabled)');
      
      const storyboard = await aiService.analyzeStoryText(text, useMockAI, pageCount);
      
      console.log('✅ Storyboard generated successfully');
      res.json({
        success: true,
        storyboard,
        metadata: {
          input_length: text.length,
          generated_at: new Date().toISOString(),
          panels_count: storyboard.panels_total,
          scenes_count: storyboard.scenes.length
        }
      });

    } catch (error) {
      console.error('❌ Error generating storyboard:', error);
      res.status(500).json({ 
        error: 'Failed to generate storyboard', 
        message: error.message 
      });
    }
  });

  // Generate page images for storyboard
  router.post('/generate-page-images', async (req, res) => {
    try {
      const { storyboard } = req.body;
      
      if (!storyboard || !storyboard.scenes) {
        return res.status(400).json({ error: 'Valid storyboard data is required' });
      }

      console.log('🖼️ Generating page images for', storyboard.scenes.length, 'pages');
      
      const pageImages = await imageService.generateAllPageImages(storyboard);
      
      // Convert image buffers to base64 for JSON response
      const imagesData = pageImages.map(page => ({
        pageNumber: page.pageNumber,
        imageData: `data:image/png;base64,${page.imageBuffer.toString('base64')}`,
        sceneInfo: page.sceneInfo
      }));
      
      console.log('✅ Page images generated successfully');
      res.json({
        success: true,
        images: imagesData,
        metadata: {
          total_pages: pageImages.length,
          generated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error generating page images:', error);
      res.status(500).json({ 
        error: 'Failed to generate page images', 
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
        details: error.message 
      });
    }
  });

  return router;
};