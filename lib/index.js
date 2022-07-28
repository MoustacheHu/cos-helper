const fs = require('fs');
const glob = require('glob');
const inquirer = require('inquirer');
const async = require('async');
const Cos = require('cos-nodejs-sdk-v5');
const tencentCloud = require('tencentcloud-sdk-nodejs');
const exec = require('child_process').execSync;
const { TEMP_DIR, gulpTask } = require('./optimistic');

const cdnPaths = []; // 上传成功后返回的文件地址
const defaultOptions = {
  secretId: '',
  secretKey: '',
  cdnSecretId: '',
  cdnSecretKey: '',
  bucket: '',
  region: '',
  directoryPath: 'unnamed-static-resource',
  maxRetryTimes: 3,
  cdnDomain: ''
};

/**
 * 用户输入 y/n,Y/N
 * @param message
 * @returns {Promise<boolean>}
 */
const inquirerYesOrNo = async (message) => {
  const inputResult = await inquirer.prompt({
    message: `${message || ''}（y/n，Y/N）：`,
    name: 'value'
  });
  return inputResult.value === 'y' || inputResult.value === 'Y';
};

/**
 * 读取 TEMP_DIR 文件下的所有文件
 * @param globPath
 * @returns {string[]}
 */
const readFilesPath = (globPath) => {
  const paths = glob.sync(globPath);
  return paths.filter(path => fs.lstatSync(path).isFile());
};

/**
 * 判断此次上传文件是否为空
 * @param globFiles
 * @returns {boolean}
 */
const isNoFiles = (globFiles) => {
  let result = true;
  for (let i = 0; i < globFiles.length; i += 1) {
    const filesPath = readFilesPath(globFiles[i]);
    if (filesPath && filesPath.length) {
      result = false;
      break;
    }
  }

  return result;
};

/**
 * 文件上传前判断是否符合上传条件
 * @param options
 * @returns {Promise<boolean>}
 */
const uploadValid = async (options) => {
  // 当存在需要上传的文件时需要用户二次确认
  let result = await inquirerYesOrNo('接下来将上传文件，是否继续');

  if (result && options && !options.directoryPath) { // 以上条件都通过后，若未传 directoryPath，则需要提醒用户
    result = await inquirerYesOrNo('未定义“directoryPath“字段，默认会将文件上传至“unnamed-static-resource”目录下，是否继续');
  }

  return result;
};

/**
 * 替换文件路径中的临时目录，获取上传需要的真实路径
 * @param options
 * @param path
 * @returns {*}
 */
const getRealPath = (options, path) => {
  return path.replace(`${TEMP_DIR}/`, '');
};

/**
 * 上传文件至腾讯云cos服务
 * @param data.filesPath 文件路径列表
 * @param data.options 配置项
 * @param data.retryTimes 当前重传次数
 * @param data
 * @param callback
 */
const uploadFiles = (data, callback) => {
  const { filesPath, options, retryTimes } = data;
  const {
    secretId,
    secretKey,
    bucket,
    region,
    directoryPath,
    maxRetryTimes,
    cdnDomain
  } = options;

  // 实例化 COS 对象
  const cos = new Cos({
    SecretId: secretId,
    SecretKey: secretKey,
  });

  const failedFiles = []; // 上传失败的文件

  async.eachLimit(filesPath, 5, (filePath, cb) => {
    const realPath = getRealPath(options, filePath);
    console.log(`正在上传${realPath}...`);
    cos.putObject({
      Bucket: bucket, /* 必须 */
      Region: region, /* 存储桶所在地域，必须字段 */
      Key: `${directoryPath}/${realPath}`, /* 必须 */
      Body: fs.createReadStream(filePath), // 上传文件对象
      ContentLength: fs.statSync(filePath).size,
    }, (err) => {
      if (err) {
        console.error('文件上传失败：', err);
        failedFiles.push(filePath);
      } else {
        cdnPaths.push(`${cdnDomain}/${directoryPath}/${realPath}`);
      }
      cb(null); // cb的第一个参数需要传null或者不传才能保证进入下一批次
    });
  }, () => {
    if (failedFiles.length > 0 && retryTimes < maxRetryTimes) {
      console.log(`开始重新上传失败文件，重试第${retryTimes + 1}次...`.yellow);
      uploadFiles({
        filesPath: failedFiles,
        options,
        retryTimes: retryTimes + 1
      }, callback);
    } else {
      callback(failedFiles);
    }
  });
};

/**
 * 刷新 cdn 缓存
 * @param options
 */
const refreshCdn = (options) => {
  const CdnClient = tencentCloud.cdn.v20180606.Client;
  const client = new CdnClient({
    credential: {
      secretId: options.cdnSecretId,
      secretKey: options.cdnSecretKey,
    },
    profile: {
      httpProfile: {
        endpoint: 'cdn.tencentcloudapi.com',
      },
    },
  });
  client.PurgeUrlsCache({
    Urls: cdnPaths
  }, (error) => {
    if (error) {
      console.log('刷新cdn请求发送失败：', error);
    } else {
      console.log('刷新cdn请求发送成功'.green);
    }
  });
};

/**
 * 将默认配置项和传入的配置项合并
 * @param options
 * @returns {{bucket: string, cdnRefresh: boolean, cdnDomain: string, secretKey: string, directoryPath: string, cdnSecretKey: string, secretId: string, region: string, cdnSecretId: string, maxRetryTimes: number}}
 */
const mergeOptions = (options) => {
  const newOptions = {...defaultOptions};
  Object.keys(options).forEach((key) => {
    if (options[key]) {
      newOptions[key] = options[key];
    }
  });
  return newOptions;
};

/**
 * 将上传到 cos 的文件列表写到 txt 中便于手动刷新 cdn 缓存
 */
const writeCdnPaths = () => {
  fs.writeFile('cdnPaths.txt', cdnPaths.join('\r\n'), () => {});
};

/**
 * 删除清空及临时文件夹
 */
const rmTempDir = () => {
  exec(`rimraf -rf ${TEMP_DIR}`);
};

module.exports = async (options) => {
  const newOptions = mergeOptions(options);

  if (isNoFiles(newOptions.globFiles)) {
    console.log('所有目录和文件都不存在'.red);
    return;
  }

  gulpTask(newOptions, async () => {
    const paths = readFilesPath(`${TEMP_DIR}/**`); // 读取所有文件路径
    const isValid = await uploadValid(newOptions); // 上传文件前进行用户确认
    if (!isValid) { // 只有当条件未满足时结束上传
      return;
    }

    uploadFiles({
      filesPath: paths,
      options: newOptions,
      retryTimes: 0
    }, (failedFiles) => {
      const failedNum = failedFiles.length;
      if (failedNum) {
        console.log('上传结果 => '.rainbow, `成功${paths.length - failedNum}个，`.green, `失败${failedNum}个`.red);
        console.log('失败文件如下：'.red);
        paths.forEach((file) => {
          console.log(file.red);
        });
      } else {
        console.log('上传结果 => '.rainbow, `成功${paths.length}个，失败${failedNum}个`.green);
      }

      // 当且仅当配置 cdn 域名的情况下才会有 cdn 相关的操作
      if (newOptions.cdnDomain) {
        if (paths.length - failedNum) {
          console.log('所有上传文件的cdn地址如下：', cdnPaths);
        }

        if (newOptions.cdnPathTxt) {
          writeCdnPaths();
        }

        if (newOptions.cdnRefresh) {
          refreshCdn(newOptions); // 上传文件后刷新 cdn 缓存
        }

        rmTempDir(); // 删除临时文件
      }
    });
  });
};
