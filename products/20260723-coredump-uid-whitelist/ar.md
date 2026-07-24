# AR: CheckCoredumpUID 改用 fault_coredump.json 白名单

## 原始需求
在 base/hiviewdfx/faultloggerd 下，`CheckCoredumpUID` 的 `coredumpUids`
不适用固定的方式，改成从 `fault_coredump.json` 文件里增加 whitelist 白名单的方式。

## 现状(初探)
- `services/coredump/coredump_manager_service.cpp:81` 的
  `CoredumpRequestValidator::CheckCoredumpUID(uint32_t callerUid)` 内
  硬编码 `std::vector<int> coredumpUids = {0, 1202, 7005};`，用 `std::find` 匹配。
- 该函数在 `coredump_manager_service.cpp:134` 被调用(`return CheckCoredumpUID(creds.uid);`)。
- 已存在配置文件 `services/config/fault_coredump.json`(待确认其现有结构与上板安装方式)。

## 目标
去掉硬编码 UID 列表，改为从 `fault_coredump.json` 读取 whitelist 白名单 UID，
未命中白名单则不允许 coredump。白名单需可在不改代码的情况下通过配置文件扩展。
