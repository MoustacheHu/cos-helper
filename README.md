## Usage
#### 1.安装 npm 包
"yarn add cos-helper -S" or "npm install cos-helper -S"

#### 2.使用
简单使用
```
cos-helper test/** --secretId [secretId] --secretKey [secretKey] --bucket [bucket] --region [region] --cdnDomain [cdnDomain]
```

| 参数 | 类型 | 是否必传 | 备注 |
| --- | --- | --- | --- |
| files | string（以空格隔开） | 是 | 文件或目录，需要遵循glob规范 |
| directoryPath | string | 否 | 上传到 cos 的目录 |
| jsPolyfill | boolean | 否 | 是否转译 js |
| compress | boolean | 否 | 是否压缩文件（包括 js 和图片）|
| jsCompress | boolean | 否 | 是否压缩 js |
| imgCompress | boolean | 否 | 是否压缩图片（仅支持png/jpeg/svg/gif）|
| cdnRefresh | boolean | 否 | 是否刷新 cdn 缓存 |
| cdnPathTxt | boolean  | 否 | 是否下载上传到 cos 的所有文件路径列表 |
| cdnDomain | string  | 是 | cdn 域名 |
| secretId | string | 是 | cos 服务秘钥字段 |
| secretKey | string | 是 | cos 服务秘钥字段 |
| bucket | string | 是 | cos 存储桶名称 |
| region | string | 是 | cos 可用地域 |
| cdnSecretId | string | 否 | cdn 服务秘钥字段，在使用 cdnRefresh 时必传 |
| cdnSecretKey | string | 否 | cdn 服务秘钥字段，在使用 cdnRefresh 时必传 |
