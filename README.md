# ClashMi 配置脚本

用于处理 issue #1 截图中的 `invalid REALITY short ID`，同时保留订阅节点和原规则，并加入 Tailscale 节点及规则。

## 怎么使用

1. 打开 [raw.md](raw.md)，复制代码块里的完整 JavaScript；也可以直接复制 [raw.js](raw.js) 的全部内容。
2. 在 Clash Mi 当前订阅的脚本配置中替换旧脚本并保存。不要把 Markdown 标题和代码块标记一起粘进去。
3. 把脚本里的 `tskey-auth-kxxx` 换成你自己的 Tailscale auth-key。不要把真实密钥上传到仓库。
4. 重新加载订阅配置，再启动连接。这个脚本需要在内核读取节点前执行。

## 修复了什么

REALITY 的 `short-id` 应为不超过 16 个字符、长度为偶数的十六进制字符串。空字符串和缺省字段按内核默认行为保留；例如 `"00ab"` 合法，`"abc"`、`"zz"` 和末尾有换行的 `"ab\n"` 无效。数字类型不转成字符串，以免丢失前导零。

原来的 JavaScript 正则以 `$` 结尾，会放过末尾换行；现在明确检查长度和每个字符。校验依据：[Mihomo REALITY 解析代码](https://github.com/MetaCubeX/mihomo/blob/Meta/adapter/outbound/reality.go)。

- 过滤配置 `proxies` 中 short-id 无效的节点，不猜测或改写服务端 ID。被过滤的节点暂时不能使用，应让订阅提供者修正数据。
- 删除策略组 `proxies` 中对这些节点的引用。只有显式节点来源的组因此变空时，回退到 `DIRECT`（直连）；原本还有 `use` 或 `include-all` 来源的组保留这些来源。
- 保留合法节点和其余规则顺序；重复执行不会重复添加 Tailscale 节点或两条 Tailscale 规则。

## 还报错时怎么看

先确认保存的是新脚本，并且重新加载了配置。如果错误仍指向 REALITY short-id，检查坏节点是否来自 `proxy-providers`：本脚本只处理传给 `main(config)` 的 `config.proxies`，无法修改稍后由内核下载的 provider 内容，需要订阅提供者修复。

如果原规则直接引用被过滤的节点，或其他节点通过 `dialer-proxy` 引用它，也要改成仍存在的节点或策略组。脚本目前只自动清理策略组的显式成员，不擅自改这些路由。

这个修复解决截图中的配置解析错误，不能保证所有订阅数据、REALITY 服务端参数或 Tailscale 登录信息都正确。CI 不会登录 Tailscale，也不能代替 Android 真机连接验证。

## 远端验证

[Script regression](../../actions/workflows/main.yml) 在 feature 分支推送和 PR 时运行。使用 Node.js 22 检查非法 ID、合法 ID、策略组清理、重复加载和文档脚本一致性；再下载官方预编译 Mihomo v1.19.32，用 `-t` 复现坏配置的 REALITY 报错，并检查脚本输出的完整配置可以通过。

所有执行验证均放在 GitHub Actions，不进行本地编译、构建或测试。任务过程见 [tasklist.md](tasklist.md)。
