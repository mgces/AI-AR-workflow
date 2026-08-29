# 子系统导航

`openharmony-knowledge-base/subsystems/` 只保留 `README.md` 导航节点。每个节点记录：

- 节点类型和名称；
- subsystem → component/process → capability → feature 层级；
- 父子导航；
- 在当前 `$OHOS_ROOT` 中定位真实代码仓的命令。

节点不保存当前文件、接口、target、依赖、产品配置或运行行为。

新增导航节点后运行：

```bash
python3 openharmony-knowledge-base/tools/rebuild_navigation.py
python3 openharmony-knowledge-base/tools/rebuild_navigation.py --check
```
