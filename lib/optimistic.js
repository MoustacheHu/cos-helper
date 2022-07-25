const gulp = require('gulp');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const imagemin = require('gulp-imagemin');

const TEMP_DIR = 'temp-dir'; // 临时文件的目录

/**
 * 将所有文件都拷贝一份放置 COPY_DIR 目录下，这里不仅仅是拷贝，还将所有需要上传的文件/目录整合成上传后的目录结构
 * @param globFiles
 */
const copyFiles = globFiles => () => {
  return gulp.src(globFiles, { allowEmpty: true })
    .pipe(gulp.dest(TEMP_DIR));
};

/**
 * js polyfill
 * @returns {*}
 */
const polyfill = () => {
  console.log('开始转译js文件，耗时较久，请稍等...'.yellow);
  return gulp.src(`${TEMP_DIR}/**/*.js`)
    .pipe(babel({
      presets: [
        [
          '@babel/preset-env',
          {
            modules: false,
            targets: {
              browsers: ["> 1%", "last 2 versions", "not ie <= 8"]
            }
          }
        ]
      ]
    }))
    .pipe(gulp.dest(TEMP_DIR)).on('end', () => {
      console.log('js转译完成'.green);
    });
};

/**
 * js compress
 * @returns {*}
 */
const jsUglify = () => {
  console.log('开始压缩js文件，耗时较久，请稍等...'.yellow);
  return gulp.src(`${TEMP_DIR}/**/*.js`)
    .pipe(uglify())
    .pipe(gulp.dest(TEMP_DIR)).on('end', () => {
      console.log('js压缩完成'.green);
    });
};

/**
 * image compress
 */
const imgMin = () => {
  console.log('开始压缩图片（只支持jpeg,png,svg,gif），耗时较久，请稍等...'.yellow);
  return gulp.src(`${TEMP_DIR}/**/*.{jpeg,png,svg,gif}`)
    .pipe(imagemin())
    .pipe(gulp.dest(TEMP_DIR)).on('end', () => {
      console.log('图片压缩完成'.green);
    });
};

/**
 * 文件优化（js转译，文件压缩）
 * @param options
 * @param callback
 */
const gulpTask = (options, callback) => {
  const {
    globFiles,
    jsPolyfill,
    compress,
    jsCompress,
    imgCompress
  } = options;
  const task = [];

  if (jsPolyfill) {
    task.push(polyfill);
  }

  if (compress || jsCompress) {
    task.push(jsUglify);
  }

  if (compress || imgCompress) {
    task.push(imgMin);
  }

  gulp.series(
    copyFiles(globFiles),
    ...task,
    callback
  )();
}

module.exports = {
  TEMP_DIR,
  gulpTask
};
