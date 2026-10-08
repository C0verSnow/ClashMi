const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');

const source = fs.readFileSync('raw.js', 'utf8');
function apply(config) {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  // main 会原地更新配置；每次用独立输入，避免修改上次输出这个比较基准。
  return JSON.parse(JSON.stringify(context.main(JSON.parse(JSON.stringify(config)))));
}
function proxy(name, shortId) {
  return { name, type: 'vless', 'reality-opts': { 'short-id': shortId } };
}

test('过滤内核无法解析的 short-id，包括末尾换行', () => {
  const invalid = ['a', 'abc', '001122334455667788', 'gg', 'ab\n', 'ab\r',
    'ab\r\n', 'ab ', ' ab', '0x12', 'ＡＢ', 12, null, true, [], {}];
  const input = { proxies: invalid.map((id, i) => proxy('bad-' + i, id)) };
  assert.deepEqual(apply(input).proxies.map(p => p.name), ['Tailscale']);
});

test('保留合法 ID、前导零、大小写、空值和缺省字段，不擅自改服务端 ID', () => {
  const valid = ['', '00', 'aB', '0011223344556677', undefined];
  const proxies = valid.map((id, i) => proxy('good-' + i, id));
  proxies.push({ name: 'ordinary', type: 'ss' });
  const original = JSON.parse(JSON.stringify(proxies));
  assert.deepEqual(apply({ proxies }).proxies.slice(0, -1), original);
});

test('删除组里的坏节点，保留其他成员，单一来源空组回退直连', () => {
  const output = apply({
    proxies: [proxy('bad', 'ab\n'), proxy('good', '00')],
    'proxy-groups': [
      { name: 'mixed', type: 'select', proxies: ['bad', 'good', 'DIRECT'] },
      { name: 'empty', type: 'select', proxies: ['bad'] },
      { name: 'untouched', type: 'select', proxies: ['good'] }
    ]
  });
  assert.deepEqual(output['proxy-groups'].map(g => g.proxies),
    [['good', 'DIRECT'], ['DIRECT'], ['good']]);
});

test('provider 和 include-all 组保留原节点来源，不额外插入直连', () => {
  const sources = [{ use: ['airport'] }, { 'include-all': true },
    { 'include-all-proxies': true }, { 'include-all-providers': true }];
  const output = apply({
    proxies: [proxy('bad', 'zz')],
    'proxy-groups': sources.map((s, i) => ({ name: 'g' + i, proxies: ['bad'], ...s }))
  });
  output['proxy-groups'].forEach((g, i) => {
    assert.deepEqual(g.proxies, []);
    Object.keys(sources[i]).forEach(key => assert.deepEqual(g[key], sources[i][key]));
  });
});

test('坏节点与合法节点同名时，保留合法引用', () => {
  const output = apply({
    proxies: [proxy('same', 'gg'), proxy('same', '00')],
    'proxy-groups': [{ name: 'select', proxies: ['same'] }]
  });
  assert.deepEqual(output['proxy-groups'][0].proxies, ['same']);
  assert.equal(output.proxies[0]['reality-opts']['short-id'], '00');
});

test('重复加载不重复加节点和规则，机场规则顺序不变', () => {
  const originalRules = ['DOMAIN,example.com,DIRECT', 'MATCH,DIRECT'];
  const config = { proxies: [proxy('good', '00')], rules: originalRules.slice() };
  const once = apply(config);
  const twice = apply(once);
  assert.deepEqual(twice, once);
  assert.equal(twice.proxies.filter(p => p.name === 'Tailscale').length, 1);
  assert.deepEqual(twice.rules.slice(2), originalRules);
  assert.deepEqual(twice.rules.slice(0, 2), [
    'IP-CIDR,100.64.0.0/10,Tailscale,no-resolve',
    'IP-CIDR6,fd7a:115c:a1e0::/48,Tailscale,no-resolve'
  ]);
});

test('缺省配置可加载，保留无关配置', () => {
  const output = apply({ dns: { enable: true }, mode: 'rule' });
  assert.deepEqual(output.dns, { enable: true });
  assert.equal(output.mode, 'rule');
  assert.equal(output.proxies.length, 1);
  assert.equal(output.rules.length, 2);
});

test('文档中可复制的脚本与 raw.js 完全一致', () => {
  const markdown = fs.readFileSync('raw.md', 'utf8');
  const code = markdown.match(/```javascript\n([\s\S]*?)\n```/);
  assert.ok(code);
  assert.equal(code[1].trim(), source.trim());
});
