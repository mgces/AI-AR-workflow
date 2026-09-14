# SSH Workspace Gateway foundation

当前实现对应 T03.A：定义并校验云端与 SSH 端之间的 Authority envelope。每条消息必须绑定 tenant、workspace、cloud run、authority run、revision、phase epoch 和 connector connection epoch；副作用消息必须带 operation id。旧 revision、旧 phase、旧连接世代、跨租户和未知字段都会 fail closed。

此包现在只做结构校验和测试，`signature.value` 仍是待接入设备/Gateway 公钥验签的 detached signature 字段。它不会启动 SSH、执行命令、获得发布凭据或生成 gate/PASS；T03.B 以后才接入真实 RPC、runtime authority 和持久 operation。

```bash
npm ci --ignore-scripts
npm test
npm run lint
npm run typecheck
```
