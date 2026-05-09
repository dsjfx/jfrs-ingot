import path from 'path';
import dotenvFlow from 'dotenv-flow';
function init() {
  dotenvFlow.config({
    path: path.join(__dirname, '../'),
    silent: false, // 文件不存在时输出警告
  });
}

export default init;
