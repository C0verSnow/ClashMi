# Clash Mi 修复脚本

复制下面代码块中的完整 JavaScript，替换原脚本后重新加载配置。

脚本会过滤 `config.proxies` 中 REALITY short-id 格式错误（包括末尾换行）的节点；只有显式节点来源的策略组因此变空时会回退到 DIRECT（直连），有 provider 或 include-all 来源的组保留原来源。Tailscale 的 `auth-key` 当前为占位符，使用时请替换为你的有效密钥。provider 内容和直接引用坏节点的规则需另行修正，详见 [README](README.md)。

```javascript
function main(config) {
  // REALITY short-id 必须是至多 16 位、偶数长度的十六进制字符串。
  // 不猜测或改写服务端 ID；过滤格式错误的订阅节点，避免整个配置启动失败。
  var inputProxies = config.proxies || [];
  var validProxies = [];
  var removedNames = [];
  var keptNames = [];

  for (var p = 0; p < inputProxies.length; p++) {
    var proxy = inputProxies[p];
    var reality = proxy["reality-opts"];
    var shortId = reality && reality["short-id"];
    // 缺省字段使用内核默认值；显式数值不能转成字符串，以免丢失前导零。
    // 不用 $ 判断结尾：JavaScript 的 $ 会放过末尾换行，内核却会拒绝。
    var invalid = reality && shortId !== undefined &&
      (typeof shortId !== "string" || shortId.length > 16 ||
       shortId.length % 2 !== 0 || /[^0-9a-fA-F]/.test(shortId));

    if (invalid) {
      removedNames.push(proxy.name);
    } else {
      validProxies.push(proxy);
      keptNames.push(proxy.name);
    }
  }

  // 清理被过滤节点的显式引用；若该组因此变空，则回退到直连。
  var groups = config["proxy-groups"] || [];
  for (var g = 0; g < groups.length; g++) {
    var members = groups[g].proxies;
    if (!Array.isArray(members)) continue;
    var filtered = [];
    for (var m = 0; m < members.length; m++) {
      if (removedNames.indexOf(members[m]) === -1 || keptNames.indexOf(members[m]) !== -1) {
        filtered.push(members[m]);
      }
    }
    if (filtered.length !== members.length) {
      // 仍有 provider 或 include-all 来源的组不强行添加 DIRECT。
      var hasOtherSources = (Array.isArray(groups[g].use) && groups[g].use.length > 0) ||
        groups[g]["include-all"] === true || groups[g]["include-all-proxies"] === true ||
        groups[g]["include-all-providers"] === true;
      groups[g].proxies = filtered.length || hasOtherSources ? filtered : ["DIRECT"];
    }
  }

  var name = "Tailscale";

  var tailscale = {
    name: name,
    type: "tailscale",
    hostname: "clash-mi-device",
    "auth-key": "tskey-auth-kxxx",
    "state-dir": "./tailscale",
    ephemeral: false,
    udp: true,
    "accept-routes": true
  };

  // 保留机场节点；重复执行时更新同名 Tailscale 节点
  var proxies = validProxies;
  var found = false;

  for (var i = 0; i < proxies.length; i++) {
    if (proxies[i].name === name) {
      proxies[i] = tailscale;
      found = true;
      break;
    }
  }

  if (!found) {
    proxies.push(tailscale);
  }

  config.proxies = proxies;

  // Tailscale 规则优先，其余继续使用机场原规则
  var addedRules = [
    "IP-CIDR,100.64.0.0/10,Tailscale,no-resolve",
    "IP-CIDR6,fd7a:115c:a1e0::/48,Tailscale,no-resolve"

    // 如果需要访问子网路由器后面的局域网：
    // ,"IP-CIDR,192.168.50.0/24,Tailscale,no-resolve"
  ];

  var originalRules = config.rules || [];
  var remainingRules = [];

  for (var j = 0; j < originalRules.length; j++) {
    if (addedRules.indexOf(originalRules[j]) === -1) {
      remainingRules.push(originalRules[j]);
    }
  }

  config.rules = addedRules.concat(remainingRules);

  return config;
}
```
