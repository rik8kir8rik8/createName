/**
 * VRMファイルアップロード・管理用APIルート
 * multerを使用したVRMファイルのアップロード機能
 */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// VRMファイル保存設定
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/vrm');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // ファイル名を一意にする
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `vrm-${uniqueSuffix}${ext}`);
  }
});

// ファイルフィルター（VRMファイルのみ許可）
const fileFilter = (req, file, cb) => {
  console.log('📁 ファイルアップロード検証:', file.originalname);
  
  // VRMファイルかGLBファイルを許可
  const allowedExts = ['.vrm', '.glb', '.gltf'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExts.includes(ext)) {
    console.log(`✅ 許可されたファイル形式: ${ext}`);
    cb(null, true);
  } else {
    console.log(`❌ 許可されていないファイル形式: ${ext}`);
    cb(new Error(`VRMファイル（.vrm, .glb, .gltf）のみアップロード可能です。現在: ${ext}`), false);
  }
};

// multer設定
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB制限
    files: 1 // 一度に1ファイルのみ
  }
});

/**
 * VRMファイルアップロード
 * POST /api/vrm/upload
 */
router.post('/upload', upload.single('vrmFile'), async (req, res) => {
  try {
    console.log('📤 VRMファイルアップロード開始');
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'VRMファイルが選択されていません'
      });
    }
    
    const file = req.file;
    console.log(`📦 アップロードファイル情報:`, {
      originalName: file.originalname,
      fileName: file.filename,
      size: file.size,
      mimetype: file.mimetype
    });
    
    // ファイル情報をDBに保存（簡易版：JSONファイル）
    const vrmInfo = {
      id: Date.now().toString(),
      originalName: file.originalname,
      fileName: file.filename,
      filePath: file.path,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      metadata: {
        verified: false,
        characterName: req.body.characterName || 'Unknown',
        description: req.body.description || ''
      }
    };
    
    // VRMリストに追加
    await addVRMToList(vrmInfo);
    
    // VRMファイルの基本検証
    const validationResult = await validateVRMFile(file.path);
    vrmInfo.metadata.verified = validationResult.valid;
    vrmInfo.metadata.validationDetails = validationResult.details;
    
    console.log('✅ VRMファイルアップロード完了:', vrmInfo.id);
    
    res.json({
      success: true,
      vrm: vrmInfo,
      message: 'VRMファイルのアップロードが完了しました'
    });
    
  } catch (error) {
    console.error('❌ VRMアップロードエラー:', error);
    
    // アップロードされたファイルを削除
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('ファイル削除エラー:', unlinkError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'VRMファイルのアップロードに失敗しました'
    });
  }
});

/**
 * VRMファイル一覧取得
 * GET /api/vrm/list
 */
router.get('/list', async (req, res) => {
  try {
    console.log('📋 VRMファイル一覧取得');
    
    const vrmList = await getVRMList();
    
    // ファイルの存在確認
    const verifiedList = await Promise.all(
      vrmList.map(async (vrm) => {
        try {
          await fs.access(vrm.filePath);
          return { ...vrm, exists: true };
        } catch {
          return { ...vrm, exists: false };
        }
      })
    );
    
    res.json({
      success: true,
      vrmFiles: verifiedList,
      count: verifiedList.length
    });
    
  } catch (error) {
    console.error('❌ VRM一覧取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'VRMファイル一覧の取得に失敗しました'
    });
  }
});

