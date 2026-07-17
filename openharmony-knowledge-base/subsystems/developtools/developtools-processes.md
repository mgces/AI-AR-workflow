# developtools：developtools 运行进程

| 进程 | init | SA | 部件 | 启动模式 | uid | SELinux | 说明 |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| `hdc_credential` | 1 | 0 | 1 | condition | hdc | u:r:hdc_credential:s0 | [查看](processes/hdc_credential/developtools-runtime.md) |
| `hdcd` | 2 | 0 | 1 | condition | root,shell | u:r:hdcd:s0,u:r:su:s0 | [查看](processes/hdcd/developtools-runtime.md) |
| `hiprofiler_daemon` | 1 | 0 | 1 | condition | hiprofiler | u:r:native_daemon:s0 | [查看](processes/hiprofiler_daemon/developtools-runtime.md) |
| `hiprofiler_plugins` | 1 | 0 | 1 | condition | hiprofiler | u:r:hiprofiler_plugins:s0 | [查看](processes/hiprofiler_plugins/developtools-runtime.md) |
| `hiprofilerd` | 1 | 0 | 1 | condition | hiprofiler | u:r:hiprofilerd:s0 | [查看](processes/hiprofilerd/developtools-runtime.md) |
| `memory_collector` | 1 | 1 | 1 | condition | hiprofiler | u:r:native_daemon:s0 | [查看](processes/memory_collector/developtools-runtime.md) |
