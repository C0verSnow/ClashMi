# 本文档为4象限的任务清单，全文书写大白话

## 想做：
- 完成 issue #1：让脚本过滤无效 REALITY short-id 后，配置可以继续加载。
- 在 feature 分支改动，更新说明，跑远端 CI，通过后提 PR 并关闭 issue。

## 做完：
- 已把 ClashMi 仓库下载到本地，创建 feature/fix-reality-short-id 分支。
- 已阅读 issue 和报错截图，确认提示为 invalid REALITY short ID。
- 已发现现有脚本已有部分过滤逻辑，远端 CI 文件目前为空。
- 已核对内核源码，修复原正则放过末尾换行的情况。
- 已保留策略组的 provider 和 include-all 来源，避免清理坏节点时额外加入直连。
- 已补脚本回归测试、官方预编译内核的报错复现与配置检查，以及使用说明。
- 已做代码阅读和差异检查，没有在本地执行脚本测试或编译。
- 已推送 feature 分支并提交 PR #2。
- 第一轮远端 CI 通过 7 项脚本检查，重复加载检查因测试基准被原地修改而失败；已改为独立输入后再次提交。
- 第二轮远端 push 和 PR CI 全部通过：8 项脚本检查全通过；4 类坏 short-id 都复现内核报错，修复后和重复加载后都通过官方预编译内核的配置检查。
- CI 记录：https://github.com/C0verSnow/ClashMi/actions/runs/37719095845
- 已更新 PR #2 的验证结果：https://github.com/C0verSnow/ClashMi/pull/2
- 按 issue 要求，已关闭 issue #1；PR 保持打开，等待审阅和合并。

## 没做：
- 按仓库约定，不进行本地编译、构建或运行测试；验证交给远端 CI。
- 尚未在手机上实际加载配置。

## 在做：
- 无。修复工作已完成，PR 等待审阅和合并；最终任务记录提交也由远端 CI 检查。