/**
 * VRMファイル詳細取得
 * GET /api/vrm/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const vrmId = req.params.id;
    console.log(`📋 VRMファイル詳細取得: ${vrmId}`);
    
    const vrmList = await getVRMList();
    const vrm = vrmList.find(v => v.id === vrmId);
    
    if (!vrm) {
      return res.status(404).json({
        success: false,
        error: 'VRMファイルが見つかりません'
      });
    }
    
    // ファイルの存在確認
    try {
      await fs.access(vrm.filePath);
      vrm.exists = true;
    } catch {
      vrm.exists = false;
    }
    
    res.json({
      success: true,
      vrm: vrm
    });
    
  } catch (error) {
    console.error('❌ VRM詳細取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'VRMファイル詳細の取得に失敗しました'
    });
  }
});

/**
 * VRMファイル削除
 * DELETE /api/vrm/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const vrmId = req.params.id;
    console.log(`🗑️ VRMファイル削除: ${vrmId}`);
    
    const vrmList = await getVRMList();
    const vrmIndex = vrmList.findIndex(v => v.id === vrmId);
    
    if (vrmIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'VRMファイルが見つかりません'
      });
    }
    
    const vrm = vrmList[vrmIndex];
    
    // ファイルを削除
    try {
      await fs.unlink(vrm.filePath);
      console.log('ファイル削除完了:', vrm.filePath);
    } catch (error) {
      console.warn('ファイル削除警告:', error.message);
    }
    
    // リストから削除
    vrmList.splice(vrmIndex, 1);
    await saveVRMList(vrmList);
    
    console.log('✅ VRMファイル削除完了:', vrmId);
    
    res.json({
      success: true,
      message: 'VRMファイルが削除されました'
    });
    
  } catch (error) {
    console.error('❌ VRM削除エラー:', error);
    res.status(500).json({
      success: false,
      error: 'VRMファイルの削除に失敗しました'
    });
  }
});

/**
 * VRMファイル更新（メタデータ）
 * PUT /api/vrm/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const vrmId = req.params.id;
    const updates = req.body;
    console.log(`📝 VRMファイル更新: ${vrmId}`);
    
    const vrmList = await getVRMList();
    const vrmIndex = vrmList.findIndex(v => v.id === vrmId);
    
    if (vrmIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'VRMファイルが見つかりません'
      });
    }
    
    // メタデータを更新
    const vrm = vrmList[vrmIndex];
    if (updates.characterName) vrm.metadata.characterName = updates.characterName;
    if (updates.description) vrm.metadata.description = updates.description;
    if (updates.tags) vrm.metadata.tags = updates.tags;
    
    vrm.updatedAt = new Date().toISOString();
    
    await saveVRMList(vrmList);
    
    console.log('✅ VRMファイル更新完了:', vrmId);
    
    res.json({
      success: true,
      vrm: vrm,
      message: 'VRMファイル情報が更新されました'
    });
    
  } catch (error) {
    console.error('❌ VRM更新エラー:', error);
    res.status(500).json({
      success: false,
      error: 'VRMファイル情報の更新に失敗しました'
    });
  }
});

/**
 * VRMファイルダウンロード
 * GET /api/vrm/:id/download
 */
router.get('/:id/download', async (req, res) => {
  try {
    const vrmId = req.params.id;
    console.log(`⬇️ VRMファイルダウンロード: ${vrmId}`);
    
    const vrmList = await getVRMList();
    const vrm = vrmList.find(v => v.id === vrmId);
    
    if (!vrm) {
      return res.status(404).json({
        success: false,
        error: 'VRMファイルが見つかりません'
      });
    }
    
    // ファイルの存在確認
    try {
      await fs.access(vrm.filePath);
    } catch {
      return res.status(404).json({
        success: false,
        error: 'VRMファイルが見つかりません（ファイルが削除されている可能性があります）'
      });
    }
    
    // ファイルダウンロード
    res.download(vrm.filePath, vrm.originalName, (error) => {
      if (error) {
        console.error('ダウンロードエラー:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'ファイルダウンロードに失敗しました'
          });
        }
      } else {
        console.log('✅ ダウンロード完了:', vrm.originalName);
      }
    });
    
  } catch (error) {
    console.error('❌ VRMダウンロードエラー:', error);
    res.status(500).json({
      success: false,
      error: 'VRMファイルダウンロードに失敗しました'
    });
  }
});

/**
 * VRMプレビュー情報取得
 * GET /api/vrm/:id/preview
 */
router.get('/:id/preview', async (req, res) => {
  try {
    const vrmId = req.params.id;
    console.log(`👁️ VRMプレビュー情報取得: ${vrmId}`);
    
    const vrmList = await getVRMList();
    const vrm = vrmList.find(v => v.id === vrmId);
    
    if (!vrm) {
      return res.status(404).json({
        success: false,
        error: 'VRMファイルが見つかりません'
      });
    }
    
    // VRMファイルからプレビュー情報を抽出
    const previewInfo = await extractVRMPreviewInfo(vrm.filePath);
    
    res.json({
      success: true,
      preview: {
        ...previewInfo,
        id: vrm.id,
        originalName: vrm.originalName,
        characterName: vrm.metadata.characterName,
        fileSize: vrm.size
      }
    });
    
  } catch (error) {
    console.error('❌ VRMプレビュー取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'VRMプレビュー情報の取得に失敗しました'
    });
  }
});

// === ヘルパー関数 ===

/**
 * VRMリストファイルのパス
 */
