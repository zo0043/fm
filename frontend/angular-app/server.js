#!/usr/bin/env node

/**
 * 基金监控系统前端开发服务器
 * 纯Node.js实现，避免外部依赖和废弃警告
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 4200;
const HOST = process.env.HOST || '0.0.0.0';

// MIME类型映射
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

// 获取MIME类型
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'text/plain';
}

// 日志记录
function logRequest(req, res, statusCode, contentLength) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.url;
  const userAgent = req.headers['user-agent'] || '-';

  console.log(`[${timestamp}] "${method} ${path}" ${statusCode} ${contentLength} "${userAgent}"`);
}

// 解析POST请求体
function parsePostBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// 发送文件响应
async function sendFile(res, filePath) {
  try {
    const stat = await fs.promises.stat(filePath);
    const mimeType = getMimeType(filePath);

    // 设置headers
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // 缓存控制
    if (path.extname(filePath) === '.html') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }

    // 读取并发送文件
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    return { status: 200, size: stat.size };
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendJSON(res, 404, { error: 'Not Found', message: '文件不存在' });
      return { status: 404, size: 0 };
    } else {
      sendJSON(res, 500, { error: 'Internal Server Error', message: '服务器内部错误' });
      return { status: 500, size: 0 };
    }
  }
}

// 发送JSON响应
function sendJSON(res, statusCode, data) {
  const json = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block'
  });
  res.end(json);
}

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  let result = { status: 200, size: 0 };

  try {
    // CORS预检请求
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
        'Content-Length': '0'
      });
      res.end();
      result.status = 200;
      result.size = 0;
    }
    // 健康检查端点
    else if (pathname === '/health') {
      sendJSON(res, 200, {
        status: 'ok',
        service: 'fund-monitor-frontend',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0',
        nodeVersion: process.version,
        platform: process.platform
      });
      result.status = 200;
      result.size = JSON.stringify({
        status: 'ok', service: 'fund-monitor-frontend', timestamp: new Date().toISOString(),
        uptime: process.uptime(), memory: process.memoryUsage(), version: '1.0.0',
        nodeVersion: process.version, platform: process.platform
      }).length;
    }
    // 主页路由
    else if (pathname === '/') {
      const indexPath = path.join(__dirname, 'src', 'index-temp.html');
      if (fs.existsSync(indexPath)) {
        result = await sendFile(res, indexPath);
      } else {
        const html = `
          <!DOCTYPE html>
          <html lang="zh-CN">
          <head><title>基金监控系统 - 开发环境</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; margin: 0;">
            <h1>🚀 基金监控系统</h1>
            <h2>开发环境</h2>
            <p>服务正在运行...</p>
            <p><a href="/health" style="color: #4CAF50;">健康检查</a></p>
            <p><a href="/src/" style="color: #4CAF50;">静态文件</a></p>
          </body>
          </html>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
        result.status = 200;
        result.size = html.length;
      }
    }
    // API路由
    else if (pathname.startsWith('/api/')) {
      sendJSON(res, 501, {
        error: 'API Not Implemented',
        message: 'API代理尚未完全实现',
        path: pathname,
        method: req.method,
        backendUrl: `http://backend:80${pathname}`
      });
      result.status = 501;
      result.size = JSON.stringify({
        error: 'API Not Implemented', message: 'API代理尚未完全实现',
        path: pathname, method: req.method, backendUrl: `http://backend:80${pathname}`
      }).length;
    }
    // 静态文件服务
    else {
      // 解码URL路径
      const decodedPath = decodeURIComponent(pathname);
      let filePath = path.join(__dirname, decodedPath);

      // 安全检查：确保路径在项目目录内
      if (!filePath.startsWith(__dirname)) {
        sendJSON(res, 403, { error: 'Forbidden', message: '访问被拒绝' });
        result.status = 403;
        result.size = 0;
      }
      // 如果是目录，尝试查找index.html
      else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        const indexPath = path.join(filePath, 'index.html');
        if (fs.existsSync(indexPath)) {
          result = await sendFile(res, indexPath);
        } else {
          result = await sendFile(res, filePath);
        }
      }
      // 尝试发送文件
      else {
        result = await sendFile(res, filePath);
      }
    }
  } catch (error) {
    console.error('请求处理错误:', error);
    sendJSON(res, 500, {
      error: 'Internal Server Error',
      message: '服务器内部错误',
      timestamp: new Date().toISOString()
    });
    result.status = 500;
    result.size = 0;
  }

  // 记录请求日志
  logRequest(req, res, result.status, result.size);
});

// 错误处理
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${PORT} 已被占用`);
  } else {
    console.error('❌ 服务器错误:', err);
  }
  process.exit(1);
});

// 启动服务器
server.listen(PORT, HOST, () => {
  console.log(`🚀 基金监控系统前端服务器已启动`);
  console.log(`📍 服务地址: http://${HOST}:${PORT}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString()}`);
  console.log(`📊 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Node.js版本: ${process.version}`);
  console.log(`💾 内存使用: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  console.log('');
  console.log('📋 可用端点:');
  console.log(`   主页: http://${HOST}:${PORT}/`);
  console.log(`   健康检查: http://${HOST}:${PORT}/health`);
  console.log(`   静态文件: http://${HOST}:${PORT}/src/`);
  console.log(`   API代理: http://${HOST}:${PORT}/api/`);
  console.log('');
  console.log('✨ 服务器正在运行中...');
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('🛑 收到SIGTERM信号，正在优雅关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已安全关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 收到SIGINT信号，正在优雅关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已安全关闭');
    process.exit(0);
  });
});

// 未捕获异常处理
process.on('uncaughtException', (err) => {
  console.error('💥 未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

module.exports = server;