const getVRMListPath = () => {
  return path.join(__dirname, '../../data/vrm-list.json');
};

/**
 * VRMリスト取得
 */
async function getVRMList() {
  try {
    const listPath = getVRMListPath();
    const data = await fs.readFile(listPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // ファイルが存在しない場合は空配列を返す
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * VRMリスト保存
 */
async function saveVRMList(vrmList) {
  const listPath = getVRMListPath();
  const dataDir = path.dirname(listPath);
  
  // データディレクトリを作成
  await fs.mkdir(dataDir, { recursive: true });
  
  // リストを保存
  await fs.writeFile(listPath, JSON.stringify(vrmList, null, 2), 'utf8');
}

/**
 * VRMをリストに追加
 */
async function addVRMToList(vrmInfo) {
  const vrmList = await getVRMList();
  vrmList.push(vrmInfo);
  await saveVRMList(vrmList);
}

/**
 * VRMファイルの基本検証
 * @param {string} filePath - VRMファイルパス
 */
async function validateVRMFile(filePath) {
  try {
    console.log('🔍 VRMファイル検証開始:', filePath);
    
    // ファイルサイズチェック
    const stats = await fs.stat(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);
    
    if (fileSizeMB > 50) {
      return {
        valid: false,
        details: `ファイルサイズが大きすぎます: ${fileSizeMB.toFixed(2)}MB (上限: 50MB)`
      };
    }
    
    // ファイル拡張子チェック
    const ext = path.extname(filePath).toLowerCase();
    const validExtensions = ['.vrm', '.glb', '.gltf'];
    
    if (!validExtensions.includes(ext)) {
      return {
        valid: false,
        details: `サポートされていないファイル形式: ${ext}`
      };
    }
    
    // バイナリファイルの基本チェック（先頭バイトをチェック）
    const buffer = await fs.readFile(filePath, { encoding: null, flag: 'r' });
    const header = buffer.slice(0, 4);
    
    // GLBファイルの場合はマジックナンバーをチェック
    if (ext === '.glb' || ext === '.vrm') {
      const glbMagic = Buffer.from([0x67, 0x6C, 0x54, 0x46]); // "glTF"
      if (!header.equals(glbMagic)) {
        return {
          valid: false,
          details: 'GLB/VRMファイルのフォーマットが不正です'
        };
      }
    }
    
    console.log('✅ VRMファイル検証完了: 有効');
    
    return {
      valid: true,
      details: `有効なVRMファイル (${fileSizeMB.toFixed(2)}MB)`
    };
    
  } catch (error) {
    console.error('❌ VRM検証エラー:', error);
    return {
      valid: false,
      details: `検証エラー: ${error.message}`
    };
  }
}

/**
 * VRMプレビュー情報の抽出
 * @param {string} filePath - VRMファイルパス
 */
async function extractVRMPreviewInfo(filePath) {
  try {
    console.log('🔍 VRMプレビュー情報抽出:', filePath);
    
    // 基本情報
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    const previewInfo = {
      fileType: ext,
      fileSize: stats.size,
      fileSizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      lastModified: stats.mtime.toISOString(),
      
      // VRM固有情報（実際の実装では three-vrm で解析）
      estimated: {
        hasAnimations: ext === '.vrm',
        hasMorphTargets: ext === '.vrm',
        polygonCount: 'Unknown',
        textureCount: 'Unknown',
        boneCount: 'Unknown'
      },
      
      preview: {
        thumbnail: null, // 実装時にはサムネイル生成
        boundingBox: null,
        materials: []
      }
    };
    
    // 簡易的なメタデータ抽出（実際の実装では GLTFLoader を使用）
    if (ext === '.vrm' || ext === '.glb') {
      try {
        const buffer = await fs.readFile(filePath, { encoding: null });
        
        // GLBヘッダー解析（簡易版）
        if (buffer.length >= 12) {
          const version = buffer.readUInt32LE(4);
          const length = buffer.readUInt32LE(8);
          
          previewInfo.estimated.glbVersion = version;
          previewInfo.estimated.totalLength = length;
        }
      } catch (parseError) {
        console.warn('メタデータ解析警告:', parseError.message);
      }
    }
    
    console.log('✅ VRMプレビュー情報抽出完了');
    return previewInfo;
    
  } catch (error) {
    console.error('❌ VRMプレビュー抽出エラー:', error);
    return {
      error: error.message,
      fileType: path.extname(filePath).toLowerCase(),
      estimated: {}
    };
  }
}

module.exports = router;